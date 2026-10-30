import { afterEach, describe, expect, it, vi } from 'vitest';
import { applySnapshot, clearLocal, CloudImpl, planSync, snapshot } from './Cloud';

/** Minimal in-memory Storage. */
function memStore(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return {
    get length() {
      return m.size;
    },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    dump: () => Object.fromEntries(m),
  };
}

const base = { user: 'teo', localOwner: '', localUpdated: 0, localEmpty: true, remoteUpdated: 0, remoteEmpty: true };

describe('planSync', () => {
  it('keeps a guest’s progress by uploading it into an empty account', () => {
    expect(planSync({ ...base, localEmpty: false, localUpdated: 5 })).toBe('push');
  });
  it('downloads the account save onto a fresh device', () => {
    expect(planSync({ ...base, remoteEmpty: false, remoteUpdated: 9 })).toBe('pull');
  });
  it('newest copy wins when both exist', () => {
    const both = { ...base, localEmpty: false, remoteEmpty: false };
    expect(planSync({ ...both, localUpdated: 10, remoteUpdated: 20 })).toBe('pull');
    expect(planSync({ ...both, localUpdated: 30, remoteUpdated: 20 })).toBe('push');
    expect(planSync({ ...both, localUpdated: 20, remoteUpdated: 20 })).toBe('none');
  });
  it('never merges another player’s local save into this account', () => {
    expect(planSync({ ...base, localOwner: 'ti', localEmpty: false, localUpdated: 99 })).toBe('replace');
    expect(planSync({ ...base, localOwner: 'TEO', localEmpty: false, localUpdated: 99 })).toBe('push');
  });
});

describe('snapshot / apply', () => {
  it('only carries game keys, not bookkeeping or other sites’ data', () => {
    const s = memStore({ 'haohn.save.v1': '{"a":1}', 'haohn.meta.v1': '{}', 'haohn.owner': 'x', other: 'y' });
    expect(snapshot(s)).toEqual({ 'haohn.save.v1': '{"a":1}' });
  });
  it('apply replaces old progress and stamps the time', () => {
    const s = memStore({ 'haohn.save.v1.doors': 'old', 'haohn.owner': 'teo', other: 'y' });
    applySnapshot(s, { 'haohn.save.v1': 'new' }, 42);
    expect(s.dump()).toEqual({ 'haohn.owner': 'teo', other: 'y', 'haohn.save.v1': 'new', 'haohn.meta.v1': '{"updatedAt":42}' });
  });
  it('clearLocal keeps the listed keys', () => {
    const s = memStore({ 'haohn.save.v1': 'a', 'haohn.settings.v1': 'b' });
    clearLocal(s, ['haohn.settings.v1']);
    expect(s.dump()).toEqual({ 'haohn.settings.v1': 'b' });
  });
});

describe('CloudImpl', () => {
  afterEach(() => vi.unstubAllGlobals());

  function fakeServer(remote: { data: Record<string, string> | null; updatedAt: number }) {
    const puts: unknown[] = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
      const path = url.replace('/api', '');
      const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });
      if (path === '/auth/login') return json(200, { user: { username: 'teo', displayName: 'Tèo' } });
      if (path === '/save' && init.method === 'GET') return json(200, remote);
      if (path === '/save' && init.method === 'PUT') {
        puts.push(JSON.parse(String(init.body)));
        return json(200, { ok: true });
      }
      if (path === '/auth/logout') return json(200, { ok: true });
      return json(401, { error: { message: 'no' } });
    });
    return puts;
  }

  it('signing in on a new device restores the account save', async () => {
    fakeServer({ data: { 'haohn.save.v1': '{"stage":"cook"}' }, updatedAt: 50 });
    const s = memStore();
    const c = new CloudImpl(s);
    const pulled = vi.fn();
    c.onPulled = pulled;
    await c.login('teo', 'secret12');
    expect(s.getItem('haohn.save.v1')).toBe('{"stage":"cook"}');
    expect(s.getItem('haohn.owner')).toBe('teo');
    expect(pulled).toHaveBeenCalled();
    expect(c.status).toBe('synced');
  });

  it('a guest who signs up keeps what they already played', async () => {
    const puts = fakeServer({ data: null, updatedAt: 0 });
    const s = memStore({ 'haohn.save.v1': '{"stage":"wash"}', 'haohn.meta.v1': '{"updatedAt":7}' });
    await new CloudImpl(s).login('teo', 'secret12');
    expect(puts).toEqual([{ data: { 'haohn.save.v1': '{"stage":"wash"}' }, updatedAt: 7 }]);
  });

  it('logout uploads, then clears progress but keeps device settings', async () => {
    const puts = fakeServer({ data: null, updatedAt: 0 });
    const s = memStore({ 'haohn.settings.v1': '{"music":0.2}' });
    const c = new CloudImpl(s);
    await c.login('teo', 'secret12');
    s.setItem('haohn.save.v1', '{"stage":"park"}');
    await c.logout();
    expect(puts.at(-1)).toMatchObject({ data: { 'haohn.save.v1': '{"stage":"park"}' } });
    expect(s.dump()).toEqual({ 'haohn.settings.v1': '{"music":0.2}' });
    expect(c.user).toBeNull();
  });

  it('stays usable offline', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('network');
    });
    const c = new CloudImpl(memStore());
    await c.init();
    expect(c.user).toBeNull();
    expect(c.status).toBe('offline');
  });
});
