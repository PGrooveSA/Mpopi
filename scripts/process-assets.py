"""Builds brand assets (logo, prints, favicon) and retouches the lookbook photos.

Run from the project root:  python scripts/process-assets.py
Sources live in assets-src/, output goes to public/.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter, ImageOps
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src"
PUB = ROOT / "public"

LOGO_FONT = SRC / "fonts" / "logo-subset.ttf"     # embedded in MPOPI LOGO.pdf
SCRIPT_FONT = SRC / "fonts" / "PlayfairItalic.ttf"  # OFL, stand-in for the Hiswona script

# Glyph origins measured from the logo PDF (points, baseline 173.5, size 70)
GLYPHS = [("M", 62.13), ("P", 120.15), ("P", 228.10), ("I", 274.09), (".", 313.07), (".", 332.32), (".", 351.57)]
BASELINE = 173.5
BEAR_BOX = (158.14, 114.54, 229.39, 191.79)


def trim(img: Image.Image, pad: int = 0) -> Image.Image:
    box = img.getchannel("A").getbbox()
    img = img.crop(box)
    if pad:
        canvas = Image.new("RGBA", (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
        canvas.paste(img, (pad, pad), img)
        img = canvas
    return img


def mpopi_wordmark(color: str, k: float = 10.0) -> Image.Image:
    font = ImageFont.truetype(str(LOGO_FONT), int(70 * k))
    canvas = Image.new("RGBA", (int(400 * k), int(260 * k)), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    for ch, x in GLYPHS:
        draw.text((x * k, BASELINE * k), ch, font=font, fill=color, anchor="ls")
    bear = Image.open(SRC / "bear.png").convert("RGBA")
    bw, bh = int((BEAR_BOX[2] - BEAR_BOX[0]) * k), int((BEAR_BOX[3] - BEAR_BOX[1]) * k)
    bear = bear.resize((bw, bh), Image.LANCZOS)
    canvas.alpha_composite(bear, (int(BEAR_BOX[0] * k), int(BEAR_BOX[1] * k)))
    return trim(canvas, pad=int(4 * k))


def hiswona_wordmark(color: str, size: int = 520) -> Image.Image:
    font = ImageFont.truetype(str(SCRIPT_FONT), size)
    try:
        font.set_variation_by_axes([800])
    except Exception:
        pass
    w = int(size * 5)
    canvas = Image.new("RGBA", (w, int(size * 2.2)), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.text((w / 2, size * 1.05), "Hiswona", font=font, fill=color, anchor="ms")
    r = size * 0.055
    cy = size * 1.42
    for i in (-1, 0, 1):
        cx = w / 2 + i * r * 3.2
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color)
    # subtle embroidery texture: fine diagonal thread lines inside the letters
    alpha = canvas.getchannel("A")
    lines = Image.new("L", canvas.size, 0)
    ld = ImageDraw.Draw(lines)
    step = max(6, size // 60)
    for x in range(-canvas.height, canvas.width, step):
        ld.line((x, 0, x + canvas.height, canvas.height), fill=38, width=max(1, step // 3))
    shade = Image.new("RGBA", canvas.size, (0, 0, 0, 255))
    shade.putalpha(Image.fromarray(np.minimum(np.array(lines), np.array(alpha)).astype("uint8")))
    canvas.alpha_composite(shade)
    return trim(canvas, pad=size // 10)


def save_png(img: Image.Image, path: Path, max_w: int):
    if img.width > max_w:
        img = img.resize((max_w, int(img.height * max_w / img.width)), Image.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)
    print("wrote", path.relative_to(ROOT), img.size)


def brand():
    save_png(mpopi_wordmark("#FFA2C0"), PUB / "brand" / "logo.png", 1600)
    save_png(trim(Image.open(SRC / "bear.png").convert("RGBA")), PUB / "brand" / "bear.png", 600)
    # prints used on the t-shirt mockups and in the 3D fitting room
    save_png(mpopi_wordmark("#F0609A"), PUB / "prints" / "mpopi-hot.png", 1400)
    save_png(mpopi_wordmark("#FFA2C0"), PUB / "prints" / "mpopi-soft.png", 1400)
    save_png(hiswona_wordmark("#5B2C1F"), PUB / "prints" / "hiswona-brown.png", 1200)
    save_png(hiswona_wordmark("#F6EADB"), PUB / "prints" / "hiswona-cream.png", 1200)
    # favicon / app icon: bear on a soft glass tile
    bear = trim(Image.open(SRC / "bear.png").convert("RGBA"))
    icon = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    tile = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    ImageDraw.Draw(tile).rounded_rectangle((0, 0, 511, 511), radius=120, fill=(255, 238, 244, 255))
    icon.alpha_composite(tile)
    bear.thumbnail((400, 400), Image.LANCZOS)
    icon.alpha_composite(bear, ((512 - bear.width) // 2, (512 - bear.height) // 2 + 6))
    (ROOT / "app").mkdir(exist_ok=True)
    icon.save(ROOT / "app" / "icon.png")
    icon.resize((180, 180), Image.LANCZOS).save(ROOT / "app" / "apple-icon.png")
    print("wrote app/icon.png")


# ---------------------------------------------------------------- photos
def white_balance(img: Image.Image, strength: float) -> Image.Image:
    a = np.asarray(img).astype(np.float32)
    lum = a.mean(axis=2)
    mask = lum >= np.percentile(lum, 92)
    ref = a[mask].mean(axis=0)
    gain = ref.mean() / np.maximum(ref, 1)
    gain = 1 + (gain - 1) * strength
    return Image.fromarray(np.clip(a * gain, 0, 255).astype("uint8"))


def tone(img: Image.Image, lift: float = 8, gamma: float = 0.95) -> Image.Image:
    """Soft matte curve: lifts deep blacks a touch and opens the mid-tones."""
    x = np.arange(256, dtype=np.float32) / 255
    y = lift / 255 + (1 - lift / 255) * np.power(x, gamma)
    lut = np.clip(y * 255, 0, 255).astype("uint8").tolist()
    return img.point(lut * 3)


def crop_ratio(img: Image.Image, ratio: float, focus_y: float = 0.4) -> Image.Image:
    w, h = img.size
    if w / h > ratio:
        nw = int(h * ratio)
        x = (w - nw) // 2
        return img.crop((x, 0, x + nw, h))
    nh = int(w / ratio)
    y = int((h - nh) * focus_y)
    return img.crop((0, y, w, y + nh))


PHOTOS = {
    # name: (source, ratio, focus_y, wb, brightness, saturation, contrast)
    "look-white-set": ("1.jpg", 4 / 5, 0.25, 0.5, 1.04, 0.95, 1.04),
    "flat-brown-tee": ("2.jpg", 4 / 5, 0.55, 0.3, 1.28, 0.98, 1.08),
    "packaging": ("3.jpg", 4 / 3, 0.5, 1.0, 1.10, 0.92, 1.05),
    "stack": ("4.jpg", 4 / 3, 0.5, 1.0, 1.10, 0.92, 1.05),
    "hiswona-him": ("5.jpg", 4 / 5, 0.15, 0.4, 1.03, 0.95, 1.04),
    "hiswona-her": ("6.jpg", 4 / 5, 0.25, 0.6, 1.03, 0.95, 1.03),
    "mpopi-cafe": ("7.jpg", 4 / 5, 0.2, 0.4, 1.02, 0.95, 1.04),
    "mpopi-tank": ("8.jpg", 4 / 5, 0.2, 0.5, 1.04, 0.96, 1.04),
}


def photos():
    for name, (src, ratio, fy, wb, bright, sat, con) in PHOTOS.items():
        img = Image.open(SRC / "photos" / src).convert("RGB")
        img = crop_ratio(img, ratio, fy)
        img = white_balance(img, wb)
        img = tone(img)
        img = ImageEnhance.Brightness(img).enhance(bright)
        img = ImageEnhance.Contrast(img).enhance(con)
        img = ImageEnhance.Color(img).enhance(sat)
        img = img.filter(ImageFilter.UnsharpMask(radius=1.6, percent=60, threshold=2))
        out = PUB / "photos" / f"{name}.webp"
        img.save(out, "WEBP", quality=84, method=6)
        print("wrote", out.relative_to(ROOT), img.size)


if __name__ == "__main__":
    brand()
    photos()
