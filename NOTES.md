# 2026 Road Trip Journal — notes

A magazine-style trip journal for Joseph & Evangeline. Vanilla HTML/CSS/JS, no build.

## Run it
Preview server **`roadtrip`** (now a tiny Node server: `edit-server.js`) → http://localhost:4640
- **View** (what the public will see): http://localhost:4640
- **Edit:** http://localhost:4640/?edit=1

## ✍️ Editing (the `?edit=1` mode)
Open **localhost:4640/?edit=1** and you can:
- **Drag photos** to reorder within a day, or drag **across days** to move them.
- **✕** on a photo removes it from the journal. **◎** sets its crop — pick a focal point (3×3) or switch to “whole photo” (no crop). The first photo in a day is the **Feature** (the big one).
- Edit any **Title / Location / Date / body text / caption** by typing.
- Fix the **Cover** crop at the top (or tell Claude to change which photo is the cover).
- Hit **Save** — it writes straight into `data/trip.js`. A backup is saved to `data/_backups/` every time.

Reload the plain URL (no `?edit`) to see the real result. Leave structural stuff (route, day merges/splits, new media) to Claude.

## Files
| file | what |
|------|------|
| `index.html` | shell; loads `app.js` normally, `editor.js` when `?edit` |
| `styles.css` | the public site styling |
| `app.js` | renders the journal + the scroll route map |
| **`data/trip.js`** | the content (sections → media, text, crops). Editor writes this. |
| `data/route.js` | traced highway geometry (OSRM) |
| `media/` | web-ready JPGs + video posters + MP4s (generated) |
| `build-media.sh` | converts originals → `media/` (HEIC→JPG, MOV→MP4+poster) |
| `Photos:videos/` | the originals (untouched) |
| `edit-server.js` | local Node server: serves the site + `POST /api/save` |
| `editor.js` / `editor.css` | the edit overlay (only active with `?edit`) |

## 🌐 Going public (when editing is done — Claude does this)
1. Revert the `roadtrip` launch config back to python: `python3 -m http.server 4640 --directory "2026 ROAD TRIP"`.
2. Delete `edit-server.js`, `editor.js`, `editor.css`.
3. In `index.html`: remove the `editor.css` link and the `?edit` loader; load `app.js` directly.
4. Deploy the folder to a free static host (Netlify/Vercel/GitHub Pages) for a shareable link.

## Open TODO (with Evangeline)
- Day 7 — words + location. Day 6 — the full-hookup campground location.
- Re-add the 4 sideways photos once their rotation is fixed (`IMG_0732/0740/0745/0748`).
- General accuracy pass on text + which photos belong to which day.
