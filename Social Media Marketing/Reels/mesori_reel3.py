#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mesori — 30s Reel Generator
- 1080x1920, 30fps, H.264 + AAC
- Arabic on-screen text, Egyptian colloquial
- Procedural visuals + procedural soundtrack
- NO app repository assets are used here. Concept video only.
"""

import math, os, random, subprocess, sys, wave
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import arabic_reshaper
from bidi.algorithm import get_display

W, H = 1080, 1920
FPS = 30
DUR = 30
NF = FPS * DUR
OUT = Path("mesori_reel_out")
OUT.mkdir(exist_ok=True)
MP4 = OUT / "mesori_reel_30s.mp4"
WAV = OUT / "soundtrack.wav"

# ---------- FONT ----------
FONT_PATH = os.environ.get("MESORI_FONT", "")
if not FONT_PATH:
    candidates = [
        "Cairo-Bold.ttf",
        "Cairo-Regular.ttf",
        "/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf",
        "/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/tahoma.ttf",
    ]
    for c in candidates:
        if os.path.exists(c):
            FONT_PATH = c
            break

if not FONT_PATH:
    print("ERROR: لم أجد خطًا عربيًا.")
    print("حمّل Cairo Bold وسمّه Cairo-Bold.ttf بجوار السكربت.")
    print("أو شغّل: export MESORI_FONT=/path/to/font.ttf")
    sys.exit(1)

_fonts = {}
def F(size):
    size = int(size)
    if size not in _fonts:
        _fonts[size] = ImageFont.truetype(FONT_PATH, size)
    return _fonts[size]

def ar(t):
    return get_display(arabic_reshaper.reshape(t))

def rgba(c, a=255):
    if len(c) == 4:
        return (c[0], c[1], c[2], int(c[3] * a / 255))
    return (c[0], c[1], c[2], int(a))

C = {
    "bg": (8, 12, 20),
    "gold": (235, 183, 78),
    "sand": (246, 228, 190),
    "teal": (44, 196, 181),
    "red": (255, 105, 85),
    "dark": (16, 24, 38),
    "white": (255, 255, 255),
    "muted": (190, 200, 210),
}

def clamp01(x): return max(0.0, min(1.0, x))
def ease_out(x): return 1.0 - (1.0 - clamp01(x)) ** 3

def ease_in_out(x):
    x = clamp01(x)
    return 3 * x * x - 2 * x * x * x

def prog(t, a, b):
    return clamp01((t - a) / max(1e-9, (b - a)))

def win(t, a, b, c, d):
    if t < a or t > d:
        return 0.0
    if t < b:
        return ease_in_out((t - a) / max(1e-9, (b - a)))
    if t < c:
        return 1.0
    return 1.0 - ease_in_out((t - c) / max(1e-9, (d - c)))

def draw_text(d, xy, txt, size, fill, anchor="mm", alpha=1.0, shadow=True, arabic=True):
    if alpha <= 0:
        return
    content = ar(txt) if arabic else txt
    f = F(size)
    col = rgba(fill, int(255 * alpha))
    if shadow:
        sh = (0, 0, 0, int(150 * alpha))
        d.text((xy[0] + 3, xy[1] + 4), content, font=f, fill=sh, anchor=anchor)
    d.text(xy, content, font=f, fill=col, anchor=anchor)

def draw_panel(d, box, radius=36, fill=C["dark"], outline=C["gold"], width=3, alpha=1.0):
    if alpha <= 0:
        return
    d.rounded_rectangle(
        box,
        radius=radius,
        fill=rgba(fill, int(220 * alpha)),
        outline=rgba(outline, int(200 * alpha)),
        width=width,
    )

def draw_eye(d, cx, cy, s, open_amt, color=C["gold"], iris=C["teal"], alpha=1.0):
    if alpha <= 0:
        return
    open_amt = max(0.04, min(1.0, open_amt))
    col = rgba(color, int(255 * alpha))

    segments = 80
    pts_top = []
    pts_bot = []
    for i in range(segments):
        x = -1.0 + 2.0 * i / (segments - 1)
        y = -0.55 * (1.0 - x * x)
        pts_top.append((cx + x * s, cy + y * s * open_amt))
    for i in range(segments - 1, -1, -1):
        x = -1.0 + 2.0 * i / (segments - 1)
        y = 0.38 * (1.0 - x * x)
        pts_bot.append((cx + x * s, cy + y * s * open_amt))

    d.polygon(pts_top + pts_bot, fill=col)

    pr = s * 0.18
    d.ellipse((cx - pr, cy - pr * open_amt, cx + pr, cy + pr * open_amt),
              fill=(5, 8, 15, int(255 * alpha)))

    pr2 = s * 0.10
    d.ellipse((cx - pr2, cy - pr2 * open_amt, cx + pr2, cy + pr2 * open_amt),
              fill=rgba(iris, int(255 * alpha)))

    lw = max(2, int(s * 0.035))
    d.line((cx - 0.9 * s, cy - 0.95 * s, cx + 0.85 * s, cy - 1.15 * s), fill=col, width=lw)
    d.line((cx, cy + 0.35 * s * open_amt, cx, cy + 1.2 * s), fill=col, width=lw)
    d.line((cx + 0.85 * s, cy - 1.15 * s, cx + 1.05 * s, cy + 0.15 * s), fill=col, width=lw)

# ---------- BACKGROUND ----------
def make_bg():
    y = np.linspace(0, 1, H)[:, None]
    x = np.linspace(0, 1, W)[None, :]
    cx, cy = 0.5, 0.32
    r = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    glow = np.clip(1.0 - r * 1.45, 0, 1) ** 2

    top = np.array([12, 18, 34], dtype=np.float32)
    bot = np.array([2, 4, 10], dtype=np.float32)
    base = top[None, None, :] * (1.0 - y[:, :, None]) + bot[None, None, :] * y[:, :, None]

    teal_glow = np.array([20, 92, 88], dtype=np.float32)[None, None, :] * glow[:, :, None] * 0.40
    gold_glow = np.array([110, 78, 20], dtype=np.float32)[None, None, :] * glow[:, :, None] * 0.22

    arr = np.clip(base + teal_glow + gold_glow, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr, "RGB").convert("RGBA")

    vign = Image.new("L", (W, H), 0)
    vd = ImageDraw.Draw(vign)
    vd.ellipse((-W * 0.35, -H * 0.15, W * 1.35, H * 1.15), fill=255)
    vign = vign.filter(ImageFilter.GaussianBlur(120))

    dark = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    img = Image.composite(img, dark, vign)
    return img

BASE = make_bg()

random.seed(17)
PARTICLES = [
    (random.random(), random.random(), random.uniform(0.5, 2.8), random.uniform(0, math.tau))
    for _ in range(150)
]

def draw_particles(d, t):
    for x0, y0, s, ph in PARTICLES:
        px = x0 * W + math.sin(t * 0.6 + ph) * 16
        py = ((y0 - t * 0.012) % 1.0) * H
        a = int(25 + 70 * (0.5 + 0.5 * math.sin(t * 1.7 + ph)))
        d.ellipse((px, py, px + s, py + s), fill=(230, 190, 100, a))

def draw_grid(d, t):
    off = (t * 18.0) % 90.0
    for x in range(-90, W + 90, 90):
        d.line((x + off, 0, x + off, H), fill=(235, 183, 78, 10), width=1)
    for y in range(0, H, 90):
        d.line((0, y + off * 0.5, W, y + off * 0.5), fill=(44, 196, 181, 8), width=1)

# ---------- SCENES ----------
def scene_intro(d, t):
    a = win(t, 0.0, 0.2, 3.6, 4.3)
    if a <= 0:
        return

    ca = win(t, 0.0, 0.15, 2.9, 3.6)
    if ca > 0:
        slide = ease_out(prog(t, 0.0, 0.5))
        cy = 140 + (1.0 - slide) * (-260)
        box = (80, cy, W - 80, cy + 240)
        draw_panel(d, box, radius=34, fill=C["dark"], outline=C["gold"], width=3, alpha=ca)

        draw_eye(d, 180, cy + 110, 38, 1.0, C["gold"], C["teal"], alpha=ca)
        draw_text(d, (240, cy + 70), "إشعار من ٥٠٠٠ سنة", 42, C["gold"], anchor="lm", alpha=ca)
        draw_text(d, (240, cy + 145), "افتح… قبل ما الوقت يخلص.", 34, C["sand"], anchor="lm", alpha=ca)

    op = ease_out(prog(t, 1.1, 2.3))
    ea = win(t, 1.0, 1.3, 3.8, 4.3)
    if ea > 0:
        for r in range(4):
            rr = 200 + r * 34 + 10 * math.sin(t * 2.2)
            d.ellipse((W / 2 - rr, 790 - rr, W / 2 + rr, 790 + rr),
                      outline=rgba(C["gold"], int(20 * ea)), width=2)
        draw_eye(d, W / 2, 790, 235, op, C["gold"], C["teal"], alpha=ea)

    if t > 2.2:
        aa = win(t, 2.2, 2.5, 3.8, 4.3)
        draw_text(d, (W / 2, 1090), "وسؤال…", 94, C["sand"], alpha=aa)

    if t > 2.8:
        aa = win(t, 2.8, 3.0, 3.8, 4.3)
        draw_text(d, (W / 2, 1200), "٥ ثواني… وتبدأ", 52, C["gold"], alpha=aa)

def scene_question(d, t):
    a = win(t, 4.4, 4.8, 9.6, 10.2)
    if a <= 0:
        return

    draw_text(d, (W / 2, 275), "السؤال الأول", 42, C["teal"], alpha=a)
    draw_text(d, (W / 2, 345), "مين بنى الهرم الأكبر؟", 64, C["sand"], alpha=a)

    if 4.5 <= t <= 9.5:
        num = 5 - int(t - 4.5)
        if num > 0:
            pulse = 1.0 + 0.06 * math.sin(t * 18)
            r = 62 * pulse
            cx, cy = W - 160, 270
            d.ellipse((cx - r, cy - r, cx + r, cy + r),
                      fill=rgba(C["dark"], int(210 * a)),
                      outline=rgba(C["gold"], int(210 * a)), width=4)
            draw_text(d, (cx, cy), ["٥", "٤", "٣", "٢", "١"][5 - num], 54, C["gold"], alpha=a)

    box = (90, 440, W - 90, 1110)
    draw_panel(d, box, radius=42, fill=C["dark"], outline=C["gold"], width=3, alpha=a)
    draw_text(d, (W / 2, 530), "جاوب صح…", 44, C["teal"], alpha=a)
    draw_text(d, (W / 2, 625), "مين اللي بنى", 70, C["sand"], alpha=a)
    draw_text(d, (W / 2, 715), "الهرم الأكبر؟", 70, C["sand"], alpha=a)

    options = [("رمسيس الثاني", False), ("خوفو", True)]
    for i, (txt, correct) in enumerate(options):
        oa = ease_out(prog(t, 5.0 + i * 0.15, 5.4 + i * 0.15)) * a
        if oa <= 0:
            continue

        y = 860 + i * 170
        is_hl = correct and t >= 9.0

        if is_hl:
            fill = C["teal"]
            outline = (255, 230, 140)
            width = 5
        else:
            fill = C["dark"]
            outline = C["muted"]
            width = 3

        d.rounded_rectangle(
            (150, y - 56, W - 150, y + 56),
            radius=28,
            fill=rgba(fill, int(210 * oa)),
            outline=rgba(outline, int(230 * oa)),
            width=width,
        )
        draw_text(d, (W / 2, y), txt, 52, C["white"] if is_hl else C["sand"], alpha=oa)

def scene_fact(d, t):
    a = win(t, 9.8, 10.2, 13.2, 13.8)
    if a <= 0:
        return

    if t < 11.2:
        p = prog(t, 9.8, 11.2)
        for i in range(28):
            ang = i * math.tau / 28 + t * 0.55
            r1 = 80
            r2 = 280 + 320 * p
            x1 = W / 2 + math.cos(ang) * r1
            y1 = 880 + math.sin(ang) * r1
            x2 = W / 2 + math.cos(ang) * r2
            y2 = 880 + math.sin(ang) * r2
            d.line((x1, y1, x2, y2), fill=rgba(C["gold"], int(110 * a * (1 - p))), width=3)

    draw_text(d, (W / 2, 770), "خوفو", 140, C["gold"], alpha=a)
    draw_text(d, (W / 2, 930), "الهرم الأكبر", 70, C["sand"], alpha=a)
    draw_text(d, (W / 2, 1060), "أكبر بناء في مصر القديمة.", 46, C["muted"], alpha=a)

    if t > 12.0:
        aa = win(t, 12.0, 12.3, 13.2, 13.8)
        draw_text(d, (W / 2, 1250), "بس دي مش نهاية الحكاية…", 52, C["teal"], alpha=aa)

def scene_levels(d, t):
    a = win(t, 13.4, 14.0, 18.4, 19.0)
    if a <= 0:
        return

    draw_text(d, (W / 2, 240), "اطلع مستوى ورا مستوى.", 60, C["sand"], alpha=a)

    levels = [
        ("مستوى ١", "بداية الرحلة"),
        ("مستوى ٢", "تحدي المعرفة"),
        ("مستوى ٣", "أسطورة التاريخ"),
    ]

    for i, (title, sub) in enumerate(levels):
        p = ease_out(prog(t, 14.0 + i * 0.15, 14.6 + i * 0.15)) * a
        if p <= 0:
            continue

        y = 720 + i * 230 + (1.0 - p) * 120
        d.rounded_rectangle(
            (150, y, W - 150, y + 160),
            radius=32,
            fill=rgba(C["dark"], int(215 * p)),
            outline=rgba(C["gold"] if i == 0 else C["teal"], int(180 * p)),
            width=3,
        )

        if i == 0:
            d.polygon([(230, y + 115), (270, y + 45), (310, y + 115)],
                      fill=rgba(C["gold"], int(255 * p)))
        elif i == 1:
            d.rectangle((255, y + 45, 282, y + 120), fill=rgba(C["teal"], int(255 * p)))
            d.polygon([(245, y + 60), (292, y + 60), (268, y + 30)],
                      fill=rgba(C["teal"], int(255 * p)))
        else:
            d.ellipse((240, y + 42, 295, y + 97),
                      outline=rgba(C["gold"], int(255 * p)), width=5)

        draw_text(d, (350, y + 60), title, 46, C["white"], anchor="lm", alpha=p)
        draw_text(d, (350, y + 115), sub, 32, C["muted"], anchor="lm", alpha=p)

    if t > 16.8:
        aa = win(t, 16.8, 17.2, 18.4, 19.0)
        draw_text(d, (W / 2, 1580), "وكل إجابة صح = نقطة.", 46, C["teal"], alpha=aa)

def scene_duel(d, t):
    a = win(t, 18.8, 19.4, 23.4, 24.0)
    if a <= 0:
        return

    draw_text(d, (W / 2, 210), "حد يتحداك؟", 62, C["sand"], alpha=a)
    draw_text(d, (W / 2, 290), "مين أسرع؟", 50, C["teal"], alpha=a)

    p = ease_out(prog(t, 19.0, 19.6)) * a
    if p > 0:
        y = 790

        d.rounded_rectangle(
            (70, y - 190, W / 2 - 35, y + 190),
            radius=36,
            fill=rgba(C["dark"], int(220 * p)),
            outline=rgba(C["gold"], int(200 * p)), width=4,
        )
        d.ellipse((140, y - 80, 300, y + 80),
                  fill=rgba(C["teal"], int(230 * p)),
                  outline=rgba(C["gold"], int(230 * p)), width=4)
        draw_text(d, (220, y), "ي", 80, C["dark"], alpha=p)
        draw_text(d, (W / 4, y + 130), "يسرا", 50, C["white"], alpha=p)

        d.rounded_rectangle(
            (W / 2 + 35, y - 190, W - 70, y + 190),
            radius=36,
            fill=rgba(C["dark"], int(220 * p)),
            outline=rgba(C["red"], int(200 * p)), width=4,
        )
        d.ellipse((W - 300, y - 80, W - 140, y + 80),
                  fill=rgba(C["red"], int(230 * p)),
                  outline=rgba(C["gold"], int(230 * p)), width=4)
        draw_text(d, (W - 220, y), "ع", 80, C["dark"], alpha=p)
        draw_text(d, (3 * W / 4, y + 130), "عز", 50, C["white"], alpha=p)

        draw_text(d, (W / 2, y), "VS", 68, C["gold"], alpha=p, arabic=False)

    if t > 21.0:
        aa = win(t, 21.0, 21.3, 23.4, 24.0)
        draw_text(d, (W / 2, 1160), "يسرا سبقت!", 56, C["teal"], alpha=aa)
        draw_text(d, (W / 2, 1250), "+50 نقطة", 70, C["gold"], alpha=aa)

    if t > 21.5:
        aa = win(t, 21.5, 21.8, 23.4, 24.0)
        draw_text(d, (W / 2, 1380), "أسماء توضيحية", 26, C["muted"], alpha=aa)

def scene_leaderboard(d, t):
    a = win(t, 23.2, 23.8, 26.6, 27.2)
    if a <= 0:
        return

    draw_text(d, (W / 2, 210), "سيب اسمك في التاريخ.", 60, C["sand"], alpha=a)
    draw_text(d, (W / 2, 290), "لوحة الأبطال", 42, C["teal"], alpha=a)

    d.rounded_rectangle(
        (100, 370, W - 100, 1310),
        radius=40,
        fill=rgba(C["dark"], int(225 * a)),
        outline=rgba(C["gold"], int(180 * a)), width=4,
    )

    rows = [
        ("يسرا", 1250, C["gold"]),
        ("عز", 1180, C["teal"]),
        ("آية", 1090, C["sand"]),
        ("إبراهيم", 980, C["muted"]),
        ("سلمى", 920, C["muted"]),
    ]

    for i, (name, score, color) in enumerate(rows):
        p = ease_out(prog(t, 23.6 + i * 0.12, 24.1 + i * 0.12)) * a
        if p <= 0:
            continue

        y = 470 + i * 155
        d.rounded_rectangle(
            (140, y - 50, W - 140, y + 50),
            radius=24,
            fill=rgba((32, 42, 58), int(200 * p)),
            outline=rgba(color, int(140 * p)), width=2,
        )

        d.ellipse((170, y - 30, 230, y + 30), fill=rgba(color, int(220 * p)))
        draw_text(d, (200, y), str(i + 1), 30, C["dark"], alpha=p, arabic=False)
        draw_text(d, (280, y), name, 42, C["white"], anchor="lm", alpha=p)
        draw_text(d, (W - 200, y), str(score), 42, color, anchor="rm", alpha=p, arabic=False)

    draw_text(d, (W / 2, 1350), "أسماء توضيحية", 26, C["muted"],
              alpha=win(t, 24.0, 24.3, 26.6, 27.2))

def scene_end(d, t):
    a = win(t, 26.8, 27.2, 30.1, 30.1)
    if a <= 0:
        return

    d.rectangle((0, 0, W, H), fill=(3, 5, 12, int(200 * a)))
    draw_eye(d, W / 2, 670, 160, 1.0, C["gold"], C["teal"], alpha=0.65 * a)

    draw_text(d, (W / 2, 950), "Mesori", 130, C["gold"], alpha=a, arabic=False)
    draw_text(d, (W / 2, 1080), "مسوري", 54, C["sand"], alpha=a)
    draw_text(d, (W / 2, 1240), "التاريخ مش بعيد…", 58, C["sand"], alpha=a)
    draw_text(d, (W / 2, 1330), "التاريخ دورك.", 78, C["gold"], alpha=a)
    draw_text(d, (W / 2, 1460), "العب واعرف مصر.", 46, C["teal"], alpha=a)

    aa = win(t, 28.0, 28.3, 30.1, 30.1)
    if aa > 0:
        d.rounded_rectangle(
            (270, 1580, W - 270, 1690),
            radius=55,
            fill=rgba(C["gold"], int(235 * aa)),
            outline=rgba(C["sand"], int(210 * aa)), width=3,
        )
        draw_text(d, (W / 2, 1635), "ابدأ رحلتك", 42, C["dark"], alpha=aa)

# ---------- FRAME ----------
def render_frame(t):
    im = BASE.copy()
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)

    draw_grid(d, t)
    draw_particles(d, t)

    scene_intro(d, t)
    scene_question(d, t)
    scene_fact(d, t)
    scene_levels(d, t)
    scene_duel(d, t)
    scene_leaderboard(d, t)
    scene_end(d, t)

    im = Image.alpha_composite(im, ov)
    return im

# ---------- AUDIO ----------
def synth_audio():
    sr = 44100
    n = int(sr * DUR)
    t = np.arange(n, dtype=np.float64) / sr
    audio = np.zeros(n, dtype=np.float64)

    for f, amp in [(73.42, 0.10), (110.0, 0.07), (146.83, 0.05)]:
        audio += amp * np.sin(2 * np.pi * f * t + 0.3 * np.sin(2 * np.pi * 0.08 * t))

    bpm = 90.0
    beat = 60.0 / bpm

    for b in range(int(DUR / beat) + 2):
        st = b * beat

        if b % 4 in (0, 2):
            dur = 0.24
            i0 = int(st * sr)
            i1 = min(n, i0 + int(dur * sr))
            if i1 > i0:
                tt = np.arange(i1 - i0) / sr
                env = np.exp(-tt * 18)
                audio[i0:i1] += 0.85 * np.sin(2 * np.pi * 55 * tt) * env

        if b % 4 in (1, 3):
            dur = 0.14
            i0 = int(st * sr)
            i1 = min(n, i0 + int(dur * sr))
            if i1 > i0:
                tt = np.arange(i1 - i0) / sr
                env = np.exp(-tt * 28)
                noise = np.random.uniform(-1, 1, i1 - i0)
                audio[i0:i1] += 0.28 * noise * env

        for h in (0.0, 0.5):
            st2 = st + h * beat
            if st2 < DUR:
                dur = 0.035
                i0 = int(st2 * sr)
                i1 = min(n, i0 + int(dur * sr))
                if i1 > i0:
                    tt = np.arange(i1 - i0) / sr
                    env = np.exp(-tt * 80)
                    noise = np.random.uniform(-1, 1, i1 - i0)
                    audio[i0:i1] += 0.05 * noise * env

    scale = [293.66, 311.13, 369.99, 392.00, 440.00, 466.16, 523.25]
    step = beat / 2.0

    for k in range(int(DUR / step) + 2):
        st = k * step
        dur = 0.24
        i0 = int(st * sr)
        i1 = min(n, i0 + int(dur * sr))
        if i1 > i0:
            tt = np.arange(i1 - i0) / sr
            f = scale[(k * 3) % len(scale)]
            env = np.exp(-tt * 7)
            lfo = 0.55 + 0.45 * np.sin(2 * np.pi * 0.22 * t[i0:i1])
            audio[i0:i1] += 0.10 * np.sin(2 * np.pi * f * tt) * env * lfo

    def tone(start, freq, dur, vol=0.4, decay=8.0, square=False):
        i0 = int(start * sr)
        i1 = min(n, i0 + int(dur * sr))
        if i1 <= i0:
            return
        tt = np.arange(i1 - i0) / sr
        sig = np.sign(np.sin(2 * np.pi * freq * tt)) if square else np.sin(2 * np.pi * freq * tt)
        env = np.exp(-tt * decay)
        audio[i0:i1] += vol * sig * env

    tone(0.15, 880, 0.55, 0.22, 7.0)
    tone(0.30, 1320, 0.35, 0.12, 10.0)

    for i in range(5):
        tone(4.5 + i, 1000, 0.08, 0.18, 20.0, square=True)

    tone(9.20, 880, 0.65, 0.26, 4.0)
    tone(9.35, 1320, 0.65, 0.18, 4.0)

    start = 13.0
    dur = 1.0
    i0 = int(start * sr)
    i1 = min(n, i0 + int(dur * sr))
    if i1 > i0:
        tt = np.arange(i1 - i0) / sr
        noise = np.random.uniform(-1, 1, i1 - i0)
        env = np.sin(np.pi * tt / dur) ** 2
        audio[i0:i1] += 0.18 * noise * env

    start = 27.0
    dur = 1.4
    i0 = int(start * sr)
    i1 = min(n, i0 + int(dur * sr))
    if i1 > i0:
        tt = np.arange(i1 - i0) / sr
        env = np.exp(-tt * 3.2)
        audio[i0:i1] += 0.45 * np.sin(2 * np.pi * 55 * tt) * env

    audio = np.tanh(audio * 1.2)
    mx = np.max(np.abs(audio)) or 1.0
    audio = audio / mx * 0.9
    stereo = np.stack([audio, audio], axis=1)
    pcm = (stereo * 32767).astype(np.int16)

    with wave.open(str(WAV), "w") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(pcm.tobytes())

    return WAV

# ---------- MAIN ----------
def main():
    print("1/2 توليد الصوت...")
    synth_audio()

    print("2/2 رندر الإطارات و MP4...")
    cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{W}x{H}",
        "-pix_fmt", "rgb24",
        "-r", str(FPS),
        "-i", "-",
        "-i", str(WAV),
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "-movflags", "+faststart",
        str(MP4),
    ]

    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    if proc.stdin is None:
        print("ffmpeg لم يبدأ. تأكد إن ffmpeg متثبت.")
        return

    for i in range(NF):
        t = i / FPS
        frame = render_frame(t)
        proc.stdin.write(frame.convert("RGB").tobytes())

        if i % 30 == 0:
            print(f"frame {i}/{NF}  t={t:.1f}s")

    proc.stdin.close()
    proc.wait()
    print(f"تم: {MP4}")

if __name__ == "__main__":
    main()