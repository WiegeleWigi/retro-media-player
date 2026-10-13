// node build.js  -> dist/Retro Media Player-win32-x64 (+ linux for smoke test), exe icon via resedit (no wine needed)
const { packager } = require('@electron/packager'); const fs = require('fs'), path = require('path');
const ResEdit = require('resedit');
(async () => {
  fs.writeFileSync('app/index.html', fs.readFileSync('../index.html','utf8').replace('<title>Windows Media Player</title>','<title>Retro Media Player</title>').replace("$('bclose').onclick=()=>{stopAll();","$('bclose').onclick=()=>{stopAll();if(/Electron/.test(navigator.userAgent))return window.close();"));
  const common = { dir: '.', name: 'Retro Media Player', executableName: 'Retro Media Player', out: 'out', overwrite: true, asar: true, prune: true,
    ignore: [/^\/out/, /^\/build\.js$/, /^\/smoke/, /\.test\.js$/, /^\/node_modules/], appCopyright: '© 2026', appVersion: '1.1.0' };
  const plat = process.argv[2] || 'win32';
  const [dir] = await packager({ ...common, platform: plat, arch: 'x64', icon: 'build/icon.ico',
    win32metadata: { CompanyName: 'Retro Media Player', FileDescription: 'Retro Media Player', ProductName: 'Retro Media Player', InternalName: 'Retro Media Player', OriginalFilename: 'Retro Media Player.exe' } });
  console.log('packaged', dir);
  if (plat === 'win32') { // set icon + version strings on the exe (rcedit would need wine)
    const exe = path.join(dir, 'Retro Media Player.exe'); const data = fs.readFileSync(exe);
    const pe = ResEdit.NtExecutable.from(data, { ignoreCert: true }); const res = ResEdit.NtExecutableResource.from(pe);
    const ico = ResEdit.Data.IconFile.from(fs.readFileSync('build/icon.ico'));
    const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
    const gid = groups.length ? groups[0].id : 1, lang = groups.length ? groups[0].lang : 1033;
    ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, gid, lang, ico.icons.map(i => i.data));
    const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0];
    if (vi) { const l = { lang: 1033, codepage: 1200 };
      vi.setStringValues(l, { FileDescription: 'Retro Media Player', ProductName: 'Retro Media Player', CompanyName: 'Retro Media Player', InternalName: 'Retro Media Player', OriginalFilename: 'Retro Media Player.exe', LegalCopyright: '© 2026' });
      vi.setFileVersion(1, 1, 0, 0, 1033); vi.setProductVersion(1, 1, 0, 0, 1033); vi.outputToResourceEntries(res.entries); }
    res.outputResource(pe); fs.writeFileSync(exe, Buffer.from(pe.generate()));
    console.log('icon + version info written (icon group', gid, ')');
  }
})().catch(e => { console.error(e); process.exit(1); });
