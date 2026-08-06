# Open Graph card — `public/og.png`

`public/og.png` (1200×630, white background) is the social-share image referenced
from `src/app/layout.tsx` metadata. It's a **committed static PNG**, not generated
at runtime — Next's dynamic `next/og`/Satori route can't render on this Apple-Silicon
+ Rosetta dev box (its WASM rasterizer fails), and `sharp`'s prebuilt binary has no
text engine, so we render it in a real browser instead.

## To regenerate

1. Serve the font: `cp scripts/og/jost.ttf public/_ogfont.ttf` (temporary; the dev
   server must be running).
2. Open the site in a browser on the same origin (e.g. `http://localhost:3000/`).
3. In the devtools console, run the canvas script (loads `/_ogfont.ttf` as a
   `FontFace`, draws the 8-petal flower + "ATHENS / Holiday Market" wordmark with the
   logo's per-letter colors + tagline on white, then `canvas.toDataURL('image/png')`).
4. Decode the data URL to `public/og.png`.
5. Clean up: `rm public/_ogfont.ttf`.

`jost.ttf` is the Jost variable font (Google Fonts, OFL) kept here only to feed step 1.
