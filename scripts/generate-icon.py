# -*- coding: utf-8 -*-
"""Git Switch 品牌图标生成脚本（PIL，super-sampling 抗锯齿）。

产出:
  build/icon.png          512x512 应用图标
  build/icon.ico          16~256 多尺寸 Windows 图标（electron-builder / exe）
  build/tray.png          32x32 托盘图标（透明底，品牌菱形+箭头）
"""
import base64
import io
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
SS = 2048  # super-sampling 画布（4x 512），缩放后边缘平滑
K = SS // 512  # 坐标放大系数

# 品牌色（与 UI 主题一致）
BG_TOP = (15, 27, 46)      # #0F1B2E
BG_BOT = (30, 43, 69)      # #1E2B45
DIA_TOP = (59, 130, 246)   # #3B82F6
DIA_BOT = (6, 182, 212)    # #06B6D4
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


def diamond(scale=1):
    """菱形顶点（中心 256,256，半对角线 156），坐标 * scale。"""
    c = 256 * scale
    h = 156 * scale
    return [(c, c - h), (c + h, c), (c, c + h), (c - h, c)]


def draw_full(ss=SS):
    """完整图标（深蓝圆角底 + 渐变菱形 + 切换箭头），画布 ss。"""
    img = Image.new("RGBA", (ss, ss), (0, 0, 0, 0))
    # 背景渐变 + 圆角矩形
    bg = vgrad((ss, ss), BG_TOP, BG_BOT)
    mask = Image.new("L", (ss, ss), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, ss - 1, ss - 1], radius=112 * ss // 512, fill=255)
    img.paste(bg, (0, 0), mask)
    d = ImageDraw.Draw(img)
    # 内描边（玻璃高光）
    d.rounded_rectangle(
        [8 * ss // 512, 8 * ss // 512, ss - 1 - 8 * ss // 512, ss - 1 - 8 * ss // 512],
        radius=104 * ss // 512,
        outline=(255, 255, 255, 26),
        width=max(1, 6 * ss // 512),
    )
    # 菱形（渐变）
    dia = Image.new("RGBA", (ss, ss), (0, 0, 0, 0))
    ImageDraw.Draw(dia).polygon(diamond(ss / 512), fill=(255, 255, 255, 255))
    grad = vgrad((ss, ss), DIA_TOP, DIA_BOT)
    dgrad = Image.new("RGBA", (ss, ss), (0, 0, 0, 0))
    dgrad.paste(grad, (0, 0), dia.split()[3])
    img.alpha_composite(dgrad)
    # 菱形描边
    ImageDraw.Draw(img).polygon(
        diamond(ss / 512), outline=(255, 255, 255, 72), width=max(1, 8 * ss // 512)
    )
    # 切换箭头（左半区朝右 = 实心目标；右半区朝左 = 半透明来源；中线竖条分隔）
    k = ss / 512
    right = [(168, 238), (228, 238), (228, 226), (252, 256), (228, 286), (228, 274), (168, 274)]
    left = [(344, 238), (284, 238), (284, 226), (260, 256), (284, 286), (284, 274), (344, 274)]
    d = ImageDraw.Draw(img)
    d.polygon([(int(x * k), int(y * k)) for x, y in right], fill=WHITE)
    d.polygon([(int(x * k), int(y * k)) for x, y in left], fill=(255, 255, 255, 130))
    # 中线竖条（分隔两个方向，强调“切换”）
    d.rectangle([int(250.5 * k), int(196 * k), int(261.5 * k), int(316 * k)], fill=(255, 255, 255, 96))
    return img


def draw_tray(ss=SS):
    """托盘图标：透明底 + 渐变菱形 + 箭头（无背景方块，小尺寸可辨识）。"""
    img = Image.new("RGBA", (ss, ss), (0, 0, 0, 0))
    dia = Image.new("RGBA", (ss, ss), (0, 0, 0, 0))
    ImageDraw.Draw(dia).polygon(diamond(ss / 512), fill=(255, 255, 255, 255))
    grad = vgrad((ss, ss), DIA_TOP, DIA_BOT)
    dgrad = Image.new("RGBA", (ss, ss), (0, 0, 0, 0))
    dgrad.paste(grad, (0, 0), dia.split()[3])
    img.alpha_composite(dgrad)
    ImageDraw.Draw(img).polygon(
        diamond(ss / 512), outline=(255, 255, 255, 80), width=max(1, 6 * ss // 512)
    )
    # 切换箭头（与 draw_full 一致：中线分隔 + 左右半区箭头）
    k = ss / 512
    right = [(168, 238), (228, 238), (228, 226), (252, 256), (228, 286), (228, 274), (168, 274)]
    left = [(344, 238), (284, 238), (284, 226), (260, 256), (284, 286), (284, 274), (344, 274)]
    d = ImageDraw.Draw(img)
    d.polygon([(int(x * k), int(y * k)) for x, y in right], fill=WHITE)
    d.polygon([(int(x * k), int(y * k)) for x, y in left], fill=(255, 255, 255, 130))
    d.rectangle([int(250.5 * k), int(196 * k), int(261.5 * k), int(316 * k)], fill=(255, 255, 255, 96))
    return img


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
