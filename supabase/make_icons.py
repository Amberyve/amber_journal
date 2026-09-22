from PIL import Image, ImageDraw, ImageFont
import math, os

FOREST = (40, 51, 31)
AMBER = (200, 143, 62)
CREAM = (247, 240, 229)
OUT = "public"
os.makedirs(OUT, exist_ok=True)


def cup(d, cx, cy, s, color, lw):
    top_w, bot_w, h = s * 1.0, s * 0.68, s * 0.78
    tl = (cx - top_w / 2, cy - h / 2)
    tr = (cx + top_w / 2, cy - h / 2)
    bl = (cx - bot_w / 2, cy + h / 2)
    br = (cx + bot_w / 2, cy + h / 2)
    d.line([tl, bl], fill=color, width=lw)
    d.line([tr, br], fill=color, width=lw)
    d.ellipse([tl[0], tl[1] - s * 0.09, tr[0], tl[1] + s * 0.09], outline=color, width=lw)
    d.arc([bl[0], bl[1] - s * 0.10, br[0], br[1] + s * 0.10], 0, 180, fill=color, width=lw)
    hx = cx + top_w / 2
    d.arc([hx - s * 0.10, cy - s * 0.26, hx + s * 0.34, cy + s * 0.20], 290, 70, fill=color, width=lw)
    sy = cy + h / 2 + s * 0.20
    d.arc([cx - s * 0.86, sy - s * 0.13, cx + s * 0.86, sy + s * 0.19], 0, 180, fill=color, width=lw)
    for k, off in enumerate((-s * 0.26, 0, s * 0.26)):
        pts = []
        top = cy - h / 2 - s * 0.20
        length = s * (0.40 if k != 1 else 0.52)
        for i in range(31):
            t = i / 30
            pts.append((cx + off + s * 0.075 * math.sin(t * math.pi * 2.1 + k), top - length * t))
        d.line(pts, fill=color, width=max(2, lw - 2), joint="curve")


def make(size, maskable=False, bg=FOREST):
    img = Image.new("RGB", (size, size), bg)
    d = ImageDraw.Draw(img)
    # maskable icons get a safe zone: keep art inside the middle 80%
    scale = 0.42 if maskable else 0.54
    cup(d, size / 2, size * 0.46, size * scale, AMBER, max(3, int(size * 0.028)))
    return img


make(192).save(f"{OUT}/icon-192.png")
make(512).save(f"{OUT}/icon-512.png")
make(512, maskable=True).save(f"{OUT}/icon-512-maskable.png")
make(180).save(f"{OUT}/apple-touch-icon.png")

# favicon
fav = make(64)
fav.save(f"{OUT}/favicon.png")

print("icons written:", os.listdir(OUT))
