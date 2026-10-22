#!/usr/bin/env python3
"""Cue sheet for the Ledgerline launch clip: music bed + designed SFX on the same frames.

Frames are the picture's frames (30 fps). Every cue below is tied to a beat in TIMELINE.md.
Sound design follows motion-claude's sound-design skill: one impact per video-scale moment,
SFX thin enough that the music bed still reads, panning that follows the movement on screen.
"""
import os, sys, wave, array, math

sys.path.insert(0, '/opt/data/motion-lab/claude-motion')
from sfx import Mix, SR                       # noqa: E402
from sfx.synth import (impact, whoosh, click, pop, riser, chime, key,  # noqa: E402
                       bandnoise, blip)

HERE = os.path.dirname(os.path.abspath(__file__))
DUR = 20.0
F = 1 / 30.0                                  # one frame in seconds
m = Mix(DUR, seed=20261022)


def at(frame, samples, gain=1.0, pan=0.0):
    m.put(frame * F, samples, gain, pan)


def read_wav(path):
    with wave.open(path) as w:
        assert w.getsampwidth() == 2
        a = array.array('h')
        a.frombytes(w.readframes(w.getnframes()))
    return [a[i] / 32768.0 for i in range(0, len(a), 2)], [a[i] / 32768.0 for i in range(1, len(a), 2)]


# --------------------------------------------------------------- music bed
# "Retro Synths" by HoliznaCC0, CC0 1.0 (Free Music Archive). 20 s from 14.000 s so the
# track's drop lands on frame 60 of the cut (bar 2, 120 BPM).
bedL, bedR = read_wav(os.path.join(HERE, 'music-bed.wav'))
DUCKS = [(5.93, 6.40), (6.80, 7.20), (13.92, 14.40), (15.90, 16.30)]
n = len(bedL)
for i in range(n):
    t = i / SR
    g = 0.46
    if t < 0.3:
        g *= t / 0.3
    if t > DUR - 0.9:
        g *= max(0.0, (DUR - t) / 0.9)
    for a0, a1 in DUCKS:
        if a0 <= t <= a1:
            k = math.sin(math.pi * (t - a0) / (a1 - a0))
            g *= 1 - 0.45 * k
    bedL[i] *= g
    bedR[i] *= g
m.put_stereo(0.0, bedL, bedR, 1.0)

# ------------------------------------------------------------- scene 1: mess
at(0, whoosh(0.42, 900, 2600, 0.5), 0.42, -0.25)          # paper riff into frame
at(3, impact(0.7), 0.55, 0.0)                             # MONTH slams (f2-16)
at(6, bandnoise(int(0.1 * SR), lambda k: 2600, q=0.7), 0.5, -0.15)   # paper contact
at(20, pop(200, 130, 0.2), 0.34)                          # END. mask settles
at(24, pop(260, 190, 0.16), 0.22)
at(30, whoosh(0.2, 600, 1800, 0.4), 0.18)
for k in range(7):                                        # subtitle words
    at(23 + k * 1.6, click(1500 + 90 * k, 0.04), 0.12, -0.5 + 0.16 * k)
for k in range(15):                                       # 48 tabs cascading in
    fr = 30 + k * 3.3
    at(fr, pop(520 + 26 * k, 420 + 20 * k, 0.1), 0.10, math.sin(k * 1.7) * 0.7)
at(84, riser(0.62, 300, 5200), 0.34)                      # swirl gathers
at(88, bandnoise(int(0.55 * SR), lambda k: 700 + 2200 * (k / SR) / 0.55, q=0.9), 0.26, 0.3)
at(104, click(900, 0.06), 0.40)                           # the one report lands
at(110, whoosh(0.34, 1200, 5200, 0.65), 0.5, 0.55)        # whip-pan out (f110-120)

# --------------------------------------------------------- scene 2: one click
at(120, impact(0.9), 0.5)                                 # cut lands
at(121, whoosh(0.3, 3400, 700, 0.5), 0.35, -0.6)
at(138, impact(0.55), 0.34)                               # sheet lands on the desk
for k in range(9):                                        # stats + rows populating
    at(131 + k * 2.2, click(1250 + 60 * k, 0.035), 0.10, -0.35 + 0.09 * k)
at(164, whoosh(0.26, 2600, 6200, 0.5), 0.30, 0.6)         # cursor whips in
at(170, click(2100, 0.04), 0.20, 0.6)                     # hover tick + sheen
at(180, click(1500, 0.06), 0.55)                          # press
at(180, impact(0.45), 0.30)
at(182, pop(120, 60, 0.22), 0.30)                         # depress
at(184, riser(0.72, 420, 6200), 0.26)                     # red wipe builds
at(206, impact(1.1), 0.78)                                # EXPORTED stamp
at(206, pop(90, 40, 0.3), 0.34)
at(207, bandnoise(int(0.55 * SR), lambda k: 2400 * (1 - k / (0.55 * SR)) + 300, q=0.6), 0.34, 0.2)
at(214, chime([392.0, 587.33], 1.1, 0.5), 0.24)           # confirmation
at(228, chime([587.33, 880.0], 0.7, 0.4), 0.14)
at(236, bandnoise(int(0.5 * SR), lambda k: 900 + 700 * math.sin(k / SR * 9), q=1.1), 0.22, -0.4)  # paper peel
at(238, bandnoise(int(0.9 * SR), lambda k: 1800 - 1200 * (k / SR) / 0.9, q=1.3), 0.26, -0.15)     # fold
for k in range(3):                                        # three format cards
    at(264 + k * 4, pop(430 + 130 * k, 620 + 130 * k, 0.14), 0.20, -0.5 + 0.5 * k)
for k in range(3):                                        # ticks
    at(306 + k * 10, click(1900 + 120 * k, 0.04), 0.22, -0.5 + 0.5 * k)
for k in range(3):                                        # cards fly out
    at(330 + k * 5, whoosh(0.3, 700 + 200 * k, 4200, 0.6), 0.24, 0.2 + 0.3 * k)
at(352, whoosh(0.34, 900, 2600, 0.5), 0.34, -0.2)         # result board rises
at(353, impact(0.7), 0.42)
for k in range(6):                                        # count-up ticks 0 -> 8 s
    at(372 + k * 4.6, click(1100 + 110 * k, 0.03), 0.13, 0.0)
at(410, riser(0.66, 320, 5600), 0.30)                     # into the payoff
at(420, impact(1.2), 0.85)                                # payoff
at(420, pop(120, 38, 0.5), 0.42)
at(421, chime([392.0, 587.33, 784.0], 1.4, 0.55), 0.26)
at(424, whoosh(0.4, 3200, 800, 0.55), 0.32, -0.4)         # board shrinks away
for k in range(4):                                        # "Every format. Every recipient."
    at(436 + k * 2.4, click(1400 + 70 * k, 0.03), 0.16, -0.4 + 0.25 * k)
at(452, whoosh(0.24, 900, 3200, 0.4), 0.24)
at(468, whoosh(0.4, 1100, 5400, 0.75), 0.62, -0.6)        # whip-pan out

# ------------------------------------------------------------ scene 3: close
at(480, impact(1.0), 0.55)
at(480, whoosh(0.3, 4200, 900, 0.5), 0.34, 0.5)
for k in range(3):                                        # stacked lines
    at(480 + k * 8, pop(300 + 60 * k, 210 + 40 * k, 0.14), 0.24, -0.3 + 0.3 * k)
at(502, whoosh(0.3, 800, 2600, 0.35), 0.22, -0.3)         # red rule draws
# sonic logo: three rising notes under the mark + wordmark
for k, (fr, fq) in enumerate([(506, 392.0), (514, 587.33), (522, 784.0)]):
    at(fr, chime([fq, fq * 1.5], 1.0, 0.45), 0.20 - 0.02 * k, -0.2 + 0.2 * k)
at(530, key(), 0.25)                                      # first keystroke
m.typing(530.5, 564, 31, gain=(0.10, 0.18), spread=0.15)  # CTA types on
at(590, chime([392.0, 587.33, 784.0, 1174.66], 1.6, 0.6), 0.16)   # button ending
at(597, chime([196.0, 293.66], 0.9, 0.5), 0.12)

print(m.master(target_lufs=-14.0))
m.write(os.path.join(HERE, 'mix.wav'))
print('wrote', os.path.join(HERE, 'mix.wav'))
