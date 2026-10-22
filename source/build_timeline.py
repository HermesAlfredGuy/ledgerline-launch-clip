#!/usr/bin/env python3
"""Build TIMELINE.md: the beat sheet (frame-locked) + the verbatim motion-term.sh definition of every id used."""
import os, re

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFS = {}
order = open(os.path.join(HERE, 'docs', 'ids.txt')).read().split()
lines = [l.rstrip('\n') for l in open(os.path.join(HERE, 'docs', 'definitions.raw.txt')) if l.strip()]
for i, ident in enumerate(order):
    text = lines[i][2:] if lines[i].startswith('- ') else lines[i]
    text = re.sub(r'^(effects|& editing|& sound|& music|sound)\s+', '', text.strip())
    DEFS[ident] = text.strip()

BEATS = [
    # scene, frames, name, primary, secondary, cut, sound
    ('1', '0–3', 'Open on ink, crop marks lock', 'hard-cut', 'gate-weave', 'hard-cut', 'whoosh'),
    ('1', '2–16', 'MONTH slams down', 'stamp-impression', 'jitter-and-boil-text', '—', 'impact-hit + foley'),
    ('1', '11–26', 'END. rises out of its own baseline', 'text-mask-reveal', 'tracking-in', '—', 'ui-sound-effects'),
    ('1', '18–34', 'Red rule draws across', 'stroke-draw-on', 'anticipation', '—', 'ui-sound-effects'),
    ('1', '22–40', 'Subtitle arrives word by word', 'per-word-fade-in', 'stereo-panning', '—', 'ui-sound-effects'),
    ('1', '28–80', '48 tabs cascade into a pile', 'staggered-cascade-reveal', 'idle-float-bob', '—', 'ui-sound-effects'),
    ('1', '88–108', 'Counter rolls 48 → 1, "48 tabs." struck out', 'number-count-down', 'stroke-draw-on', '—', 'ui-sound-effects'),
    ('1', '88–106', 'Pile spirals into one report', 'particle-swarm-assemble', 'anticipation', 'cut-on-action', 'riser'),
    ('1', '100–112', 'The one report lands', 'overshoot-bounce-in', 'drop-shadow-breathing', '—', 'click'),
    ('1', '110–120', 'Whip out to the product', 'whip-pan', 'motion-blur', 'whip-pan', 'whoosh'),
    ('2', '120–140', 'Report sheet drops onto the desk', 'overshoot-bounce-in', 'swiss-grid-slide', 'hard-cut', 'impact-hit'),
    ('2', '130–160', 'Stats and rows populate, numbers roll', 'staggered-cascade-reveal', 'odometer-roll', '—', 'ui-sound-effects'),
    ('2', '164–180', 'Cursor whips in with a trailing ring', 'cursor-follower-dot-and-ring', 'motion-blur', '—', 'whoosh'),
    ('2', '170–182', 'Hover: sheen crosses the button', 'sheen-sweep', 'cursor-state-change', '—', 'ui-sound-effects'),
    ('2', '180–192', 'Press: button depresses, ripple leaves', 'press-depress', 'touch-ripple', '—', 'click + sub-drop'),
    ('2', '184–206', 'Red fills the sheet left to right', 'linear-wipe', 'halftone', '—', 'riser'),
    ('2', '196–212', 'EXPORTED stamps into the red', 'stamp-impression', 'halftone-dot-scaling', '—', 'impact-hit + success-chime'),
    ('2', '198–212', '4 h 12 m is struck through', 'stroke-draw-on', 'cut-to-the-beat', '—', 'ui-sound-effects'),
    ('2', '212–226', 'Value swaps to 8 s', 'cross-dissolve', 'number-count-down', '—', 'success-chime'),
    ('2', '236–254', 'Red recedes, stamp stays printed', 'linear-wipe', 'jitter-and-boil-text', '—', 'foley'),
    ('2', '238–262', 'Sheet folds into three panels', 'accordion-fold', 'page-turn', '—', 'foley'),
    ('2', '264–288', 'PDF / XLSX / LINK fan out', 'stacked-card-reveal', 'drop-shadow-breathing', '—', 'ui-sound-effects'),
    ('2', '306–336', 'Cursor ticks each format green', 'cursor-state-change', 'badge-count-bump', '—', 'ui-sound-effects'),
    ('2', '330–352', 'Cards fly out along a path', 'path-follow-motion', 'motion-blur', '—', 'whoosh'),
    ('2', '350–366', 'Result board slides over the page', 'slide-over-cover', 'progress-steps-connector-fill', '—', 'impact-hit'),
    ('2', '372–404', '8 s counts up, audit line snaps full', 'number-count-up', 'progress-steps-connector-fill', '—', 'ui-sound-effects'),
    ('2', '410–420', 'Riser into the payoff', 'anticipation', 'halftone-dot-scaling', '—', 'riser'),
    ('2', '420–448', 'Payoff; board shrinks to a corner card', 'zoom-out-reveal', 'handheld-shake', 'cut-on-action', 'impact-hit + sub-drop + success-chime'),
    ('2', '436–470', '"Every format. Every recipient." lands', 'per-word-fade-in', 'underline-wipe', '—', 'ui-sound-effects'),
    ('2', '468–480', 'Whip out to the closing card', 'whip-pan', 'motion-blur', 'whip-pan', 'whoosh'),
    ('3', '480–500', '"Reports" rises through its mask', 'text-mask-reveal', 'stacked-line-build', 'hard-cut', 'impact-hit'),
    ('3', '488–506', '"that ship" stacks under it', 'stacked-line-build', 'tracking-in', '—', 'ui-sound-effects'),
    ('3', '496–514', '"themselves." completes the block', 'stacked-line-build', 'tracking-in', '—', 'ui-sound-effects'),
    ('3', '502–530', 'Red rule + logo mark wipe in', 'logo-mask-wipe-reveal', 'stroke-draw-on', '—', 'sonic-logo'),
    ('3', '512–552', 'LEDGERLINE tracking collapses', 'tracking-in', 'logo-mask-wipe-reveal', '—', 'sonic-logo'),
    ('3', '530–564', 'CTA types on, caret blinking', 'typewriter-reveal', 'blinking-cursor', '—', 'typing-sounds'),
    ('3', '556–600', 'Hold: marquee rows drift, grain boils', 'parallax-marquee-rows', 'film-grain', 'button-ending', 'button-ending'),
]

HEAD = """# TIMELINE — Ledgerline launch clip (v2)

20.000 s · 1080×1080 · 30 fps · 600 frames · H.264 High · audio −14 LUFS.
Music: "Retro Synths" by HoliznaCC0 (CC0 1.0, Free Music Archive), excerpt 14.000–34.000 s,
so the track's drop lands on frame 60. **120.029 BPM measured by `beat-grid.sh`** → one beat = 15 frames,
one bar = 60 frames; every cut below sits on a beat line (bar starts: 0, 60, 120 … 540).

Beats are named before they are built. Each row: the primary move, the secondary move that keeps the frame
alive, the cut into the beat and the sound cue. Definitions are the verbatim `motion-term.sh` text for each id.

Three scenes: **1 the mess (0–119) · 2 the click (120–479) · 3 the result (480–599)**.
Signature moment: the peel–fold–stamp, f238–288 (sheet becomes three postable formats).
"""

rows = ['', '## Beat sheet', '', '| Scene | Frames | t | Beat | Primary move | Secondary | Cut | Sound |', '|---|---|---|---|---|---|---|---|']
for sc, fr, name, p, s, c, snd in BEATS:
    a = fr.split('–')[0]
    rows.append(f'| {sc} | {fr} | {int(a)/30:.2f}s | {name} | `{p}` | `{s}` | `{c}` | `{snd}` |')

rows += ['', '## Technique definitions (verbatim, `motion-term.sh`)', '']
used = []
for sc, fr, name, p, s, c, snd in BEATS:
    for k in (p, s, c):
        if k != '—' and k not in used:
            used.append(k)
for k in ['music-bed', 'ducking', 'cut-to-the-beat', 'stereo-panning', 'ui-sound-effects', 'foley', 'whoosh',
          'riser', 'impact-hit', 'sub-drop', 'success-chime', 'sonic-logo', 'typing-sounds', 'button-ending',
          'gate-weave', 'film-grain', 'halftone']:
    if k not in used:
        used.append(k)
for k in used:
    rows.append(f'**`{k}`** — {DEFS.get(k, "(definition not fetched)")}')
    rows.append('')

rows += ['## Sound pass', '',
         '| Layer | Source | Notes |', '|---|---|---|',
         '| Music bed | "Retro Synths" — HoliznaCC0, CC0 1.0 (FMA) | 20 s excerpt from 14.000 s, −16 LUFS master, ducked 2.5 dB under the three impacts |',
         '| Designed SFX | `claude-motion/sfx` (procedural, seeded) | 60 cues on picture frames; panned to follow the movement (stereo-panning) |',
         '| Mix | `audio/cues.py` → `audio/mix.wav` | −14.1 LUFS integrated, true peak under −1 dBTP, AAC 192k in the master |', '',
         'Flash budget: no luminance event repeats faster than 2 per second; hard cuts sit on bar lines (one per 2 s).',
         'No voiceover. Full motion throughout — no reduced-motion branch, no toggle.']

open(os.path.join(HERE, 'TIMELINE.md'), 'w').write(HEAD + '\n'.join(rows) + '\n')
print('TIMELINE.md', len(used), 'ids')
