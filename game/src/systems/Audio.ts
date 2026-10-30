import Phaser from 'phaser';
import { G } from '../state/GameState';
import type { MusicKey, SfxKey } from '../data/audioManifest';

/**
 * Music/SFX helpers on the game-wide sound manager so tracks survive scene
 * switches. Music crossfades; calling music() with the playing key is a no-op.
 */
let game: Phaser.Game;
let current: { key: MusicKey; snd: Phaser.Sound.BaseSound } | null = null;
let ambience: { key: MusicKey; snd: Phaser.Sound.BaseSound } | null = null;
const loops = new Map<string, Phaser.Sound.BaseSound>();

export function initAudio(g: Phaser.Game) {
  game = g;
  G.onChange(applyVolumes);
}

function vol(s: Phaser.Sound.BaseSound): number {
  return (s as Phaser.Sound.WebAudioSound).volume ?? 1;
}
function setVol(s: Phaser.Sound.BaseSound, v: number) {
  (s as Phaser.Sound.WebAudioSound).setVolume(v);
}

function fade(s: Phaser.Sound.BaseSound, to: number, ms: number, done?: () => void) {
  const sc = game.scene.getScenes(true)[0];
  if (!sc) {
    setVol(s, to);
    done?.();
    return;
  }
  sc.tweens.addCounter({
    from: vol(s),
    to,
    duration: ms,
    onUpdate: (t) => setVol(s, t.getValue() ?? to),
    onComplete: () => done?.(),
  });
}

export function sfx(key: SfxKey, opts: { volume?: number; rate?: number; detune?: number } = {}) {
  if (!game || G.settings.sfx <= 0) return;
  game.sound.play(key, {
    volume: (opts.volume ?? 1) * G.settings.sfx,
    rate: opts.rate ?? 1,
    detune: opts.detune ?? 0,
  });
}

/** Start a looping sfx (e.g. sizzle); returns a stop function. */
export function sfxLoop(key: SfxKey, volume = 1): () => void {
  if (!game) return () => {};
  loops.get(key)?.destroy();
  const s = game.sound.add(key, { loop: true, volume: volume * G.settings.sfx });
  s.play();
  loops.set(key, s);
  return () => {
    s.stop();
    s.destroy();
    loops.delete(key);
  };
}

export function music(key: MusicKey | null, opts: { fadeMs?: number; loop?: boolean; volume?: number } = {}) {
  if (!game) return;
  const ms = opts.fadeMs ?? 900;
  if (current && current.key === key) return;
  if (current) {
    const old = current.snd;
    fade(old, 0, ms, () => old.destroy());
    current = null;
  }
  if (!key) return;
  const snd = game.sound.add(key, { loop: opts.loop ?? true, volume: 0 });
  snd.play();
  current = { key, snd };
  fade(snd, (opts.volume ?? 0.7) * G.settings.music, ms);
}

export function ambient(key: MusicKey | null, volume = 0.5) {
  if (!game) return;
  if (ambience && ambience.key === key) return;
  if (ambience) {
    const old = ambience.snd;
    fade(old, 0, 800, () => old.destroy());
    ambience = null;
  }
  if (!key) return;
  const snd = game.sound.add(key, { loop: true, volume: 0 });
  snd.play();
  ambience = { key, snd };
  fade(snd, volume * G.settings.music, 1200);
}

function applyVolumes() {
  if (current) setVol(current.snd, 0.7 * G.settings.music);
  if (ambience) setVol(ambience.snd, 0.5 * G.settings.music);
}
