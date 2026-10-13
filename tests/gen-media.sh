#!/usr/bin/env bash
# Regenerates the test audio in tests/media (needs ffmpeg + python3). Files are git-ignored.
set -e; cd "$(dirname "$0")"; rm -rf media; mkdir -p media && cd media
q(){ ffmpeg -loglevel error -y "$@"; }
mk(){ q -f lavfi -i "sine=frequency=$1:duration=$2" "${@:3}"; }
q -f lavfi -i "testsrc=size=300x300:rate=1" -frames:v 1 c1.jpg; q -f lavfi -i "mandelbrot=size=300x300:rate=1" -frames:v 1 c2.jpg
S="Sample Music"; mkdir -p "$S/Album One" "$S/Night Drive" "$S/Untagged Folder" "$S/Discovery"
mk 440 6 -i c1.jpg -map 0 -map 1 -c:v mjpeg -c:a libmp3lame -id3v2_version 3 -metadata title="Sunrise Theme" -metadata artist="The Testers" -metadata album="Album One" -metadata track=2 "$S/Album One/02 b.mp3"
mk 550 5 -i c1.jpg -map 0 -map 1 -c:v mjpeg -c:a libmp3lame -id3v2_version 3 -metadata title="Ünïcode Opening" -metadata artist="The Testers" -metadata album="Album One" -metadata track=1/9 "$S/Album One/01 a.mp3"
mk 330 7 -i c2.jpg -map 0 -map 1 -c:v mjpeg -c:a libmp3lame -id3v2_version 4 -metadata title="Highway Lights" -metadata artist="Neon Grid" -metadata album="Night Drive" -metadata track=1 "$S/Night Drive/track.mp3"
mk 220 4 -c:a libmp3lame -id3v2_version 3 -metadata title="Second Exit" -metadata artist="Neon Grid" -metadata album="Night Drive" -metadata track=2 "$S/Night Drive/zz.mp3"
mk 660 3 -c:a libmp3lame -id3v2_version 0 -write_id3v1 0 -map_metadata -1 "$S/Untagged Folder/10 Tenth Song.mp3"
mk 770 3 "$S/Untagged Folder/2 Second Song.wav"
for i in 1 2; do mk $((300+i*50)) 4 -c:a libmp3lame -id3v2_version 3 -metadata title="Track $i" -metadata artist="Daft Punk" -metadata album="Discovery" -metadata track=$i "$S/Discovery/0$i.mp3"; done
mk 500 4 -c:a libmp3lame -id3v2_version 3 -metadata title="Airbag" -metadata artist="Radiohead" -metadata album="OK Computer" -metadata track=1 "$S/Discovery/rh.mp3"
echo notes > "$S/Album One/cover.txt"
mk 880 2 -c:a libmp3lame -id3v2_version 0 -write_id3v1 0 -map_metadata -1 v1only.mp3
python3 -c "
f=lambda s,n:s.encode('latin1').ljust(n,b'\0')
open('v1only.mp3','ab').write(b'TAG'+f('V1 Only',30)+f('Old School',30)+f('Legacy',30)+b'1999'+f('',28)+b'\0\x05\x0c')"
# Flxweroff variants
F=flx/Music; mkdir -p "$F/Flxweroff - Something (2021)" "$F/Tagged"
mk 300 3 -c:a libmp3lame -map_metadata -1 "$F/Flxweroff - Something (2021)/01 lost in the rain.mp3"
mk 320 3 -c:a libmp3lame -map_metadata -1 "$F/Flxweroff - Something (2021)/02 empty room.mp3"
mk 340 3 -c:a libmp3lame -id3v2_version 3 -metadata title="cold nights" -metadata artist="FLXWEROFF" -metadata album="My Broken Hopes" -metadata track=1 "$F/Tagged/a.mp3"
mk 360 3 -c:a libmp3lame -id3v2_version 3 -metadata title="moon" -metadata artist="Flxweroff feat. Someone" -metadata album="My Broken Hopes" -metadata track=2 "$F/Tagged/b.mp3"
# two-artist structures
M=two; mkdir -p "$M/Flxweroff/Album A" "$M/Lilith/Album B" "$M/Music/Flxweroff/Album A" "$M/Music/Lilith/Album B" "$M/Tagged/Album A" "$M/Tagged/Album B"
for d in "$M/Flxweroff/Album A" "$M/Music/Flxweroff/Album A"; do mk 300 2 -c:a libmp3lame -map_metadata -1 "$d/01 one.mp3"; mk 310 2 -c:a libmp3lame -map_metadata -1 "$d/02 two.mp3"; done
for d in "$M/Lilith/Album B" "$M/Music/Lilith/Album B"; do mk 400 2 -c:a libmp3lame -map_metadata -1 "$d/01 dark.mp3"; mk 410 2 -c:a libmp3lame -map_metadata -1 "$d/02 light.mp3"; done
mk 500 2 -c:a libmp3lame -id3v2_version 3 -metadata artist="Flxweroff" -metadata album="Album A" -metadata title="tagged f" "$M/Tagged/Album A/01.mp3"
mk 510 2 -c:a libmp3lame -id3v2_version 3 -metadata album_artist="Lilith" -metadata album="Album B" -metadata title="tagged l (albumartist only)" "$M/Tagged/Album B/01.mp3"
mk 520 2 -c:a libmp3lame -id3v2_version 3 -metadata artist="LILITH" -metadata album="Album B" -metadata title="tagged l caps" "$M/Tagged/Album B/02.mp3"
# exact user repro: Flxweroff root with album subfolders, Lilith loose ~1h singles (8 kbps)
R=repro; mkdir -p "$R/Flxweroff/Some Promises Aren't Forgotten" "$R/Flxweroff/My Broken Hopes" "$R/Flxweroff/Listen This" "$R/Lilith"
for a in "Some Promises Aren't Forgotten" "My Broken Hopes" "Listen This"; do mk 300 3 -c:a libmp3lame -map_metadata -1 "$R/Flxweroff/$a/01 intro.mp3"; mk 330 3 -c:a libmp3lame -map_metadata -1 "$R/Flxweroff/$a/02 outro.mp3"; done
L(){ mk $1 $2 -ac 1 -c:a libmp3lame -b:a 8k -id3v2_version 3 "${@:3}"; }
L 200 3600 -map_metadata -1 "$R/Lilith/endless night.mp3"; L 210 3600 -metadata title="hollow (1 hour)" "$R/Lilith/hollow.mp3"; L 220 3500 -metadata title="drift" -metadata genre="ambient" "$R/Lilith/drift.mp3"
echo "test media generated in $(pwd)"
