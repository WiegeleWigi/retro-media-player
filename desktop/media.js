// rmpfile://local/<encoded absolute path> -> streams a local audio/image file with HTTP Range support (needed for seeking).
const fs = require('fs'), path = require('path');
const { Readable } = require('stream');
const TYPES = { '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.ogg': 'audio/ogg', '.oga': 'audio/ogg', '.opus': 'audio/ogg', '.wav': 'audio/wav', '.flac': 'audio/flac', '.webm': 'audio/webm', '.wma': 'audio/x-ms-wma', '.mp4': 'audio/mp4' };
function urlToPath(u) { const url = new URL(u); return decodeURIComponent(url.pathname.replace(/^\//, '')); }
async function serveFile(req) {
  const file = urlToPath(req.url); const type = TYPES[path.extname(file).toLowerCase()];
  if (!type || !path.isAbsolute(file)) return new Response('Forbidden', { status: 403 });
  let st; try { st = await fs.promises.stat(file); if (!st.isFile()) throw new Error('not a file'); } catch (e) { return new Response('Not found', { status: 404 }); }
  const size = st.size, range = req.headers.get('range'); const h = { 'Content-Type': type, 'Accept-Ranges': 'bytes' };
  const m = range && /bytes=(\d*)-(\d*)/.exec(range);
  if (m && (m[1] || m[2])) {
    let start = m[1] ? +m[1] : Math.max(0, size - +m[2]), end = m[1] && m[2] ? Math.min(+m[2], size - 1) : size - 1;
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    return new Response(Readable.toWeb(fs.createReadStream(file, { start, end })), { status: 206, headers: { ...h, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) } });
  }
  return new Response(Readable.toWeb(fs.createReadStream(file)), { status: 200, headers: { ...h, 'Content-Length': String(size) } });
}
async function existsMany(paths) { const out = {}; await Promise.all((Array.isArray(paths) ? paths : []).slice(0, 100000).map(async p => {
  try { out[p] = typeof p === 'string' && path.isAbsolute(p) && (await fs.promises.stat(p)).isFile(); } catch (e) { out[p] = false; } })); return out; }
module.exports = { serveFile, existsMany, urlToPath };
