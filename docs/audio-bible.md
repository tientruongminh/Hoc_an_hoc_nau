# Audio Bible: Học Ăn Học Nấu (Chapter 1)

> Every sound in the game is **procedurally synthesised** by `tools/audio/synth.py` (numpy + scipy).
> We use no samples or third-party loops, so there are no licensing issues. Every seed is fixed, so the output is reproducible.

## 1. Style / Phong cách

- **VI:** Ấm, hoài niệm, hài hước kiểu đời thường miền quê Việt Nam. Đây không phải chiptune chói tai. Giai điệu dùng **ngũ cung**: điệu Bắc cho cảnh vui, điệu Nam cho cảnh hoài niệm, Nam oán cho cảnh buồn hoặc căng thẳng.
- **EN:** The sound is warm, nostalgic and comedic slice-of-life, not harsh 8-bit. Melodies use Vietnamese pentatonic modes:

| Mode | Notes (on C) | Mood |
|---|---|---|
| Bắc | C D F G A | bright, cheerful |
| Nam | C Eb F G Bb | warm, nostalgic |
| Nam oán | C Eb F G Ab | sad, tense |
| Major pentatonic | C D E G A | cartoon comedy (goose chase, cooking) |

**Instrument kit** (all synthesised):

| Instrument | Technique |
|---|---|
| Đàn tranh | Karplus-Strong pluck, with optional bend-in and vibrato |
| Đàn bầu | near-sine harmonic tone with large slides and vibrato |
| Pad | detuned sines |
| Lead | polyBLEP pulse with PWM |
| Bass | triangle + sub sine |
| Tuba / trombone | filtered saw, used for comedy |
| Mõ | wood block |
| Trống | low toms |
| Drums | kick, snare, hat, shaker, clap |
| Room | reverb by convolution with a generated impulse response |

## 2. Music cues / Nhạc theo cảnh

| Key | BPM | Mode / root | Length | Plays in chap1 |
|---|---|---|---|---|
| `title` | 84 | Nam / A | 45.7s loop | Main menu, credits |
| `home_day` | 96 | Bắc / D (swing) | 60s loop | Free roam in the house and yard, cleaning, washing dishes |
| `tension` | 72 | Nam oán / A | 40s loop | Opening (mom falls), searching for dad's phone number |
| `goose_chase` | 152 | Major penta / C | 44s loop | Egg-collecting challenge vs. the two geese |
| `bike_ride` | 128 | Bắc / E | 45s loop | Bike ride to Bà 8's house (obstacle dodge) |
| `festival` | 112 | Bắc / D | 51s loop | Park / local festival, talking with Nam |
| `oanquan` | 90 | Nam / A (swing) | 43s loop | Ô ăn quan match against the "thanh niên" |
| `cooking` | 120 | Major penta / F (swing) | 48s loop | Fried-rice cooking challenge |
| `ending_good` | 100 | Bắc / D | 23s one-shot | Good ending: "mai mở quán" |
| `ending_bad` | 84 | Nam oán / G | 24s one-shot | Every bad ending (hospital, robbed house, crash, goose defeat, ...) |
| `amb_summer` | – | – | 30s loop | Outdoor ambience under `home_day` / `goose_chase`: cicadas, birds, breeze |
| `amb_crowd` | – | – | 20s loop | Festival crowd murmur under `festival` / `oanquan` |

Loops are rendered with an extra tail. The tail (note releases and reverb) is **wrapped back onto the head**, so the loop point is sample-accurate and gapless. Set `loop: true` in Phaser.

## 3. SFX

These are mono 44.1 kHz WAV files in `game/public/assets/audio/sfx/`. Each one is peak-normalised to about -1.5 dBFS and has short fades. The exception is `sizzle_loop`, which is a seamless 2-second loop.

| Group | Keys |
|---|---|
| UI | `ui_click` `ui_hover` `ui_confirm` `ui_back` |
| Dialogue typewriter voices | `blip_a` (player), `blip_b` (mom, low and warm), `blip_c` (other NPCs, higher). Randomise `rate` ±8% per character. |
| Movement | `step_wood` (indoor), `step_grass` (garden), `step_dirt` (road / park) |
| Feedback | `pickup` `coin` `quest_new` `quest_done` `success_jingle` `fail_sting` `hurt` |
| House | `door_open` `door_close` `lock_click` `phone_ring` `phone_pickup` `notebook_flip` |
| Cleaning | `dish_crash` `glass_clink` `broom_sweep` `trash_bag` `water_splash` `scrub` |
| Garden | `goose_honk` `goose_bite` `egg_collect` `grain_scatter` (luring geese with paddy) |
| Ride | `bike_bell` `splash_puddle` `crash_thud` `car_whoosh` |
| Ô ăn quan | `seed_drop` (one per sown stone), `capture`, `cash_register` (bets) |
| Cooking | `whisk` `chop` `stove_click` `pan_place` `pour` `sizzle_loop` |
| Comedy | `slipper_whoosh` + `thwack` (the flying slipper / broom), `heartbeat` |

## 4. Mixing guidance / Gợi ý mix trong game

- Music bus is about 0.6, ambience about 0.35, SFX 0.8, dialogue blips 0.35.
- Every music track is RMS-normalised to the same loudness, so you can crossfade between scenes over 600–1000 ms without adjusting gain.
- Duck the music to about 0.35 while a dialogue box is open, and to 0 during `ending_*` stings.

## 5. Regenerate / Tạo lại

```bash
python3 -m venv .venv-audio && .venv-audio/bin/pip install -r tools/audio/requirements.txt
.venv-audio/bin/python -I tools/audio/synth.py --out game/public/assets/audio
# render only a few keys while iterating (the manifest is not rewritten):
.venv-audio/bin/python -I tools/audio/synth.py --only goose_chase goose_honk
```

The script also rewrites `game/src/data/audioManifest.ts`, which holds the keys and the correct music file extension. If `soundfile` is missing, music falls back to 22 kHz mono WAV (larger files) and the manifest switches to `.wav` automatically. At the end of each run the script prints peak levels and exits with an error if any file clips (peak ≥ 0.99).

To change a sound, edit its `x_<key>` function (SFX) or `track_<key>` (music) in `synth.py`. Melodies come from `gen_phrase` / `form` (A–A′–B–A structure), using an RNG seeded by the track name. Changing one track never changes another.
