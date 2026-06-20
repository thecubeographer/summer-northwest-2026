#!/bin/bash
# Converts originals in "Photos:videos" (incl. subfolders) into web files in media/.
#  - HEIC/JPEG/TIFF -> resized JPG
#  - MOV/MP4        -> poster JPG (first frame) + universal MP4 (H.264) via ffmpeg
# Incremental: skips anything already built, so re-runs are fast. Originals never modified.
set -u
PROJ="/Users/josephmiser/Documents/CLAUDE CODE/2026 ROAD TRIP"
SRC="$PROJ/Photos:videos"
MEDIA="$PROJ/media"
TMP="$MEDIA/.tmp"
mkdir -p "$MEDIA" "$TMP"
have_ff=0; command -v ffmpeg >/dev/null 2>&1 && have_ff=1

photos=0; videos=0; mp4=0; new=0
while IFS= read -r -d '' f; do
  name="$(basename "$f")"
  [ "$name" = ".DS_Store" ] && continue
  base="${name%.*}"
  ext="$(echo "${name##*.}" | tr '[:upper:]' '[:lower:]')"
  case "$ext" in
    heic|jpeg|jpg|png|tif|tiff)
      if [ -f "$MEDIA/$base.jpg" ]; then photos=$((photos+1))
      else sips -s format jpeg -Z 2200 "$f" --out "$MEDIA/$base.jpg" >/dev/null 2>&1 && { photos=$((photos+1)); new=$((new+1)); }
      fi
      ;;
    mov|mp4|m4v)
      if [ ! -f "$MEDIA/$base.poster.jpg" ]; then
        qlmanage -t -s 1600 -o "$TMP" "$f" >/dev/null 2>&1 || true
        [ -f "$TMP/$name.png" ] && sips -s format jpeg -Z 1600 "$TMP/$name.png" --out "$MEDIA/$base.poster.jpg" >/dev/null 2>&1
      fi
      if [ -f "$MEDIA/$base.mp4" ] && [ "$(stat -f%z "$MEDIA/$base.mp4" 2>/dev/null)" -gt 50000 ]; then mp4=$((mp4+1))
      elif [ "$have_ff" = 1 ]; then
        # "file:" prefix: the source dir name has a colon (ffmpeg would read it as a protocol).
        # VideoToolbox = Mac hardware encode/decode; it fails intermittently back-to-back, so retry.
        for try in 1 2 3; do
          ffmpeg -y -hwaccel videotoolbox -i "file:$f" -vf "scale='min(1280,iw)':-2" \
                 -c:v h264_videotoolbox -b:v 4M -c:a aac -b:a 128k -movflags +faststart "$MEDIA/$base.mp4" >/dev/null 2>&1 && { mp4=$((mp4+1)); new=$((new+1)); break; }
        done
      else ln -sf "$f" "$MEDIA/$base.mov"
      fi
      videos=$((videos+1))
      ;;
  esac
done < <(find "$SRC" -type f -print0)
rm -rf "$TMP"
echo "photos: $photos  videos: $videos  mp4: $mp4  new this run: $new  ffmpeg: $have_ff  -> $MEDIA"
