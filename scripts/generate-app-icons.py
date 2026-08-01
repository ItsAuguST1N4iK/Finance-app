from PIL import Image, ImageDraw
import os

OUT = r"assets/icons"
os.makedirs(OUT, exist_ok=True)
SIZE = 1024

ACCENTS = {
  "blue": "#3b82f6",
  "violet": "#8b5cf6",
  "cyan": "#06b6d4",
  "emerald": "#10b981",
  "amber": "#f59e0b",
  "red": "#ef4444",
  "pink": "#ec4899",
  "orange": "#f97316",
  "teal": "#14b8a6",
  "indigo": "#6366f1",
  "lime": "#84cc16",
  "rose": "#e11d48",
  "purple": "#a855f7",
  "sky": "#0ea5e9",
}

def hex_rgb(h: str):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def draw_glyph(draw: ImageDraw.ImageDraw, cx: int, cy: int, scale: float, fill):
    """Rising bars + spark — Finance Control mark."""
    bar_w = int(90 * scale)
    gap = int(36 * scale)
    heights = [int(170 * scale), int(260 * scale), int(360 * scale)]
    total_w = 3 * bar_w + 2 * gap
    x0 = cx - total_w // 2
    base_y = cy + int(140 * scale)
    radius = max(12, int(22 * scale))
    for i, h in enumerate(heights):
        x = x0 + i * (bar_w + gap)
        y = base_y - h
        draw.rounded_rectangle([x, y, x + bar_w, base_y], radius=radius, fill=fill)
    tip_x = x0 + 2 * (bar_w + gap) + bar_w // 2
    tip_y = base_y - heights[2] - int(48 * scale)
    s = int(42 * scale)
    draw.polygon([
        (tip_x, tip_y - s),
        (tip_x + s, tip_y + s // 2),
        (tip_x + s // 3, tip_y + s // 2),
        (tip_x + s // 3, tip_y + s),
        (tip_x - s // 3, tip_y + s),
        (tip_x - s // 3, tip_y + s // 2),
        (tip_x - s, tip_y + s // 2),
    ], fill=fill)

def make_foreground(fill=(255, 255, 255, 255)):
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_glyph(d, SIZE // 2, SIZE // 2 - 20, 1.0, fill)
    return img

def make_full(bg_hex: str, glyph_rgba=(255, 255, 255, 255)):
    bg = hex_rgb(bg_hex) + (255,)
    img = Image.new("RGBA", (SIZE, SIZE), bg)
    plate = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    pd = ImageDraw.Draw(plate)
    margin = int(SIZE * 0.08)
    pd.rounded_rectangle(
        [margin, margin, SIZE - margin, SIZE - margin],
        radius=int(SIZE * 0.22),
        fill=(15, 23, 42, 40),
    )
    img = Image.alpha_composite(img, plate)
    img = Image.alpha_composite(img, make_foreground(glyph_rgba))
    return img.convert("RGB")

def main():
    fg = make_foreground((255, 255, 255, 255))
    fg.save(os.path.join(OUT, "fg.png"))
    fg.save(r"assets/adaptive-icon.png")

    make_full("#3b82f6").save(r"assets/icon.png")

    for name, hexv in ACCENTS.items():
        make_full(hexv).save(os.path.join(OUT, f"{name}.png"))

    splash = Image.new("RGB", (SIZE, SIZE), hex_rgb("#0f172a"))
    sd = ImageDraw.Draw(splash)
    draw_glyph(sd, SIZE // 2, SIZE // 2 - 20, 1.05, hex_rgb("#3b82f6"))
    splash.save(r"assets/splash.png")

    notif = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    nd = ImageDraw.Draw(notif)
    for b in [(22, 38, 34, 72), (40, 28, 52, 72), (58, 16, 70, 72)]:
        nd.rounded_rectangle(list(b), radius=3, fill=(255, 255, 255, 255))
    notif.save(r"assets/notification-icon.png")

    print("ok", len(ACCENTS), "accents")

if __name__ == "__main__":
    main()
