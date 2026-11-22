"""Draws batox-mobile's images in assets/images: the app icon (the BatoX Installer's pink B), the
Android adaptive and monochrome icons, the splash and the wordmark (the web panel's), and the sunset
backdrop (batox-theme's scene, cut for a phone held upright).

    python3 tools/render-assets.py

Reads BatoX, BatoX_Installer and batox-theme from the same folder as this repository, and needs
Google Chrome (the theme's renderer draws with it).
"""
import importlib.util, os, random, re, subprocess, sys, tempfile, zlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKSPACE = os.path.dirname(ROOT)
THEME = os.path.join(WORKSPACE, "batox-theme")
INST = os.path.join(WORKSPACE, "BatoX_Installer")
WEB = os.path.join(WORKSPACE, "BatoX", "internal", "web", "static", "img")
OUT = os.path.join(ROOT, "assets", "images")
WORK = tempfile.mkdtemp()
spec = importlib.util.spec_from_file_location("bg", os.path.join(THEME, "tools", "render-system-backgrounds.py"))
bg = importlib.util.module_from_spec(spec); sys.dont_write_bytecode = True; spec.loader.exec_module(bg)

def shot(name, body, w, h, scale=1, transparent=True, css=""):
    html = f"{WORK}/{name}.html"
    open(html, "w").write(f'<!doctype html><meta charset="utf-8"><style>html,body{{margin:0;width:{w}px;height:{h}px;overflow:hidden;background:transparent}}svg{{display:block}}{css}</style>{body}')
    args = [bg.chrome(), "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--force-device-scale-factor={scale}",
            f"--window-size={w},{h}", f"--screenshot={OUT}/{name}", "file://" + html]
    if transparent: args.insert(4, "--default-background-color=00000000")
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.remove(html)

icon = open(f"{INST}/build/icon.svg").read()
VIEW = "-257 -933 1234 1234"
inner = re.sub(r"<rect[^>]*/>", "", icon)
inner = inner[inner.index(">") + 1:inner.rindex("</svg>")]
def b_only(size, scale, fill=None):
    body = inner if not fill else re.sub(r'fill="url\(#pink\)"', f'fill="{fill}"', inner)
    s = size * scale
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}">'
            f'<svg x="{(size - s) / 2}" y="{(size - s) / 2}" width="{s}" height="{s}" viewBox="{VIEW}">{body}</svg></svg>')

# App icon: the B on the plate, full bleed (iOS wants no transparency; the system rounds it)
shot("icon.png", icon.replace('rx="272"', 'rx="0"').replace("<svg ", '<svg width="1024" height="1024" ', 1), 1024, 1024, transparent=False)
# iOS refuses an icon with an alpha channel: round-trip through JPEG to drop it
subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "100", f"{OUT}/icon.png", "--out", f"{WORK}/icon.jpg"], check=True, stdout=subprocess.DEVNULL)
subprocess.run(["sips", "-s", "format", "png", f"{WORK}/icon.jpg", "--out", f"{OUT}/icon.png"], check=True, stdout=subprocess.DEVNULL)
# Android adaptive icon: the B alone, inside the safe zone; the plate is the background color
shot("adaptive-icon.png", b_only(1024, .72), 1024, 1024)
shot("adaptive-icon-monochrome.png", b_only(1024, .72, "#FFFFFF"), 1024, 1024)
# Splash and in-app wordmark: the web panel's wordmark, on transparent
wm = open(f"{WEB}/wordmark.svg").read()
vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', wm).group(1).split()]
ratio = vb[3] / vb[2]
shot("wordmark.png", wm.replace("<svg ", f'<svg width="1024" height="{round(1024 * ratio)}" ', 1), 1024, round(1024 * ratio))
sq = wm.replace("<svg ", '<svg width="1024" height="1024" preserveAspectRatio="xMidYMid meet" ', 1)
shot("splash.png", sq, 1024, 1024)
# Favicon for the web build
shot("favicon.png", icon.replace("<svg ", '<svg width="48" height="48" ', 1), 48, 48)

# The sunset scene for a phone held upright: dark at the top for the name, dark at the bottom for the buttons
page = bg.Page()
bg.scene(page, bg.MOODS["vice"], random.Random(zlib.crc32(b"batox-web")), centered=True)
veil = page.gradient([(0, bg.NAVY, .86), (.22, bg.NAVY, .5), (.42, bg.NAVY, .05), (.62, bg.NAVY, .2), (.8, bg.NAVY, .75), (1, bg.NAVY, .94)])
page.add(f'<rect width="{bg.W}" height="{bg.H}" fill="{veil}"/>'
         f'<rect width="{bg.W}" height="{bg.H}" filter="url(#grain)" opacity=".06" style="mix-blend-mode:overlay"/>')
w, h = 430, 932
sw = h * bg.W / bg.H
shot("backdrop.png", f'<div style="position:absolute;left:{(w - sw) / 2}px;top:0;width:{sw}px;height:{h}px">{page.svg().replace("<svg ", "<svg style=\"width:100%;height:100%\" ", 1)}</div>',
     w, h, scale=3, transparent=False)
subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "82", f"{OUT}/backdrop.png", "--out", f"{OUT}/backdrop.jpg"], check=True, stdout=subprocess.DEVNULL)
os.remove(f"{OUT}/backdrop.png")
for f in sorted(os.listdir(OUT)):
    print(f, os.path.getsize(f"{OUT}/{f}") >> 10, "KB")
