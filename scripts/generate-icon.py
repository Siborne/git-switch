# -*- coding: utf-8 -*-
"""Git Switch 品牌图标生成脚本（PIL，super-sampling 抗锯齿）。

v2 设计：青蓝渐变圆角底 + 白色一体式双向箭头 + 中央刻入式 Git 菱形。

产出:
  build/icon.png          512x512 应用图标
  build/icon.ico          16~256 多尺寸 Windows 图标（electron-builder / exe）
  build/tray.png          32x32 托盘图标（同 v2 设计，带底）
"""
import base64
import io
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
SS = 2048  # super-sampling 画布（4x 512），缩放后边缘平滑

# 品牌色（与 UI 主题一致）
BG_TOP = (59, 130, 246)  # #3B82F6 底渐变上
BG_BOT = (6, 182, 212)   # #06B6D4 底渐变下
DIA_CUT = (13, 21, 38)   # #0D1526 菱形孔（深蓝，与 UI 底色同系）
WHITE = (255, 255, 255, 255)


def lerp(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def vgrad(size, c1, c2):
    """垂直渐变图（不透明）。"""
    w, h = size
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for y in range(h):
        d.line([(0, y), (w, y)], fill=lerp(c1, c2, y / (h - 1)) + (255,))
    return img


def draw_full(ss=SS):
    """v2：青蓝渐变圆角底 + 白色一体式双向箭头 + 中央刻入式菱形。"""
    k = ss / 512
    img = Image.new("RGBA", (ss, ss), (0, 0, 0, 0))
    bg = vgrad((ss, ss), BG_TOP, BG_BOT)
    mask = Image.new("L", (ss, ss), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, ss - 1, ss - 1], radius=112 * k, fill=255)
    img.paste(bg, (0, 0), mask)
    d = ImageDraw.Draw(img)
    # 内高光
    d.rounded_rectangle(
        [10 * k, 10 * k, ss - 1 - 10 * k, ss - 1 - 10 * k],
        radius=102 * k,
        outline=(255, 255, 255, 40),
        width=max(1, int(5 * k)),
    )
    # 白色一体式双向箭头
    d.rounded_rectangle([140 * k, 228 * k, 372 * k, 284 * k], radius=28 * k, fill=WHITE)
    d.polygon([(216 * k, 216 * k), (216 * k, 296 * k), (120 * k, 256 * k)], fill=WHITE)
    d.polygon([(296 * k, 216 * k), (296 * k, 296 * k), (392 * k, 256 * k)], fill=WHITE)
    # 中央刻入式 Git 菱形
    d.polygon(
        [(256 * k, 232 * k), (280 * k, 256 * k), (256 * k, 280 * k), (232 * k, 256 * k)],
        fill=DIA_CUT,
    )
    return img


def draw_tray(ss=SS):
    """托盘：同 v2 设计（带渐变底，小尺寸可辨识）。"""
    return draw_full(ss)


def main():
    BUILD.mkdir(exist_ok=True)
    full = draw_full().resize((512, 512), Image.LANCZOS)
    full.save(BUILD / "icon.png")
    # 多尺寸 ICO（PIL 从 512 主图自动重采样生成各档）
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    full.save(BUILD / "icon.ico", format="ICO", sizes=ico_sizes)
    # 托盘
    tray = draw_tray().resize((32, 32), Image.LANCZOS)
    tray.save(BUILD / "tray.png")
    # 托盘 base64（嵌入 tray.ts 用，16px 主图）
    tray16 = draw_tray().resize((16, 16), Image.LANCZOS)
    buf = io.BytesIO()
    tray16.save(buf, format="PNG")
    print("TRAY_BASE64=" + base64.b64encode(buf.getvalue()).decode())
    print("OK: icon.png / icon.ico / tray.png ->", BUILD)


if __name__ == "__main__":
    main()
