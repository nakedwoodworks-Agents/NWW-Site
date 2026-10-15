# Split tall screenshots into viewable tiles: mobile chunks side by side, desktop chunks stacked singly.
import sys, os
from PIL import Image
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tmp')
for f in sys.argv[1:]:
    im = Image.open(f).convert('RGB'); w, h = im.size
    base = os.path.splitext(os.path.basename(f))[0]
    if w <= 420:
        ch = 1300; cols = 4
        chunks = [im.crop((0, y, w, min(h, y + ch))) for y in range(0, h, ch)]
        for i in range(0, len(chunks), cols):
            grp = chunks[i:i + cols]
            sheet = Image.new('RGB', (cols * (w + 10), ch), 'white')
            for j, c in enumerate(grp): sheet.paste(c, (j * (w + 10), 0))
            p = f'{out}/{base}-{i//cols}.jpg'; sheet.save(p, quality=85); print(p)
    else:
        ch = 1500
        for i, y in enumerate(range(0, h, ch)):
            c = im.crop((0, y, w, min(h, y + ch))); p = f'{out}/{base}-{i}.jpg'; c.save(p, quality=85); print(p)
