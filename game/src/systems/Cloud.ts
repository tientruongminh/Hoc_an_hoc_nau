/**
 * Account + cloud save. The game keeps writing to localStorage as before;
 * this module mirrors every `haohn.*` key to the server for a signed-in
 * player, so they can come back on any device and pick up where they left off.
 *
 * Playing as a guest still works offline. If the API is unreachable we stay
 * silent and keep the local save.
 */

export interface CloudUser {
  username: string;
  displayName: string;
}

/** Everything the game persists, key → raw JSON string. */
export type Snapshot = Record<string, string>;

export type SyncStatus = 'guest' | 'syncing' | 'synced' | 'offline';

const PREFIX = 'haohn.';
const META_KEY = 'haohn.meta.v1'; // { updatedAt } of the local copy
const OWNER_KEY = 'haohn.owner'; // username the local copy belongs to, '' = guest
const KEEP_ON_LOGOUT = ['haohn.settings.v1']; // per-device, not personal progress
const PUSH_DELAY = 1500;

/** What to do when a player signs in, given both copies of the save. */
export type SyncPlan = 'pull' | 'push' | 'none' | 'replace';

export function planSync(o: {
  user: string;
  localOwner: string;
  localUpdated: number;
  localEmpty: boolean;
  remoteUpdated: number;
  remoteEmpty: boolean;
}): SyncPlan {
  // Someone else's progress is on this device: never mix it into this account.
  if (o.localOwner && o.localOwner.toLowerCase() !== o.user.toLowerCase()) return 'replace';
  if (o.remoteEmpty) return o.localEmpty ? 'none' : 'push';
  if (o.localEmpty) return 'pull';
  if (o.remoteUpdated > o.localUpdated) return 'pull';
  if (o.localUpdated > o.remoteUpdated) return 'push';
  return 'none';
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

export function snapshot(store: Store): Snapshot {
  const out: Snapshot = {};
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k && k.startsWith(PREFIX) && k !== META_KEY && k !== OWNER_KEY) out[k] = store.getItem(k) ?? '';
  }
  return out;
}

export function clearLocal(store: Store, keep: string[] = []) {
  const doomed: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k && k.startsWith(PREFIX) && !keep.includes(k)) doomed.push(k);
  }
  doomed.forEach((k) => store.removeItem(k));
}

export function applySnapshot(store: Store, snap: Snapshot, updatedAt: number) {
  clearLocal(store, [OWNER_KEY]);
  for (const [k, v] of Object.entries(snap)) if (k.startsWith(PREFIX)) store.setItem(k, v);
  store.setItem(META_KEY, JSON.stringify({ updatedAt }));
}

const hasProgress = (snap: Snapshot) => Object.keys(snap).some((k) => k.startsWith('haohn.save') || k.startsWith('haohn.endings'));

class CloudImpl {
  user: CloudUser | null = null;
  status: SyncStatus = 'guest';
  /** Resolves once the boot-time session check (and any pull) is done. */
  ready: Promise<void> = Promise.resolve();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();
  /** Called after a pull overwrote localStorage, so in-memory state can reload. */
  onPulled: () => void = () => {};

  constructor(
    private store: Store,
    private api = '/api',
  ) {}

  init() {
    this.ready = (async () => {
      const me = await this.call<{ user: CloudUser }>('GET', '/auth/me');
      if (me.ok) await this.adopt(me.body.user);
      else this.setStatus(me.status === 0 ? 'offline' : 'guest');
    })();
    if (typeof document !== 'undefined')
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') this.flush(true);
      });
    return this.ready;
  }

  /** GameState calls this on every write. Stamps the local copy and schedules an upload. */
  touched() {
    try {
      this.store.setItem(META_KEY, JSON.stringify({ updatedAt: Date.now() }));
    } catch {
      /* storage unavailable */
    }
    if (!this.user) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), PUSH_DELAY);
  }

  async register(username: string, password: string, displayName?: string) {
    const r = await this.call<{ user: CloudUser }>('POST', '/auth/register', { username, password, displayName });
    if (r.ok) await this.adopt(r.body.user);
    return r;
  }

  async login(username: string, password: string) {
    const r = await this.call<{ user: CloudUser }>('POST', '/auth/login', { username, password });
    if (r.ok) await this.adopt(r.body.user);
    return r;
  }

  /** Upload what's left, end the session, and leave the device clean for the next player. */
  async logout() {
    await this.flush();
    await this.call('POST', '/auth/logout');
    this.user = null;
    clearLocal(this.store, KEEP_ON_LOGOUT);
    this.onPulled();
    this.setStatus('guest');
  }

  async flush(keepalive = false) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.user) return;
    this.setStatus('syncing');
    const r = await this.call('PUT', '/save', { data: snapshot(this.store), updatedAt: this.localUpdated() }, keepalive);
    this.setStatus(r.ok ? 'synced' : 'offline');
  }

  onChange(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private async adopt(user: CloudUser) {
    this.user = user;
    this.setStatus('syncing');
    const remote = await this.call<{ data: Snapshot | null; updatedAt: number }>('GET', '/save');
    if (!remote.ok) return this.setStatus('offline');
    const local = snapshot(this.store);
    const plan = planSync({
      user: user.username,
      localOwner: this.store.getItem(OWNER_KEY) ?? '',
      localUpdated: this.localUpdated(),
      localEmpty: !hasProgress(local),
      remoteUpdated: remote.body.updatedAt,
      remoteEmpty: !remote.body.data || !hasProgress(remote.body.data),
    });
    if (plan === 'pull' || plan === 'replace') {
      if (remote.body.data) applySnapshot(this.store, remote.body.data, remote.body.updatedAt);
      else clearLocal(this.store, KEEP_ON_LOGOUT);
      this.onPulled();
    }
    this.store.setItem(OWNER_KEY, user.username);
    if (plan === 'push') await this.flush();
    else this.setStatus('synced');
  }

  private localUpdated(): number {
    try {
      return Number(JSON.parse(this.store.getItem(META_KEY) ?? '{}').updatedAt) || 0;
    } catch {
      return 0;
    }
  }

  private setStatus(s: SyncStatus) {
    this.status = s;
    this.listeners.forEach((fn) => fn());
  }

  private async call<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    keepalive = false,
  ): Promise<{ ok: true; status: number; body: T } | { ok: false; status: number; message: string }> {
    try {
      const res = await fetch(this.api + path, {
        method,
        credentials: 'same-origin',
        keepalive,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) return { ok: true, status: res.status, body: json as T };
      return { ok: false, status: res.status, message: json?.error?.message ?? 'Có lỗi, thử lại nhé.' };
    } catch {
      return { ok: false, status: 0, message: 'Không kết nối được máy chủ.' };
    }
  }
}

export { CloudImpl };
export const Cloud = new CloudImpl(globalThis.localStorage);
