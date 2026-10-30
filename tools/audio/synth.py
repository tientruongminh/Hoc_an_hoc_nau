#!/usr/bin/env python3
"""Procedural audio generator for "Học Ăn Học Nấu" (Chapter 1).

Every sound effect, music loop and ambience bed is synthesised from scratch
with numpy/scipy. All randomness is seeded, so the output is reproducible.

    python3 -I tools/audio/synth.py --out game/public/assets/audio

When `soundfile` is importable, music and ambience are written as OGG Vorbis.
Otherwise they fall back to mono 22.05 kHz WAV. The script rewrites
game/src/data/audioManifest.ts so the extensions always match the files.
"""
from __future__ import annotations

import argparse
import hashlib
import os
import sys
import wave

import numpy as np
from scipy import signal

try:  # optional OGG encoder
    import soundfile as sf
except Exception:  # pragma: no cover - fallback path
    sf = None

SR = 44100
TAU = 2 * np.pi


# ---------------------------------------------------------------- utilities

def rng_for(name: str) -> np.random.Generator:
    """Deterministic RNG per asset name (independent of generation order)."""
    seed = int(hashlib.sha1(name.encode()).hexdigest()[:8], 16)
    return np.random.default_rng(seed)


def ns(sec: float) -> int:
    return max(1, int(round(sec * SR)))


def tt(n: int) -> np.ndarray:
    return np.arange(n) / SR


def midi_hz(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def as_arr(x, n: int) -> np.ndarray:
    return np.full(n, float(x)) if np.ndim(x) == 0 else np.asarray(x, float)[:n]


def adsr(n: int, a=0.005, d=0.1, s=0.7, r=0.05) -> np.ndarray:
    T = n / SR
    a = min(a, T * 0.4)
    r = min(r, T * 0.5)
    d = min(d, max(T - a - r, 0.0))
    pts = [0.0, a, a + d, max(T - r, a + d), T]
    return np.interp(tt(n), pts, [0.0, 1.0, s, s, 0.0])


def exp_env(n: int, decay: float, attack=0.002) -> np.ndarray:
    t = tt(n)
    e = np.exp(-t / max(decay, 1e-4))
    if attack > 0:
        e *= np.clip(t / attack, 0, 1)
    return e


def fade(x: np.ndarray, fin=0.003, fout=0.01) -> np.ndarray:
    x = x.copy()
    a, b = min(ns(fin), len(x) // 2), min(ns(fout), len(x) // 2)
    if a:
        x[:a] *= np.linspace(0, 1, a)
    if b:
        x[-b:] *= np.linspace(1, 0, b)
    return x


def _norm_fc(fc):
    return np.clip(np.asarray(fc, float) / (SR / 2), 1e-4, 0.999)


def lp(x, fc, order=2):
    b, a = signal.butter(order, _norm_fc(fc), "low")
    return signal.lfilter(b, a, x)


def hp(x, fc, order=2):
    b, a = signal.butter(order, _norm_fc(fc), "high")
    return signal.lfilter(b, a, x)


def bp(x, lo, hi, order=2):
    b, a = signal.butter(order, [_norm_fc(lo), _norm_fc(hi)], "band")
    return signal.lfilter(b, a, x)


def reson(x, fc, q=8.0):
    b, a = signal.iirpeak(float(np.clip(fc, 30, SR * 0.45)), q, fs=SR)
    return signal.lfilter(b, a, x)


def sweep_bp(x, f0, f1, q=2.0, blocks=48):
    """Band-pass whose centre glides from f0 to f1 (block-wise, crossfaded)."""
    n = len(x)
    out = np.zeros(n)
    edges = np.linspace(0, n, blocks + 1).astype(int)
    win_len = edges[1] - edges[0]
    for i in range(blocks):
        fc = f0 * (f1 / f0) ** (i / max(blocks - 1, 1))
        lo, hi = fc / (1 + 1 / q), fc * (1 + 1 / q)
        s, e = max(edges[i] - win_len // 2, 0), min(edges[i + 1] + win_len // 2, n)
        seg = bp(x[s:e], lo, hi)
        w = np.hanning(e - s) if e - s > 2 else np.ones(e - s)
        out[s:e] += seg * w
    return out


def noise(n, rng):
    return rng.uniform(-1, 1, n)


def phase(freq, n):
    return np.cumsum(as_arr(freq, n)) / SR


def sine(freq, n, ph=0.0):
    return np.sin(TAU * (phase(freq, n) + ph))


def tri(freq, n):
    p = phase(freq, n) % 1.0
    return 4 * np.abs(p - 0.5) - 1


def _blep(t, dt):
    out = np.zeros_like(t)
    m = t < dt
    x = t[m] / dt[m]
    out[m] = x + x - x * x - 1
    m = t > 1 - dt
    x = (t[m] - 1) / dt[m]
    out[m] = x * x + x + x + 1
    return out


def pulse(freq, n, duty=0.5):
    """Band-limited (polyBLEP) pulse with optional PWM (duty array)."""
    f = as_arr(freq, n)
    dt = np.clip(f / SR, 1e-6, 0.5)
    p = np.cumsum(dt) % 1.0
    d = np.clip(as_arr(duty, n), 0.05, 0.95)
    y = np.where(p < d, 1.0, -1.0)
    y += _blep(p, dt)
    y -= _blep((p + 1 - d) % 1.0, dt)
    return y - (2 * d - 1)


def saw(freq, n):
    f = as_arr(freq, n)
    dt = np.clip(f / SR, 1e-6, 0.5)
    p = np.cumsum(dt) % 1.0
    return 2 * p - 1 - _blep(p, dt)


def bell(freq, n, decay=0.8, partials=((1, 1), (2.76, 0.5), (5.4, 0.25), (8.93, 0.12))):
    t = tt(n)
    y = np.zeros(n)
    for ratio, amp in partials:
        y += amp * np.sin(TAU * freq * ratio * t) * np.exp(-t * ratio ** 0.6 / decay)
    return y / sum(a for _, a in partials)


def place(dst, src, start, gain=1.0):
    s = int(start)
    if s >= len(dst):
        return
    e = min(len(dst), s + len(src))
    dst[s:e] += gain * src[: e - s]


def peak_norm(x, target=0.9):
    p = np.max(np.abs(x)) + 1e-12
    return x * (target / p)


def soft_limit(x, ceiling=0.97):
    """Transparent below ~0.6, smooth tanh knee above, never exceeds ceiling."""
    thr = 0.6 * ceiling
    y = x.copy()
    over = np.abs(x) > thr
    k = ceiling - thr
    y[over] = np.sign(x[over]) * (thr + k * np.tanh((np.abs(x[over]) - thr) / k))
    return y


# ------------------------------------------------------------ instruments

def inst_pulse(m, dur, vel, duty=0.3, pwm=0.12, vib=0.0, cutoff=3200, rel=0.08, a=0.006, s=0.65):
    n = ns(dur + rel)
    t = tt(n)
    f = midi_hz(m) * (1 + vib * 0.006 * np.sin(TAU * 5.5 * t) * np.clip((t - 0.15) / 0.2, 0, 1))
    d = duty + pwm * np.sin(TAU * 0.7 * t)
    y = lp(pulse(f, n, d), cutoff) * 0.5
    return y * adsr(n, a, 0.12, s, rel) * vel


def inst_tri(m, dur, vel, rel=0.06):
    n = ns(dur + rel)
    y = tri(midi_hz(m), n) + 0.15 * sine(midi_hz(m) * 2, n)
    return lp(y, 2500) * adsr(n, 0.004, 0.15, 0.8, rel) * vel * 0.8


def inst_bass(m, dur, vel, rel=0.05):
    """Round plucky bass: triangle + sub sine, gentle filter envelope."""
    n = ns(dur + rel)
    f = midi_hz(m)
    y = 0.7 * tri(f, n) + 0.5 * sine(f, n) + 0.12 * lp(pulse(f, n, 0.5), 900)
    return y * adsr(n, 0.004, 0.25, 0.55, rel) * vel * 0.8


def inst_tuba(m, dur, vel, rel=0.08):
    n = ns(dur + rel)
    t = tt(n)
    f = midi_hz(m) * (1 + 0.004 * np.sin(TAU * 5 * t))
    cutoff = 300 + 900 * np.exp(-t * 6)
    y = lp(saw(f, n), float(np.mean(cutoff)), 2) + 0.4 * sine(f, n)
    return y * adsr(n, 0.02, 0.2, 0.7, rel) * vel * 0.7


def inst_pad(m, dur, vel, rel=0.9, a=0.35):
    n = ns(dur + rel)
    t = tt(n)
    f = midi_hz(m)
    y = (sine(f * 0.997, n) + sine(f * 1.003, n) + 0.35 * sine(f * 2.001, n)
         + 0.12 * lp(saw(f * 1.0015, n), 1400))
    y *= 1 + 0.12 * np.sin(TAU * 0.25 * t)
    return y * adsr(n, a, 0.4, 0.8, rel) * vel * 0.32


def _ks_raw(freq, n, bright, decay, rng):
    N = max(2, int(SR / freq - 0.5))
    fa = SR / (N + 0.5)
    buf = noise(N, rng)
    if bright < 1:
        buf = (1 - (1 - bright)) * buf + (1 - bright) * np.convolve(buf, np.ones(4) / 4, "same")
    total = n + N + 2
    out = np.zeros(total)
    out[:N] = buf
    out[N] = decay * 0.5 * (out[0] + out[N - 1])
    i = N + 1
    while i < total:
        e = min(i + N, total)
        out[i:e] = decay * 0.5 * (out[i - N:e - N] + out[i - N - 1:e - N - 1])
        i = e
    return out, fa


def inst_pluck(m, dur, vel, bright=0.7, decay=0.9975, bend=None, vib=0.0, rel=0.25, seed=0):
    """Karplus-Strong string (đàn tranh). bend=(semitones, time) glides into the pitch."""
    n = ns(dur + rel)
    f = midi_hz(m)
    rng = np.random.default_rng(seed + int(m * 100))
    raw, fa = _ks_raw(f, int(n * 1.6) + 64, bright, decay, rng)
    t = tt(n)
    semis = np.zeros(n)
    if bend:
        amt, btime = bend
        semis += amt * np.clip(1 - t / max(btime, 1e-3), 0, 1) ** 2
    if vib:
        semis += vib * np.sin(TAU * 5.2 * t) * np.clip((t - 0.12) / 0.25, 0, 1)
    rate = (f * 2 ** (semis / 12)) / fa
    idx = np.cumsum(rate)
    idx = np.clip(idx, 0, len(raw) - 2)
    y = np.interp(idx, np.arange(len(raw)), raw)
    y = lp(y, 5500)
    env = np.ones(n)
    r = ns(rel)
    gate = max(n - r, 1)
    env[gate:] = np.linspace(1, 0, n - gate)
    return y * env * vel * 0.9


def inst_bau(m, dur, vel, slide=0.0, vib=0.35, rel=0.3):
    """Đàn bầu-style harmonic tone: near-sine, big expressive bends + vibrato."""
    n = ns(dur + rel)
    t = tt(n)
    semis = slide * np.clip(1 - t / 0.18, 0, 1) ** 1.5
    semis += vib * np.sin(TAU * 5.0 * t) * np.clip((t - 0.2) / 0.3, 0, 1)
    semis += -0.15 * np.clip((t - dur) / 0.2, 0, 1)  # droop on release
    f = midi_hz(m) * 2 ** (semis / 12)
    y = sine(f, n) + 0.22 * sine(f * 2, n) + 0.07 * sine(f * 3, n)
    click = bp(noise(n, np.random.default_rng(int(m))), 2000, 6000) * exp_env(n, 0.008) * 0.15
    env = exp_env(n, max(dur * 1.6, 0.4), attack=0.008) * adsr(n, 0.001, 0.0, 1.0, rel)
    return (y * env + click) * vel * 0.55


def inst_bellkey(m, dur, vel, rel=0.6):
    n = ns(dur + rel)
    return bell(midi_hz(m), n, decay=0.6 + dur * 0.3,
                partials=((1, 1), (2, 0.35), (3.01, 0.15), (4.2, 0.08))) * adsr(n, 0.002, 0.0, 1.0, 0.05) * vel * 0.6


def inst_trombone(m, dur, vel, bend_down=0.0, rel=0.12):
    n = ns(dur + rel)
    t = tt(n)
    semis = -bend_down * np.clip(t / max(dur, 0.01), 0, 1) ** 1.5
    semis += 0.25 * np.sin(TAU * 6.0 * t) * np.clip((t - 0.25) / 0.2, 0, 1)
    f = midi_hz(m) * 2 ** (semis / 12)
    y = saw(f, n)
    # "wah" mute: formant opens then closes
    y = reson(lp(y, 2200), 700, 3) * 0.6 + lp(y, 900) * 0.6
    return y * adsr(n, 0.04, 0.1, 0.8, rel) * vel * 0.55


INSTRUMENTS = {
    "pulse": inst_pulse, "tri": inst_tri, "bass": inst_bass, "tuba": inst_tuba,
    "pad": inst_pad, "pluck": inst_pluck, "bau": inst_bau, "bellkey": inst_bellkey,
    "trombone": inst_trombone,
}


# ------------------------------------------------------------------ drums

def dr_kick(vel=1.0, seed=0):
    n = ns(0.45)
    t = tt(n)
    f = 45 + 95 * np.exp(-t * 28)
    y = sine(f, n) * exp_env(n, 0.16, 0.001)
    y += 0.25 * hp(noise(n, np.random.default_rng(seed)), 3000) * exp_env(n, 0.004)
    return y * vel


def dr_snare(vel=1.0, seed=1):
    n = ns(0.3)
    nz = bp(noise(n, np.random.default_rng(seed)), 1200, 7500) * exp_env(n, 0.07)
    tone = sine(190 * (1 + 0.3 * np.exp(-tt(n) * 40)), n) * exp_env(n, 0.05)
    return (0.8 * nz + 0.5 * tone) * vel * 0.8


def dr_hat(vel=1.0, open_=False, seed=2):
    n = ns(0.3 if open_ else 0.07)
    y = hp(noise(n, np.random.default_rng(seed)), 7500, 3) * exp_env(n, 0.09 if open_ else 0.018)
    return y * vel * 0.45


def dr_shaker(vel=1.0, seed=3):
    n = ns(0.12)
    t = tt(n)
    env = np.interp(t, [0, 0.03, 0.12], [0, 1, 0])
    return bp(noise(n, np.random.default_rng(seed)), 4500, 11000) * env * vel * 0.35


def dr_clap(vel=1.0, seed=4):
    n = ns(0.3)
    rng = np.random.default_rng(seed)
    y = np.zeros(n)
    for k, off in enumerate((0.0, 0.011, 0.022)):
        burst = bp(noise(ns(0.2), rng), 900, 5000) * exp_env(ns(0.2), 0.012 if k < 2 else 0.08)
        place(y, burst, ns(off))
    return y * vel * 0.7


def dr_tom(vel=1.0, pitch=140, seed=5):
    """Trống cơm / trống đế style low tom."""
    n = ns(0.5)
    t = tt(n)
    f = pitch * (1 + 0.6 * np.exp(-t * 25))
    y = sine(f, n) * exp_env(n, 0.18) + 0.2 * lp(noise(n, np.random.default_rng(seed)), 800) * exp_env(n, 0.03)
    return y * vel * 0.9


def dr_block(vel=1.0, pitch=1050, seed=6):
    """Mõ (wood block)."""
    n = ns(0.15)
    y = sine(pitch, n) * exp_env(n, 0.03) + 0.6 * sine(pitch * 1.48, n) * exp_env(n, 0.015)
    y += 0.3 * bp(noise(n, np.random.default_rng(seed)), 2000, 6000) * exp_env(n, 0.003)
    return y * vel * 0.5


# Per-drum mix trims so percussion sits under the melody instead of pumping the mix.
DRUM_TRIM = {"kick": 0.55, "snare": 0.5, "clap": 0.5, "hat": 0.5, "ohat": 0.5, "shaker": 0.7,
             "tom": 0.65, "tomlo": 0.65, "block": 0.75, "blockhi": 0.75}

DRUMS = {
    "kick": dr_kick, "snare": dr_snare, "hat": dr_hat, "ohat": lambda vel=1.0: dr_hat(vel, True),
    "shaker": dr_shaker, "clap": dr_clap, "tom": dr_tom, "tomlo": lambda vel=1.0: dr_tom(vel, 95),
    "block": dr_block, "blockhi": lambda vel=1.0: dr_block(vel, 1500),
}


# ---------------------------------------------------------------- reverb

def make_ir(seconds=2.2, decay=0.55, damp=5000, seed=11, predelay=0.012, taps=()):
    rng = np.random.default_rng(seed)
    n = ns(seconds)
    t = tt(n)
    irs = []
    for ch in range(2):
        nz = noise(n, rng) * np.exp(-t / decay)
        # darker as the tail decays
        early = lp(nz, damp)
        late = lp(nz, damp * 0.35)
        mix = np.clip(t / seconds * 2.2, 0, 1)
        ir = early * (1 - mix) + late * mix
        ir = np.concatenate([np.zeros(ns(predelay)), ir])
        for (dt_, g) in taps:  # discrete echoes (ping-pong)
            pos = ns(dt_ * (1.0 if ch == 0 else 1.5))
            if pos < len(ir):
                ir[pos] += g
        irs.append(ir / np.sqrt(np.sum(ir ** 2) + 1e-9))
    return irs


# -------------------------------------------------------------- sequencer

class Song:
    """Beat-based stereo mixer with a reverb send and seamless loop wrap."""

    def __init__(self, bpm, bars, beats=4, tail=3.5, swing=0.0, name="song"):
        self.bpm, self.bars, self.beats = bpm, bars, beats
        self.spb = 60.0 / bpm
        self.length = bars * beats * self.spb
        self.tail = tail
        n = ns(self.length + tail)
        self.dry = np.zeros((2, n))
        self.send = np.zeros((2, n))
        self.swing = swing
        self.name = name
        self.cache: dict = {}

    def sec(self, beat):
        b = float(beat)
        frac = b % 1.0
        if self.swing and abs(frac - 0.5) < 1e-6:
            b += self.swing * 0.5
        return b * self.spb

    def _add(self, sig, start_sec, pan, gain, send):
        lg = np.cos((pan + 1) * np.pi / 4) * gain
        rg = np.sin((pan + 1) * np.pi / 4) * gain
        s = ns(start_sec) if start_sec > 0 else 0
        for ch, g in ((0, lg), (1, rg)):
            place(self.dry[ch], sig, s, g)
            if send:
                place(self.send[ch], sig, s, g * send)

    def note(self, inst, beat, length, midi, vel=0.8, pan=0.0, gain=1.0, send=0.25, **kw):
        key = (inst, round(length * self.spb, 4), round(midi, 3), round(vel, 3), tuple(sorted(kw.items())))
        sig = self.cache.get(key)
        if sig is None:
            sig = INSTRUMENTS[inst](midi, length * self.spb, vel, **kw)
            self.cache[key] = sig
        self._add(sig, self.sec(beat), pan, gain, send)

    def hit(self, drum, beat, vel=1.0, pan=0.0, gain=1.0, send=0.12):
        key = ("drum", drum, round(vel, 3))
        sig = self.cache.get(key)
        if sig is None:
            sig = DRUMS[drum](vel) * DRUM_TRIM[drum]
            self.cache[key] = sig
        self._add(sig, self.sec(beat), pan, gain, send)

    def pattern(self, drum, pat, bars, steps_per_beat=4, vel=0.9, pan=0.0, gain=1.0, send=0.1, accent="X"):
        """pat like 'x...x...x..xx...' (one bar). 'X' = accent, 'o' = ghost."""
        step = 1.0 / steps_per_beat
        for bar in bars:
            for i, c in enumerate(pat):
                if c in "xXo":
                    v = vel * (1.15 if c == accent else 0.45 if c == "o" else 1.0)
                    self.hit(drum, bar * self.beats + i * step, min(v, 1.0), pan, gain, send)

    def render(self, ir, loop=True, wet=0.35, master_lp=None, loudness=0.16):
        wetbus = np.stack([signal.fftconvolve(self.send[c], ir[c])[: self.dry.shape[1]] for c in range(2)])
        mix = self.dry + wet * wetbus
        if master_lp:
            mix = np.stack([lp(mix[c], master_lp, 1) for c in range(2)])
        L = ns(self.length)
        if loop:
            out = mix[:, :L].copy()
            tail = mix[:, L:]
            k = min(tail.shape[1], L)
            out[:, :k] += tail[:, :k]
        else:
            out = mix.copy()
            f = ns(1.2)
            out[:, -f:] *= np.linspace(1, 0, f) ** 2
        return master(out, loudness)


def master(x, loudness=0.16):
    """RMS-normalise then soft-limit; keeps every track at similar loudness."""
    x = x - np.mean(x, axis=-1, keepdims=True)
    rms = np.sqrt(np.mean(x ** 2)) + 1e-12
    x = x * (loudness / rms)
    return soft_limit(x, 0.96)


# ------------------------------------------------------------ music theory

BAC = [0, 2, 5, 7, 9]        # điệu Bắc: C D F G A  (bright, cheerful)
NAM = [0, 3, 5, 7, 10]       # điệu Nam: C Eb F G Bb (warm, nostalgic)
OAN = [0, 3, 5, 7, 8]        # Nam oán: C Eb F G Ab  (sad, tense)
MAJP = [0, 2, 4, 7, 9]       # major pentatonic (comic, bouncy)


def deg_midi(deg, root, scale):
    o, i = divmod(int(deg), len(scale))
    return root + 12 * o + scale[i]


def chord_degs(r):
    return (r, r + 2, r + 4)


def gen_phrase(rng, roots, rhythms, start=5, lo=2, hi=11, end_on_root=True):
    """Melody over len(roots) bars. Returns [(beat, len, deg)] relative to phrase start."""
    notes = []
    deg = start
    for bar, r in enumerate(roots):
        rhythm = rhythms[rng.integers(len(rhythms))]
        beat = 0.0
        for j, dur in enumerate(rhythm):
            if dur < 0:
                beat += -dur
                continue
            strong = abs(beat - round(beat)) < 1e-6 and int(round(beat)) % 2 == 0
            if strong:
                tones = [d for c in chord_degs(r) for d in (c, c + 5, c - 5, c + 10) if lo <= d <= hi]
                deg = min(tones, key=lambda d: abs(d - deg) + rng.random() * 1.5)
            else:
                deg += int(rng.choice([-2, -1, -1, 1, 1, 2, 0], p=[.1, .25, .2, .2, .15, .05, .05]))
            deg = int(np.clip(deg, lo, hi))
            last = bar == len(roots) - 1 and j == len(rhythm) - 1
            if last and end_on_root:
                deg = min([r + 5 * k for k in range(-1, 4) if lo <= r + 5 * k <= hi] or [deg],
                          key=lambda d: abs(d - deg))
            notes.append((bar * 4 + beat, dur, deg))
            beat += dur
    return notes


def vary(rng, phrase, rhythms, roots, from_bar):
    head = [n for n in phrase if n[0] < from_bar * 4]
    tail = gen_phrase(rng, roots[from_bar:], rhythms, start=head[-1][2] if head else 5)
    return head + [(b + from_bar * 4, d, g) for b, d, g in tail]


def lay_melody(song, inst, notes, bar0, root, scale, vel=0.75, legato=0.92, **kw):
    for b, d, g in notes:
        song.note(inst, bar0 * 4 + b, d * legato, deg_midi(g, root, scale), vel, **kw)


# ------------------------------------------------------------------ tracks

R_CALM = [[2, 2], [1, 1, 2], [1.5, 0.5, 2], [3, 1], [1, 1, 1, 1], [2, 1, 1]]
R_LIVE = [[1, 0.5, 0.5, 1, 1], [0.5, 0.5, 1, 2], [1.5, 0.5, 1, 1], [1, 1, 0.5, 0.5, 1], [0.5, 0.5, 0.5, 0.5, 2]]
R_FAST = [[0.5] * 8, [0.5, 0.5, 1, 0.5, 0.5, 1], [1, 0.5, 0.5, -0.5, 0.5, 1], [0.25, 0.25, 0.5, 1, 0.5, 0.5, 1]]


def form(rng, roots4, rhythms, sections, start=6, lo=3, hi=11):
    """A, A' (varied tail), B (higher) ... returns dict of section -> notes."""
    A = gen_phrase(rng, roots4["A"], rhythms, start, lo, hi)
    out = {"A": A, "A2": vary(rng, A, rhythms, roots4["A"], 2),
           "B": gen_phrase(rng, roots4["B"], rhythms, start + 2, lo + 1, hi + 2)}
    return [out[s] for s in sections]


def track_title():
    rng = rng_for("title")
    s = Song(84, 16, name="title")
    root = 57  # A, điệu Nam
    roots = {"A": [0, 3, 1, 0], "B": [3, 2, 4, 0]}
    phr = form(rng, roots, R_CALM, ["A", "A2", "B", "A"], start=7, lo=4, hi=11)
    prog = roots["A"] * 2 + roots["B"] + roots["A"]
    for bar, r in enumerate(prog):
        for c in chord_degs(r):
            s.note("pad", bar * 4, 4.0, deg_midi(c, root - 12, NAM), 0.5, pan=-0.2 + 0.2 * (c % 3), send=0.6)
        s.note("bass", bar * 4, 2.5, deg_midi(r, root - 24, NAM), 0.6, send=0.1)
        s.note("bass", bar * 4 + 3, 0.9, deg_midi(r + 2, root - 24, NAM), 0.45, send=0.1)
        # đàn tranh rolling arpeggio
        for i, c in enumerate([r, r + 2, r + 4, r + 5, r + 4, r + 2]):
            s.note("pluck", bar * 4 + i * 0.5 + 0.5, 1.2, deg_midi(c, root, NAM), 0.32 - 0.02 * i, pan=0.35, send=0.5,
                   bright=0.55, seed=bar)
        if bar >= 4:
            s.pattern("shaker", "..x...x...x...xx", [bar], vel=0.5, pan=0.4)
            s.hit("kick", bar * 4, 0.55)
    for k, notes in enumerate(phr):
        if k == 0:
            continue  # first phrase leaves room for the arpeggio intro
        lay_melody(s, "bau", notes, k * 4, root + 12, NAM, 0.65, legato=1.0, pan=-0.15, send=0.55, slide=-1.0)
    return s.render(make_ir(3.0, 0.9), wet=0.5, loudness=0.14)


def track_home_day():
    rng = rng_for("home_day")
    s = Song(96, 24, swing=0.12, name="home_day")
    root = 62  # D, điệu Bắc
    roots = {"A": [0, 2, 3, 0], "B": [3, 4, 2, 0]}
    phr = form(rng, roots, R_LIVE, ["A", "A2", "B", "A", "A2", "B"], start=6, lo=3, hi=11)
    prog = roots["A"] * 2 + roots["B"] + roots["A"] * 2 + roots["B"]
    for bar, r in enumerate(prog):
        b0 = bar * 4
        s.note("bass", b0, 0.9, deg_midi(r, root - 24, BAC), 0.7)
        s.note("bass", b0 + 1.5, 0.4, deg_midi(r + 2, root - 24, BAC), 0.5)
        s.note("bass", b0 + 2, 0.9, deg_midi(r + 5, root - 36, BAC) + 12, 0.6)
        s.note("bass", b0 + 3.5, 0.4, deg_midi(r + 4, root - 24, BAC), 0.5)
        for off in (1, 3):  # offbeat pluck stabs
            for c in chord_degs(r):
                s.note("pluck", b0 + off, 0.4, deg_midi(c, root - 12, BAC), 0.22, pan=-0.3, send=0.3, bright=0.6,
                       decay=0.993, seed=c)
        s.pattern("shaker", "x.x.x.x.x.x.x.x.", [bar], vel=0.35, pan=0.45, steps_per_beat=4)
        if bar % 4 == 3:
            s.pattern("block", "......x...x.x...", [bar], vel=0.6, pan=0.3)
        s.pattern("kick", "x.......x.......", [bar], vel=0.55)
        s.pattern("snare", "....o.......o...", [bar], vel=0.5)
    for k, notes in enumerate(phr):
        inst = "pluck" if k % 3 != 2 else "bellkey"
        lay_melody(s, inst, notes, k * 4, root, BAC, 0.6 if inst == "pluck" else 0.5, pan=0.1, send=0.35,
                   **({"bright": 0.8, "vib": 0.15} if inst == "pluck" else {}))
    return s.render(make_ir(1.8, 0.5), wet=0.3, loudness=0.15)


def track_tension():
    rng = rng_for("tension")
    s = Song(72, 12, name="tension")
    root = 57
    prog = [0, 0, 3, 2, 0, 0, 4, 3, 0, 1, 3, 2]
    for bar, r in enumerate(prog):
        b0 = bar * 4
        s.note("pad", b0, 4.0, deg_midi(r, root - 24, OAN), 0.5, send=0.7, rel=1.4)
        s.note("pad", b0, 4.0, deg_midi(r + 2, root - 12, OAN), 0.35, pan=0.3, send=0.7, rel=1.4)
        # heartbeat kick
        s.hit("kick", b0, 0.7)
        s.hit("kick", b0 + 0.35, 0.45)
        s.hit("kick", b0 + 2, 0.6)
        s.hit("kick", b0 + 2.35, 0.4)
        # tremolo pulse
        for i in range(8):
            s.note("pulse", b0 + i * 0.5, 0.2, deg_midi(r + 4, root, OAN), 0.12, pan=-0.4, send=0.4, duty=0.2,
                   cutoff=1600)
        if bar % 2 == 1:
            notes = gen_phrase(rng, [r], [[1.5, 0.5, 2], [3, 1]], start=7, lo=5, hi=10)
            lay_melody(s, "bau", notes, bar, root, OAN, 0.55, legato=1.0, send=0.6, slide=-1.5, vib=0.5)
    return s.render(make_ir(3.2, 1.1), wet=0.55, loudness=0.13)


def track_goose_chase():
    rng = rng_for("goose_chase")
    s = Song(152, 28, name="goose_chase")
    root = 60  # C, comedic major pentatonic
    roots = {"A": [0, 0, 3, 4], "B": [3, 3, 0, 4]}
    phr = form(rng, roots, R_FAST, ["A", "A2", "B", "A", "A2", "B", "A"], start=6, lo=3, hi=11)
    prog = (roots["A"] * 2 + roots["B"] + roots["A"] * 2 + roots["B"] + roots["A"])
    for bar, r in enumerate(prog):
        b0 = bar * 4
        # oom-pah tuba + offbeat stabs
        s.note("tuba", b0, 0.8, deg_midi(r, root - 24, MAJP), 0.8)
        s.note("tuba", b0 + 2, 0.8, deg_midi(r + 3, root - 24, MAJP) - 12 + (12 if r + 3 > 4 else 0), 0.7)
        for off in (1, 3):
            for c in chord_degs(r):
                s.note("pulse", b0 + off, 0.35, deg_midi(c, root - 12, MAJP), 0.18, pan=0.3, duty=0.25, cutoff=2400,
                       send=0.15)
        s.pattern("hat", "x.x.x.x.x.x.x.x.", [bar], vel=0.5, pan=-0.3)
        s.pattern("kick", "x.......x.......", [bar], vel=0.8)
        s.pattern("snare", "....x.......x..." if bar % 4 != 3 else "....x.......xxxx", [bar], vel=0.65)
        if bar % 4 == 3:
            s.hit("blockhi", b0 + 3.5, 0.8)
    for k, notes in enumerate(phr):
        lay_melody(s, "pulse", notes, k * 4, root + 12, MAJP, 0.55, legato=0.6, duty=0.35, pwm=0.1, cutoff=3800,
                   send=0.2, pan=-0.05)
        if k in (2, 5):
            lay_melody(s, "bellkey", notes, k * 4, root + 24, MAJP, 0.25, legato=0.5, send=0.3, pan=0.3)
    return s.render(make_ir(1.2, 0.3), wet=0.22, loudness=0.16)


def track_bike_ride():
    rng = rng_for("bike_ride")
    s = Song(128, 24, name="bike_ride")
    root = 64  # E, điệu Bắc
    roots = {"A": [0, 3, 2, 4], "B": [2, 3, 0, 4]}
    phr = form(rng, roots, R_LIVE, ["A", "A2", "B", "A", "B", "A2"], start=6, lo=3, hi=11)
    prog = roots["A"] * 2 + roots["B"] + roots["A"] + roots["B"] + roots["A"]
    for bar, r in enumerate(prog):
        b0 = bar * 4
        for i in range(8):
            d = r if i % 4 != 3 else r + 2
            s.note("bass", b0 + i * 0.5, 0.42, deg_midi(d, root - 24, BAC), 0.6 if i % 2 == 0 else 0.45)
        for i in range(8):
            c = chord_degs(r)[[0, 1, 2, 1, 0, 1, 2, 4 % 3][i]]
            s.note("pluck", b0 + i * 0.5, 0.45, deg_midi(c + 5, root - 12, BAC), 0.25, pan=0.35, send=0.25,
                   bright=0.75, decay=0.994)
        s.pattern("kick", "x.....x.x.......", [bar], vel=0.8)
        s.pattern("snare", "....x.......x...", [bar], vel=0.6)
        s.pattern("hat", "..x...x...x...x.", [bar], vel=0.45, pan=-0.35)
        s.pattern("shaker", "x.xxx.xxx.xxx.xx", [bar], vel=0.25, pan=0.5)
    for k, notes in enumerate(phr):
        lay_melody(s, "pulse", notes, k * 4, root + 12, BAC, 0.5, legato=0.8, duty=0.3, pwm=0.15, cutoff=3500,
                   vib=1.0, send=0.25)
        lay_melody(s, "pluck", notes, k * 4, root, BAC, 0.3, legato=0.8, pan=-0.3, send=0.3, bright=0.8)
    return s.render(make_ir(1.4, 0.35), wet=0.25, loudness=0.16)


def track_festival():
    rng = rng_for("festival")
    s = Song(112, 24, name="festival")
    root = 62  # D, điệu Bắc — lễ hội
    roots = {"A": [0, 0, 3, 2], "B": [3, 4, 2, 0]}
    phr = form(rng, roots, R_LIVE + R_CALM[:2], ["A", "A2", "B", "A", "A2", "B"], start=6, lo=3, hi=11)
    prog = roots["A"] * 2 + roots["B"] + roots["A"] * 2 + roots["B"]
    for bar, r in enumerate(prog):
        b0 = bar * 4
        s.note("pad", b0, 4, deg_midi(r, root - 12, BAC), 0.35, send=0.5)
        s.note("bass", b0, 1.5, deg_midi(r, root - 24, BAC), 0.6)
        s.note("bass", b0 + 2, 1.5, deg_midi(r + 3, root - 24, BAC), 0.55)
        # trống: tom groove + mõ
        s.pattern("tom", "x..x..x.x...x...", [bar], vel=0.75, pan=-0.1)
        s.pattern("tomlo", "x.......x..x....", [bar], vel=0.7, pan=0.1)
        s.pattern("block", "..x...x...x...x.", [bar], vel=0.55, pan=0.45)
        if bar % 2:
            s.pattern("blockhi", ".............xx.", [bar], vel=0.6, pan=0.5)
        s.pattern("shaker", "x.x.x.x.x.x.x.x.", [bar], vel=0.3, pan=-0.5)
    for k, notes in enumerate(phr):
        lay_melody(s, "pluck", notes, k * 4, root + 12, BAC, 0.65, legato=1.0, pan=-0.2, send=0.4, bright=0.8,
                   bend=(-0.8, 0.06), vib=0.25)
        if k % 3 == 2:
            lay_melody(s, "bau", notes, k * 4, root, BAC, 0.5, legato=1.0, pan=0.25, send=0.5, slide=1.0)
    return s.render(make_ir(2.0, 0.6), wet=0.35, loudness=0.155)


def track_oanquan():
    rng = rng_for("oanquan")
    s = Song(90, 16, swing=0.2, name="oanquan")
    root = 57  # A, điệu Nam (thinking, playful)
    roots = {"A": [0, 2, 3, 0], "B": [3, 1, 4, 0]}
    phr = form(rng, roots, [[1, -1, 1, 1], [0.5, 0.5, -1, 2], [1, 1, -0.5, 0.5, 1], [-1, 1, 1, 1]],
               ["A", "A2", "B", "A"], start=6, lo=3, hi=10)
    prog = roots["A"] * 2 + roots["B"] + roots["A"]
    for bar, r in enumerate(prog):
        b0 = bar * 4
        s.note("bass", b0, 0.6, deg_midi(r, root - 24, NAM), 0.6)
        s.note("bass", b0 + 1, 0.6, deg_midi(r + 2, root - 24, NAM), 0.45)
        s.note("bass", b0 + 2, 0.6, deg_midi(r + 4, root - 24, NAM), 0.5)
        s.note("bass", b0 + 3, 0.6, deg_midi(r + 2, root - 24, NAM), 0.45)
        s.pattern("block", "x...x...x...x...", [bar], vel=0.35, pan=0.4)
        s.pattern("blockhi", "......x.......x.", [bar], vel=0.3, pan=-0.4)
        for c in chord_degs(r):
            s.note("pad", b0, 4, deg_midi(c, root - 12, NAM), 0.25, send=0.6)
    for k, notes in enumerate(phr):
        lay_melody(s, "pluck", notes, k * 4, root + 12, NAM, 0.55, legato=0.5, send=0.35, bright=0.5, decay=0.99)
        lay_melody(s, "bellkey", notes, k * 4, root + 24, NAM, 0.15, legato=0.5, send=0.4, pan=0.3)
    return s.render(make_ir(2.0, 0.6), wet=0.35, loudness=0.14)


def track_cooking():
    rng = rng_for("cooking")
    s = Song(120, 24, swing=0.25, name="cooking")
    root = 65  # F major pentatonic, bouncy
    roots = {"A": [0, 3, 0, 4], "B": [3, 3, 2, 4]}
    phr = form(rng, roots, R_LIVE, ["A", "A2", "B", "A", "A2", "B"], start=6, lo=3, hi=11)
    prog = roots["A"] * 2 + roots["B"] + roots["A"] * 2 + roots["B"]
    for bar, r in enumerate(prog):
        b0 = bar * 4
        s.note("tuba", b0, 0.7, deg_midi(r, root - 24, MAJP), 0.7)
        s.note("tuba", b0 + 1.5, 0.4, deg_midi(r + 2, root - 24, MAJP), 0.55)
        s.note("tuba", b0 + 2, 0.7, deg_midi(r + 3, root - 24, MAJP), 0.65)
        s.note("tuba", b0 + 3.5, 0.4, deg_midi(r + 1, root - 24, MAJP), 0.55)
        for off in (0.5, 1.5, 2.5, 3.5):
            for c in chord_degs(r):
                s.note("pluck", b0 + off, 0.3, deg_midi(c, root - 12, MAJP), 0.18, pan=0.35, send=0.2,
                       bright=0.65, decay=0.99)
        s.pattern("kick", "x.......x.......", [bar], vel=0.7)
        s.pattern("clap", "....x.......x...", [bar], vel=0.55)
        s.pattern("hat", "x.x.x.x.x.x.x.x.", [bar], vel=0.35, pan=-0.35)
    for k, notes in enumerate(phr):
        lay_melody(s, "pulse", notes, k * 4, root + 12, MAJP, 0.5, legato=0.55, duty=0.4, pwm=0.08, cutoff=3000,
                   send=0.25)
        if k % 3 == 2:
            lay_melody(s, "bellkey", notes, k * 4, root + 24, MAJP, 0.3, legato=0.5, send=0.35, pan=-0.3)
    return s.render(make_ir(1.4, 0.4), wet=0.27, loudness=0.155)


def track_ending_good():
    s = Song(100, 8, name="ending_good", tail=4.0)
    root = 62
    line = [(0, 1, 5), (1, 1, 6), (2, 2, 7), (4, 1, 6), (5, 1, 7), (6, 2, 8), (8, 1, 7), (9, 1, 8), (10, 1, 9),
            (11, 1, 10), (12, 4, 10)]
    prog = [0, 3, 2, 4, 0]
    for i, r in enumerate(prog):
        for c in chord_degs(r):
            s.note("pad", i * 4 if i < 4 else 12, 4 if i < 4 else 10, deg_midi(c, root - 12, BAC), 0.5, send=0.6)
        s.note("bass", i * 4 if i < 4 else 12, 3.5 if i < 4 else 8, deg_midi(r, root - 24, BAC), 0.65)
    for b, d, g in line:
        s.note("pulse", b, d * 0.95, deg_midi(g, root, BAC), 0.55, duty=0.35, vib=1.0, cutoff=3600, send=0.4)
        s.note("pluck", b, d, deg_midi(g, root - 12, BAC), 0.4, pan=-0.3, send=0.4, bright=0.8)
    for i in range(16):  # rising arp into the final chord
        s.note("bellkey", 8 + i * 0.25, 0.3, deg_midi(5 + i % 8, root, BAC), 0.25, pan=0.35, send=0.5)
    for c in (10, 12, 14):
        s.note("bellkey", 12, 6, deg_midi(c, root, BAC), 0.4, send=0.7)
    s.hit("tom", 12, 0.9)
    s.hit("ohat", 12, 0.8)
    s.hit("kick", 12, 0.9)
    return s.render(make_ir(3.0, 0.9), loop=False, wet=0.45, loudness=0.15)


def track_ending_bad():
    s = Song(84, 7, name="ending_bad", tail=4.5)
    root = 55  # G — "wah wah wah waaah"
    for i, (m, d) in enumerate(((0, 1.0), (-1, 1.0), (-2, 1.0), (-3, 3.5))):
        s.note("trombone", i * 1.2, d, root + m, 0.8, bend_down=(0.8 if i == 3 else 0.25), send=0.3)
        s.note("tuba", i * 1.2, d, root - 12 + m, 0.5, send=0.2)
    # sad little đàn bầu reprise
    for b, d, g in [(9, 1, 7), (10, 1, 6), (11, 2, 5), (13, 1, 4), (14, 1, 3), (15, 4, 0)]:
        s.note("bau", b, d, deg_midi(g, root + 12, OAN), 0.6, slide=-1.2, vib=0.5, send=0.6)
    for c in chord_degs(0):
        s.note("pad", 15, 8, deg_midi(c, root - 12, OAN), 0.45, send=0.7)
    s.hit("tomlo", 3.6, 0.8)
    s.hit("block", 4.8, 0.6)
    return s.render(make_ir(3.0, 1.0), loop=False, wet=0.45, loudness=0.14)


# ---------------------------------------------------------------- ambience

def loop_wrap(x, L):
    out = x[..., :L].copy()
    tail = x[..., L:]
    k = min(tail.shape[-1], L)
    out[..., :k] += tail[..., :k]
    return out


def amb_summer():
    rng = rng_for("amb_summer")
    L = ns(30.0)
    n = L + ns(3.0)
    out = np.zeros((2, n))
    t = tt(n)
    # breeze: two slow LFO'd lowpassed noise beds (decorrelated)
    for ch in range(2):
        nz = lp(noise(n, rng), 700, 2)
        lfo = 0.55 + 0.45 * np.sin(TAU * (0.05 + 0.02 * ch) * t + ch)
        out[ch] += nz * lfo * 0.5
    # cicadas: buzzing narrowband noise with swelling choruses
    for k in range(5):
        fc = rng.uniform(4200, 6800)
        buzz = bp(noise(n, rng), fc * 0.92, fc * 1.08, 2)
        am = 0.5 + 0.5 * np.tanh(3 * np.sin(TAU * rng.uniform(55, 90) * t))  # rasp (soft-edged)
        start, length = rng.uniform(0, 24), rng.uniform(6, 14)
        swell = np.clip(np.sin(np.pi * np.clip((t - start) / length, 0, 1)), 0, 1) ** 1.5
        pan = rng.uniform(-0.8, 0.8)
        sig = buzz * (0.6 + 0.4 * am) * swell * 0.35
        out[0] += sig * np.cos((pan + 1) * np.pi / 4)
        out[1] += sig * np.sin((pan + 1) * np.pi / 4)
    # birds: short FM chirps in little phrases
    for k in range(26):
        st = rng.uniform(0, 30)
        base = rng.uniform(2200, 4200)
        pan = rng.uniform(-0.9, 0.9)
        for j in range(rng.integers(2, 6)):
            d = rng.uniform(0.05, 0.14)
            m = ns(d)
            tc = tt(m)
            f = base * (1 + rng.uniform(-0.3, 0.4) * tc / d) + 300 * np.sin(TAU * rng.uniform(25, 45) * tc)
            ch = sine(f, m) * np.sin(np.pi * tc / d) ** 2 * rng.uniform(0.15, 0.3)
            pos = ns(st + j * rng.uniform(0.09, 0.2))
            place(out[0], ch, pos, np.cos((pan + 1) * np.pi / 4))
            place(out[1], ch, pos, np.sin((pan + 1) * np.pi / 4))
    out = np.stack([lp(out[c], 9000) for c in range(2)])
    return master(loop_wrap(out, L), 0.1)


def amb_crowd():
    rng = rng_for("amb_crowd")
    L = ns(20.0)
    n = L + ns(2.5)
    out = np.zeros((2, n))
    vowels = [(730, 1090), (270, 2290), (300, 870), (530, 1840), (570, 840), (440, 1020)]
    for v in range(34):
        pan = rng.uniform(-0.9, 0.9)
        dist = rng.uniform(0.25, 1.0)
        pitch = rng.uniform(95, 260)
        tpos = rng.uniform(-1, 20)
        while tpos < 21:
            d = rng.uniform(0.08, 0.22)
            m = ns(d)
            tc = tt(m)
            f0 = pitch * (1 + rng.uniform(-0.12, 0.12) + 0.1 * tc / d * rng.choice([-1, 1]))
            src = lp(saw(f0, m), 3000) * 0.6 + 0.1 * noise(m, rng)
            f1, f2 = vowels[rng.integers(len(vowels))]
            syl = reson(src, f1, 5) + 0.6 * reson(src, f2, 6)
            syl *= np.sin(np.pi * tc / d) ** 1.5 * dist * 0.25
            if tpos >= 0:
                place(out[0], syl, ns(tpos), np.cos((pan + 1) * np.pi / 4))
                place(out[1], syl, ns(tpos), np.sin((pan + 1) * np.pi / 4))
            tpos += d + (rng.uniform(0.6, 2.5) if rng.random() < 0.18 else rng.uniform(0.0, 0.08))
    # occasional laugh bursts + distant festival drum
    for k in range(5):
        st = rng.uniform(0, 19)
        for j in range(4):
            m = ns(0.09)
            hh = bp(noise(m, rng), 900, 2600) * np.sin(np.pi * tt(m) / 0.09) * 0.3
            place(out[rng.integers(2)], hh, ns(st + j * 0.13))
    ir = make_ir(1.6, 0.45, damp=3500, seed=21)
    wet = np.stack([signal.fftconvolve(out[c], ir[c])[:n] for c in range(2)])
    out = lp(out, 4500, 1) * 0.7 + wet * 0.6
    return master(loop_wrap(out, L), 0.09)


# -------------------------------------------------------------------- SFX

def sfx_defs():
    """name -> function(rng) -> mono array. Loops are flagged in LOOP_SFX."""
    D = {}

    def reg(f):
        D[f.__name__[2:]] = f
        return f

    @reg
    def x_ui_click(r):
        n = ns(0.06)
        return sine(1800, n) * exp_env(n, 0.012) * 0.7 + hp(noise(n, r), 4000) * exp_env(n, 0.002) * 0.5

    @reg
    def x_ui_hover(r):
        n = ns(0.05)
        return sine(2400, n) * exp_env(n, 0.015, 0.003) * 0.35

    def two_tone(m1, m2, gap=0.075):
        n = ns(0.5)
        y = np.zeros(n)
        place(y, inst_bellkey(m1, 0.15, 0.8), 0)
        place(y, inst_bellkey(m2, 0.3, 0.9), ns(gap))
        return y

    @reg
    def x_ui_confirm(r):
        return two_tone(84, 91)

    @reg
    def x_ui_back(r):
        return two_tone(86, 79)

    def blip(f, wave_):
        n = ns(0.055)
        fr = f * (1 + 0.15 * np.exp(-tt(n) * 60))
        y = {"pulse": lambda: lp(pulse(fr, n, 0.4), 2600), "tri": lambda: tri(fr, n),
             "sine": lambda: sine(fr, n) + 0.3 * lp(pulse(fr, n, 0.25), 3500)}[wave_]()
        return y * adsr(n, 0.003, 0.02, 0.6, 0.02) * 0.6

    D["blip_a"] = lambda r: blip(520, "pulse")
    D["blip_b"] = lambda r: blip(330, "tri")
    D["blip_c"] = lambda r: blip(760, "sine")

    @reg
    def x_step_wood(r):
        n = ns(0.12)
        return (bp(noise(n, r), 150, 900) * exp_env(n, 0.025) + 0.6 * sine(110, n) * exp_env(n, 0.03)) * 0.8

    @reg
    def x_step_grass(r):
        n = ns(0.14)
        y = np.zeros(n)
        for k in range(6):
            m = ns(0.04)
            place(y, bp(noise(m, r), 2000, 7000) * exp_env(m, 0.01), ns(r.uniform(0, 0.08)), r.uniform(0.4, 1))
        return y * 0.6

    @reg
    def x_step_dirt(r):
        n = ns(0.1)
        return bp(noise(n, r), 300, 2500) * exp_env(n, 0.022) * 0.8 + sine(90, n) * exp_env(n, 0.02) * 0.3

    @reg
    def x_pickup(r):
        n = ns(0.35)
        y = np.zeros(n)
        for i, m in enumerate((84, 88, 91, 96)):
            place(y, inst_pulse(m, 0.05, 0.6, duty=0.3, pwm=0, cutoff=5000, rel=0.06), ns(i * 0.045))
        return y

    @reg
    def x_coin(r):
        n = ns(0.45)
        y = np.zeros(n)
        place(y, inst_pulse(83, 0.06, 0.6, duty=0.5, pwm=0, cutoff=6000, rel=0.02), 0)
        place(y, inst_pulse(88, 0.3, 0.6, duty=0.5, pwm=0, cutoff=6000, rel=0.08) * exp_env(ns(0.38), 0.15), ns(0.06))
        place(y, bell(midi_hz(100), ns(0.4), 0.2) * 0.3, ns(0.06))
        return y

    def chime_seq(midis, step, tail=0.8, vel=0.8):
        n = ns(step * len(midis) + tail)
        y = np.zeros(n)
        for i, m in enumerate(midis):
            place(y, bell(midi_hz(m), ns(tail + 0.2), 0.5 + 0.1 * i) * vel, ns(i * step))
        return y

    @reg
    def x_quest_new(r):
        return chime_seq([74, 79, 81], 0.11, 1.0)

    @reg
    def x_quest_done(r):
        y = chime_seq([74, 76, 79, 81, 86], 0.08, 1.2)
        n = len(y)
        for m in (74, 79, 83):
            place(y, bell(midi_hz(m), n - ns(0.4), 0.9) * 0.4, ns(0.4))
        return y

    @reg
    def x_door_open(r):
        n = ns(0.75)
        t = tt(n)
        f = 95 + 40 * np.sin(TAU * 1.3 * t) + 25 * r.standard_normal(n).cumsum() / np.sqrt(n) * 3
        creak = reson(saw(np.clip(f, 50, 220), n), 900, 4) + reson(saw(np.clip(f, 50, 220), n), 2100, 6) * 0.5
        env = np.interp(t, [0, 0.08, 0.5, 0.75], [0, 1, 0.7, 0])
        y = creak * env * 0.5
        latch = ns(0.04)
        place(y, bp(noise(latch, r), 2000, 8000) * exp_env(latch, 0.006), 0, 0.8)
        return y

    @reg
    def x_door_close(r):
        n = ns(0.4)
        y = sine(70 * (1 + np.exp(-tt(n) * 30)), n) * exp_env(n, 0.09) + lp(noise(n, r), 600) * exp_env(n, 0.05) * 0.8
        place(y, bp(noise(ns(0.05), r), 2500, 9000) * exp_env(ns(0.05), 0.008) * 0.6, ns(0.03))
        return y * 0.9

    @reg
    def x_lock_click(r):
        n = ns(0.25)
        y = np.zeros(n)
        for off in (0.0, 0.09):
            m = ns(0.12)
            place(y, bp(noise(m, r), 3000, 9000) * exp_env(m, 0.004) + bell(2600, m, 0.05) * 0.4, ns(off))
        return y

    @reg
    def x_phone_ring(r):
        n = ns(2.0)
        t = tt(n)
        f = np.where(np.sin(TAU * 16 * t) > 0, 1400.0, 1750.0)
        tone = 0.6 * sine(f, n) + 0.25 * lp(pulse(f, n, 0.5), 5000)
        gate = ((t % 1.0) < 0.75).astype(float)
        gate = lp(gate, 60, 1)
        return tone * gate * 0.55

    @reg
    def x_phone_pickup(r):
        n = ns(0.3)
        y = bp(noise(n, r), 1500, 6000) * exp_env(n, 0.005) * 0.7
        place(y, sine(950, ns(0.12)) * adsr(ns(0.12), 0.005, 0.02, 0.7, 0.03) * 0.4, ns(0.1))
        return y

    @reg
    def x_dish_crash(r):
        n = ns(1.4)
        y = lp(noise(n, r), 1200) * exp_env(n, 0.06) * 0.7
        y += sine(80 * (1 + np.exp(-tt(n) * 20)), n) * exp_env(n, 0.08) * 0.6
        for k in range(36):
            fq = r.uniform(2200, 9500)
            m = ns(r.uniform(0.15, 0.5))
            shard = bell(fq, m, r.uniform(0.04, 0.15), ((1, 1), (2.3, 0.5), (3.7, 0.3))) * r.uniform(0.2, 0.6)
            shard += hp(noise(m, r), 4000) * exp_env(m, 0.004) * 0.4
            place(y, shard, ns(r.exponential(0.12)))
        return y

    @reg
    def x_glass_clink(r):
        n = ns(0.6)
        y = bell(3100, n, 0.25, ((1, 1), (2.32, 0.5), (4.1, 0.3)))
        place(y, bell(3550, ns(0.5), 0.2, ((1, 1), (2.32, 0.4))) * 0.7, ns(0.09))
        return y * 0.7

    @reg
    def x_broom_sweep(r):
        n = ns(0.5)
        t = tt(n)
        y = sweep_bp(noise(n, r), 1200, 4500, q=1.5)
        return y * np.sin(np.pi * t / 0.5) ** 2 * 1.2

    @reg
    def x_trash_bag(r):
        n = ns(0.65)
        y = np.zeros(n)
        for k in range(160):
            m = ns(0.006)
            place(y, hp(noise(m, r), 3000) * r.uniform(0.2, 1), ns(r.beta(2, 2) * 0.62))
        return bp(y, 1500, 12000) * 1.2

    def splash(r, dur, bubbles):
        n = ns(dur)
        t = tt(n)
        nz = noise(n, r)
        y = sweep_bp(nz, 3500, 600, q=1.2) * exp_env(n, dur * 0.3, 0.004) * 1.4
        for k in range(bubbles):
            m = ns(r.uniform(0.03, 0.08))
            tc = tt(m)
            f = r.uniform(400, 900) * (1 + 2.5 * tc / tc[-1])
            place(y, sine(f, m) * np.sin(np.pi * tc / tc[-1]) * 0.25, ns(r.uniform(0.05, dur * 0.8)))
        return y

    @reg
    def x_water_splash(r):
        return splash(r, 0.85, 14)

    @reg
    def x_splash_puddle(r):
        return splash(r, 0.45, 6)

    @reg
    def x_scrub(r):
        n = ns(0.65)
        t = tt(n)
        stroke = np.clip(np.sin(TAU * 4.6 * t), 0, 1) ** 1.5
        return bp(noise(n, r), 1500, 4500) * stroke * 0.9

    def honk(dur, f0, r):
        n = ns(dur)
        t = tt(n)
        f = f0 * (1 + 0.18 * np.sin(np.pi * t / dur)) * (1 + 0.02 * np.sin(TAU * 38 * t))
        src = saw(f, n) * (0.75 + 0.25 * np.sin(TAU * 42 * t))
        y = reson(src, 1050, 5) + 0.8 * reson(src, 2500, 7) + 0.2 * lp(src, 700)
        return y * adsr(n, 0.015, 0.05, 0.85, 0.05)

    @reg
    def x_goose_honk(r):
        n = ns(0.75)
        y = np.zeros(n)
        place(y, honk(0.22, 310, r), 0)
        place(y, honk(0.3, 340, r), ns(0.3))
        return y

    @reg
    def x_goose_bite(r):
        n = ns(0.35)
        y = np.zeros(n)
        place(y, honk(0.14, 420, r) * 0.8, 0)
        snap = ns(0.05)
        place(y, (bp(noise(snap, r), 1500, 6000) + sine(900, snap)) * exp_env(snap, 0.008), ns(0.12), 1.2)
        return y

    @reg
    def x_hurt(r):
        n = ns(0.3)
        t = tt(n)
        f = 620 * np.exp(-t * 4) * (1 + 0.04 * np.sin(TAU * 30 * t))
        return lp(pulse(np.maximum(f, 150), n, 0.3), 2500) * adsr(n, 0.004, 0.05, 0.8, 0.08) * 0.6

    @reg
    def x_egg_collect(r):
        n = ns(0.3)
        t = tt(n)
        y = sine(800 * (1 + 0.8 * np.clip(t / 0.05, 0, 1)), n) * exp_env(n, 0.04) * 0.6
        place(y, bell(midi_hz(93), ns(0.25), 0.15) * 0.4, ns(0.04))
        return y

    @reg
    def x_bike_bell(r):
        n = ns(0.9)
        y = np.zeros(n)
        for off in (0.0, 0.22):
            m = ns(0.6)
            b = bell(2750, m, 0.35, ((1, 1), (1.5, 0.3), (2.2, 0.4), (3.3, 0.15)))
            b *= 1 + 0.3 * np.sin(TAU * 18 * tt(m))
            place(y, b, ns(off))
        return y * 0.8

    @reg
    def x_crash_thud(r):
        n = ns(0.9)
        y = sine(55 * (1 + 1.5 * np.exp(-tt(n) * 25)), n) * exp_env(n, 0.15) * 1.0
        y += lp(noise(n, r), 900) * exp_env(n, 0.07) * 0.8
        for k in range(8):
            place(y, bell(r.uniform(400, 1400), ns(0.4), 0.12, ((1, 1), (2.4, 0.6), (3.9, 0.4))) * 0.35,
                  ns(r.uniform(0.02, 0.25)))
        return y

    @reg
    def x_car_whoosh(r):
        n = ns(1.2)
        t = tt(n)
        y = sweep_bp(noise(n, r), 2200, 500, q=1.0)
        env = np.exp(-((t - 0.55) / 0.22) ** 2)
        hum = saw(np.interp(t, [0, 0.55, 1.2], [140, 120, 85]), n)
        return y * env * 1.3 + lp(hum, 400) * env * 0.25

    @reg
    def x_seed_drop(r):
        n = ns(0.12)
        return (bp(noise(n, r), 2000, 5000) * exp_env(n, 0.004) + bell(1650, n, 0.03) * 0.5) * 0.9

    @reg
    def x_capture(r):
        n = ns(0.6)
        y = np.zeros(n)
        for k in range(6):
            m = ns(0.08)
            place(y, bp(noise(m, r), 2000, 5000) * exp_env(m, 0.004) * 0.6, ns(r.uniform(0, 0.18)))
        place(y, chime_seq([81, 86], 0.06, 0.35, 0.6), ns(0.15))
        return y

    @reg
    def x_whisk(r):
        n = ns(0.8)
        y = np.zeros(n)
        for k in range(10):
            m = ns(0.06)
            tink = bell(r.uniform(3500, 4500), m, 0.02) * 0.5 + bp(noise(m, r), 3000, 8000) * exp_env(m, 0.01) * 0.6
            place(y, tink, ns(k * 0.075 + r.uniform(0, 0.01)), r.uniform(0.6, 1))
        return y

    @reg
    def x_chop(r):
        n = ns(0.15)
        return (bp(noise(n, r), 300, 1500) * exp_env(n, 0.02) + bp(noise(n, r), 3000, 8000) * exp_env(n, 0.003)) * 0.9

    @reg
    def x_stove_click(r):
        n = ns(0.95)
        y = np.zeros(n)
        for off in (0.0, 0.12, 0.24):
            m = ns(0.04)
            place(y, bp(noise(m, r), 2500, 9000) * exp_env(m, 0.003), ns(off), 0.9)
        t = tt(n)
        whoomph = lp(noise(n, r), 500) * np.interp(t, [0, 0.3, 0.45, 0.95], [0, 0, 1, 0.25])
        return y + whoomph * 1.4

    @reg
    def x_pan_place(r):
        n = ns(0.55)
        y = bell(310, n, 0.2, ((1, 1), (2.1, 0.7), (3.4, 0.5), (5.2, 0.3))) * 0.7
        y += lp(noise(n, r), 1500) * exp_env(n, 0.02) * 0.5
        return y

    @reg
    def x_pour(r):
        n = ns(1.0)
        t = tt(n)
        y = lp(noise(n, r), 1800) * np.interp(t, [0, 0.1, 0.8, 1.0], [0, 0.6, 0.5, 0]) * 0.5
        for k in range(28):
            m = ns(r.uniform(0.02, 0.05))
            tc = tt(m)
            f = r.uniform(500, 1300) * (1 + 1.5 * tc / tc[-1])
            place(y, sine(f, m) * np.sin(np.pi * tc / tc[-1]) * 0.3, ns(r.uniform(0.05, 0.85)))
        return y

    @reg
    def x_sizzle_loop(r):
        L = ns(2.0)
        n = L + ns(0.2)
        y = hp(noise(n, r), 3500) * 0.18 * (1 + 0.2 * np.sin(TAU * 0.5 * tt(n)))
        for k in range(420):
            m = ns(0.004)
            place(y, hp(noise(m, r), 2500) * r.uniform(0.2, 1), ns(r.uniform(0, 2.15)))
        for k in range(30):
            m = ns(0.02)
            place(y, bp(noise(m, r), 800, 3000) * exp_env(m, 0.005) * 0.6, ns(r.uniform(0, 2.1)))
        return loop_wrap(y, L)

    @reg
    def x_success_jingle(r):
        n = ns(1.6)
        y = np.zeros(n)
        run = [72, 74, 77, 79, 81, 84]
        for i, m in enumerate(run):
            place(y, inst_pluck(m, 0.2, 0.7, bright=0.85, seed=i), ns(i * 0.07))
        for m in (72, 77, 81, 84):
            place(y, inst_bellkey(m, 0.8, 0.5), ns(0.45))
            place(y, inst_pad(m - 12, 0.6, 0.6, rel=0.5, a=0.02), ns(0.45))
        return y

    @reg
    def x_fail_sting(r):
        n = ns(2.0)
        y = np.zeros(n)
        for i, (m, d) in enumerate(((60, 0.25), (59, 0.25), (58, 0.25), (57, 0.9))):
            place(y, inst_trombone(m, d, 0.8, bend_down=0.8 if i == 3 else 0.2), ns(i * 0.32))
        return y

    @reg
    def x_slipper_whoosh(r):
        n = ns(0.35)
        t = tt(n)
        return sweep_bp(noise(n, r), 600, 3500, q=2.0) * np.sin(np.pi * t / 0.35) ** 2 * 1.5

    @reg
    def x_thwack(r):
        n = ns(0.25)
        y = bp(noise(n, r), 800, 3500) * exp_env(n, 0.012) * 1.2 + sine(140, n) * exp_env(n, 0.05) * 0.6
        return y

    @reg
    def x_heartbeat(r):
        n = ns(1.0)
        y = np.zeros(n)
        for off, v in ((0.0, 1.0), (0.22, 0.7)):
            m = ns(0.2)
            place(y, sine(55 * (1 + 0.5 * np.exp(-tt(m) * 30)), m) * exp_env(m, 0.06) * v, ns(off))
        return lp(y, 300) * 1.4

    @reg
    def x_notebook_flip(r):
        n = ns(0.55)
        y = np.zeros(n)
        for k in range(4):
            m = ns(0.09)
            tc = tt(m)
            place(y, hp(noise(m, r), 2500) * np.sin(np.pi * tc / tc[-1]) ** 2 * r.uniform(0.5, 1), ns(k * 0.11))
        return y

    @reg
    def x_grain_scatter(r):
        n = ns(0.85)
        y = np.zeros(n)
        for k in range(110):
            m = ns(0.01)
            place(y, bp(noise(m, r), 2500, 9000) * exp_env(m, 0.002), ns(r.gamma(2, 0.12)), r.uniform(0.3, 1))
        return y

    @reg
    def x_cash_register(r):
        n = ns(1.0)
        y = np.zeros(n)
        for off in (0.0, 0.05):
            m = ns(0.1)
            place(y, bp(noise(m, r), 500, 4000) * exp_env(m, 0.015), ns(off), 0.8)
        place(y, lp(noise(ns(0.15), r), 900) * exp_env(ns(0.15), 0.03), ns(0.1), 0.6)
        place(y, bell(2350, ns(0.85), 0.45, ((1, 1), (2.0, 0.4), (2.76, 0.3), (5.4, 0.1))), ns(0.14), 0.8)
        return y

    return D


LOOP_SFX = {"sizzle_loop"}

MUSIC = {
    "title": track_title, "home_day": track_home_day, "tension": track_tension, "goose_chase": track_goose_chase,
    "bike_ride": track_bike_ride, "festival": track_festival, "oanquan": track_oanquan, "cooking": track_cooking,
    "ending_good": track_ending_good, "ending_bad": track_ending_bad, "amb_summer": amb_summer, "amb_crowd": amb_crowd,
}

SFX_ORDER = [
    "ui_click", "ui_confirm", "ui_back", "ui_hover", "blip_a", "blip_b", "blip_c", "step_wood", "step_grass",
    "step_dirt", "pickup", "coin", "quest_new", "quest_done", "door_open", "door_close", "lock_click", "phone_ring",
    "phone_pickup", "dish_crash", "glass_clink", "broom_sweep", "trash_bag", "water_splash", "scrub", "goose_honk",
    "goose_bite", "hurt", "egg_collect", "bike_bell", "splash_puddle", "crash_thud", "car_whoosh", "seed_drop",
    "capture", "whisk", "chop", "stove_click", "pan_place", "pour", "sizzle_loop", "success_jingle", "fail_sting",
    "slipper_whoosh", "thwack", "heartbeat", "notebook_flip", "grain_scatter", "cash_register",
]


# -------------------------------------------------------------------- I/O

def write_wav(path, data, sr=SR):
    data = np.atleast_2d(data)
    pcm = (np.clip(data, -1, 1) * 32767).astype("<i2").T.copy()
    with wave.open(path, "wb") as w:
        w.setnchannels(pcm.shape[1])
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def write_music(path_noext, stereo):
    if sf is not None:
        path = path_noext + ".ogg"
        frames = np.ascontiguousarray(stereo.T, dtype=np.float32)
        # libsndfile's Vorbis encoder can segfault on very large single writes; stream in blocks.
        with sf.SoundFile(path, "w", SR, 2, format="OGG", subtype="VORBIS") as f:
            for i in range(0, len(frames), 8192):
                f.write(frames[i:i + 8192])
        return path
    mono = stereo.mean(axis=0)
    mono = signal.resample_poly(mono, 1, 2)
    path = path_noext + ".wav"
    write_wav(path, mono, SR // 2)
    return path


def write_manifest(path, music_ext):
    sfx = ",\n  ".join(f"'{k}'" for k in SFX_ORDER)
    mus = ",\n  ".join(f"'{k}'" for k in MUSIC)
    src = f"""// AUTO-GENERATED by tools/audio/synth.py — do not edit by hand.
// Regenerate: python3 -I tools/audio/synth.py --out game/public/assets/audio

export const SFX_KEYS = [
  {sfx},
] as const;

export const MUSIC_KEYS = [
  {mus},
] as const;

export type SfxKey = (typeof SFX_KEYS)[number];
export type MusicKey = (typeof MUSIC_KEYS)[number];

/** Music + ambience loops (ending_good / ending_bad are one-shot stings). */
export const LOOPING_MUSIC: readonly MusicKey[] = MUSIC_KEYS.filter(
  (k) => k !== 'ending_good' && k !== 'ending_bad',
);

export const MUSIC_EXT = '{music_ext}';

export function audioPath(key: SfxKey | MusicKey): string {{
  return (SFX_KEYS as readonly string[]).includes(key)
    ? `assets/audio/sfx/${{key}}.wav`
    : `assets/audio/music/${{key}}.${{MUSIC_EXT}}`;
}}
"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(src)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    repo = os.path.abspath(os.path.join(here, "..", ".."))
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default=os.path.join(repo, "game/public/assets/audio"))
    ap.add_argument("--manifest", default=os.path.join(repo, "game/src/data/audioManifest.ts"))
    ap.add_argument("--only", nargs="*", help="render only these keys")
    args = ap.parse_args()

    sfx_dir = os.path.join(args.out, "sfx")
    mus_dir = os.path.join(args.out, "music")
    os.makedirs(sfx_dir, exist_ok=True)
    os.makedirs(mus_dir, exist_ok=True)

    defs = sfx_defs()
    assert set(defs) == set(SFX_ORDER), set(defs) ^ set(SFX_ORDER)
    report = []
    for key in SFX_ORDER:
        if args.only and key not in args.only:
            continue
        y = np.asarray(defs[key](rng_for(key)), float)
        y = y - np.mean(y)
        y = peak_norm(y, 0.89)
        if key not in LOOP_SFX:
            y = fade(y, 0.002, 0.012)
        y = soft_limit(y, 0.97)
        assert np.all(np.isfinite(y)), key
        path = os.path.join(sfx_dir, key + ".wav")
        write_wav(path, y)
        report.append((path, float(np.max(np.abs(y))), len(y) / SR))

    ext = "ogg" if sf is not None else "wav"
    for key, fn in MUSIC.items():
        if args.only and key not in args.only:
            continue
        y = np.asarray(fn(), float)
        assert np.all(np.isfinite(y)), key
        path = write_music(os.path.join(mus_dir, key), y)
        report.append((path, float(np.max(np.abs(y))), y.shape[-1] / SR))
        print(f"  rendered {key:12s} {y.shape[-1] / SR:6.1f}s", flush=True)

    if not args.only:
        write_manifest(args.manifest, ext)

    total = 0
    for path, pk, dur in report:
        size = os.path.getsize(path)
        total += size
        flag = "  CLIP!" if pk >= 0.99 else ""
        print(f"{os.path.relpath(path, args.out):32s} {dur:6.2f}s peak={pk:.3f} {size / 1024:8.1f} KB{flag}")
    print(f"TOTAL {total / 1e6:.2f} MB  (music format: {ext})")
    if any(pk >= 0.99 for _, pk, _ in report):
        sys.exit("clipping detected")


if __name__ == "__main__":
    main()
