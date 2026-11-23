"""Draws the Google Play listing's images in store/android: the 512 × 512 icon and the 1024 × 500
feature graphic (batox-theme's sunset scene, as on the welcome screen, with the web panel's
wordmark and the app's line).

    python3 tools/render-store.py

Reads BatoX and batox-theme from the same folder as this repository, and needs Google Chrome. The
phone screenshots are taken from the app itself (see docs/google-play.md).
"""
import importlib.util, os, random, re, subprocess, sys, tempfile, zlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKSPACE = os.path.dirname(ROOT)
THEME = os.path.join(WORKSPACE, "batox-theme")
WEB = os.path.join(WORKSPACE, "BatoX", "internal", "web", "static", "img")
FONT = os.path.join(ROOT, "node_modules", "@expo-google-fonts", "inter", "400Regular", "Inter_400Regular.ttf")
OUT = os.path.join(ROOT, "store", "android")
WORK = tempfile.mkdtemp()
os.makedirs(OUT, exist_ok=True)
spec = importlib.util.spec_from_file_location("bg", os.path.join(THEME, "tools", "render-system-backgrounds.py"))
bg = importlib.util.module_from_spec(spec); sys.dont_write_bytecode = True; spec.loader.exec_module(bg)

def shot(name, body, w, h, css=""):
    html = f"{WORK}/{name}.html"
    open(html, "w").write(f'<!doctype html><meta charset="utf-8"><style>@font-face{{font-family:Inter;src:url("file://{FONT}")}}'
                          f'html,body{{margin:0;width:{w}px;height:{h}px;overflow:hidden}}svg{{display:block}}{css}</style>{body}')
    subprocess.run([bg.chrome(), "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                    f"--window-size={w},{h}", f"--screenshot={OUT}/{name}", "file://" + html],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.remove(html)

# Icon: the app's icon, scaled down (Play rounds and shadows it itself)
subprocess.run(["sips", "-z", "512", "512", os.path.join(ROOT, "assets", "images", "icon.png"), "--out", f"{OUT}/icon-512.png"],
               check=True, stdout=subprocess.DEVNULL)

# Feature graphic: the scene the welcome screen uses (same mood and seed), darker on the left for the
# wordmark and the line; Play may crop its edges, so they stay inside the middle
page = bg.Page()
bg.scene(page, bg.MOODS["vice"], random.Random(zlib.crc32(b"batox-web")), centered=True)
veil = page.gradient([(0, bg.NAVY, .94), (.3, bg.NAVY, .82), (.55, bg.NAVY, .2), (.75, bg.NAVY, 0), (1, bg.NAVY, .1)], x1=0, y1=0, x2=1, y2=0)
page.add(f'<rect width="{bg.W}" height="{bg.H}" fill="{veil}"/>')
W, H = 1024, 500
sh = W * bg.H / bg.W  # at full width the scene is a little taller than the graphic: its top is cut
wm = open(f"{WEB}/wordmark.svg").read()
wm = wm.replace("<svg ", '<svg style="width:400px;height:auto;display:block" ', 1)
body = (f'<div style="position:absolute;left:0;top:{H - sh}px;width:{W}px;height:{sh}px">'
        f'{page.svg().replace("<svg ", "<svg style=\"width:100%;height:100%\" ", 1)}</div>'
        f'<div style="position:absolute;left:96px;top:0;height:{H}px;display:flex;flex-direction:column;justify-content:center;gap:18px;text-shadow:0 2px 12px #050B1A">'
        f'{wm}<div style="font:400 30px Inter;color:#D9D4F0;letter-spacing:.2px">Your Batocera, from your phone.</div></div>')
shot("feature-graphic.png", body, W, H)
# Play wants a JPEG or a 24-bit PNG: drop the alpha channel
subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "92", f"{OUT}/feature-graphic.png", "--out", f"{OUT}/feature-graphic.jpg"],
               check=True, stdout=subprocess.DEVNULL)
os.remove(f"{OUT}/feature-graphic.png")
for f in sorted(os.listdir(OUT)):
    print(f, os.path.getsize(f"{OUT}/{f}") >> 10, "KB")
