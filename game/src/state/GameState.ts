/**
 * Single source of truth for Chapter 1 progress. Plain data so it can be
 * snapshotted for checkpoints and persisted to localStorage.
 */
export type Stage =
  | 'intro' // bedroom, heard the scream
  | 'find_number' // mom hurt; find dad's number in mom's room
  | 'clean' // sweep shards + trash
  | 'wash' // wash the dishes
  | 'eggs' // goose minigame in the garden
  | 'store_eggs' // bring eggs to the kitchen
  | 'doors' // close doors, ride to Bà 8
  | 'ba8' // at Bà 8's shop
  | 'park' // festival + ô ăn quan
  | 'return' // back home, parents return
  | 'tidy' // stack stools
  | 'cook' // cooking minigame
  | 'done';

export type EndingId = 'good' | 'hospital' | 'goose' | 'crash' | 'robbed' | 'slipper';

export interface Resume {
  scene: string;
  data?: Record<string, unknown>;
}

export interface SaveData {
  stage: Stage;
  money: number;
  hp: number;
  energy: number;
  eggs: number;
  grain: boolean;
  flags: Record<string, boolean | number | string>;
  inv: string[];
  resume: Resume;
}

const SAVE_KEY = 'haohn.save.v1';
const ENDINGS_KEY = 'haohn.endings.v1';
const SETTINGS_KEY = 'haohn.settings.v1';

export interface Settings {
  music: number;
  sfx: number;
  textSpeed: number; // chars per second
}

function fresh(): SaveData {
  return {
    stage: 'intro',
    money: 50_000,
    hp: 5,
    energy: 100,
    eggs: 0,
    grain: false,
    flags: {},
    inv: [],
    resume: { scene: 'World', data: { map: 'bedroom', spawn: 'bed' } },
  };
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

/** Set by main.ts so every save also reaches the cloud copy. */
let onPersist: () => void = () => {};
export function setPersistHook(fn: () => void) {
  onPersist = fn;
}

function writeJSON(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage unavailable: progress lives for this session only */
  }
  onPersist();
}

class GameStateImpl {
  d: SaveData = fresh();
  settings: Settings = readJSON<Settings>(SETTINGS_KEY, { music: 0.6, sfx: 0.8, textSpeed: 45 });
  private listeners = new Set<() => void>();

  get stage() {
    return this.d.stage;
  }
  set stage(s: Stage) {
    this.d.stage = s;
    this.emit();
  }

  newGame() {
    this.d = fresh();
    this.emit();
  }

  flag(name: string): boolean | number | string | undefined {
    return this.d.flags[name];
  }
  setFlag(name: string, v: boolean | number | string = true) {
    this.d.flags[name] = v;
    this.emit();
  }

  has(item: string) {
    return this.d.inv.includes(item);
  }
  give(item: string) {
    if (!this.has(item)) this.d.inv.push(item);
    this.emit();
  }
  take(item: string) {
    this.d.inv = this.d.inv.filter((i) => i !== item);
    this.emit();
  }

  addMoney(n: number) {
    this.d.money = Math.max(0, this.d.money + n);
    this.emit();
  }

  /** Snapshot progress; endings offer "retry from checkpoint" using this. */
  checkpoint(resume: Resume, slot = '') {
    this.d.resume = resume;
    writeJSON(SAVE_KEY + slot, this.d);
  }
  hasSave() {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch {
      return false;
    }
  }
  /** Restore a checkpoint. Named slots hold earlier save points (e.g. before leaving the house). */
  load(slot = ''): Resume {
    this.d = readJSON<SaveData>(SAVE_KEY + slot, readJSON<SaveData>(SAVE_KEY, fresh()));
    this.d.flags = { ...this.d.flags };
    this.d.inv = [...this.d.inv];
    this.emit();
    return this.d.resume;
  }

  unlockEnding(id: EndingId) {
    const got = this.endings();
    if (!got.includes(id)) writeJSON(ENDINGS_KEY, { list: [...got, id] });
  }
  endings(): EndingId[] {
    return readJSON<{ list: EndingId[] }>(ENDINGS_KEY, { list: [] }).list;
  }

  /** localStorage was replaced underneath us (cloud pull, logout): re-read it. */
  reloadFromStorage() {
    this.d = fresh();
    this.settings = readJSON<Settings>(SETTINGS_KEY, { music: 0.6, sfx: 0.8, textSpeed: 45 });
    this.emit();
  }

  saveSettings() {
    writeJSON(SETTINGS_KEY, this.settings);
    this.emit();
  }

  onChange(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emit() {
    this.listeners.forEach((fn) => fn());
  }
}

export const G = new GameStateImpl();
