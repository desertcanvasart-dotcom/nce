"""PAGE-107: turn the operator screenshots (scripts/operator-shots.ts) into the page's WebP files.

    /usr/local/bin/python3 -I scripts/operator-shots.py .shots public/images/operators

Each image is at most 1200 px wide and 1500 px tall (a tall page is cut at the bottom), then saved as WebP. Prints each
file's size for src/content/operator-connect.ts.
"""
import json
import os
import sys

from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
sizes = {}
for name in sorted(os.listdir(src)):
    if not name.endswith(".png"):
        continue
    im = Image.open(os.path.join(src, name)).convert("RGB")
    if im.width > 1200:
        im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
    if im.height > 1500:
        im = im.crop((0, 0, im.width, 1500))
    out = os.path.join(dst, name[:-4] + ".webp")
    im.save(out, "WEBP", quality=80, method=6)
    sizes[name[:-4]] = {"width": im.width, "height": im.height, "kb": round(os.path.getsize(out) / 1024)}
print(json.dumps(sizes, indent=1))
