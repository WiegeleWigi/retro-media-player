// Packaged Electron build: import a folder, quit, relaunch -> library restored from absolute paths (rmpfile://), plays, seeks; a deleted file is greyed/skipped.
const puppeteer=require(process.env.PUPPETEER_CORE||'puppeteer-core');const {spawn}=require('child_process');const fs=require('fs'),os=require('os'),path=require('path');
const BIN=__dirname+'/out/Retro Media Player-linux-x64/Retro Media Player';
const HOME=fs.mkdtempSync('/tmp/rmp-home-'),MUS=path.join(HOME,'My Music','Lilith');fs.mkdirSync(MUS,{recursive:true});
for(const f of fs.readdirSync(__dirname+'/../tests/media/repro/Lilith',{recursive:true}))fs.cpSync(__dirname+'/../tests/media/repro/Lilith/'+f,path.join(MUS,f),{recursive:true});
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function launch(){const p=spawn(BIN,['--remote-debugging-port=9334','--no-sandbox'],{env:{...process.env,HOME},stdio:['ignore','pipe','pipe']});
 for(let i=0;i<60;i++){try{const r=await fetch('http://127.0.0.1:9334/json/version');if(r.ok)break}catch(e){}await sleep(500)}
 const b=await puppeteer.connect({browserURL:'http://127.0.0.1:9334',defaultViewport:null});let pg;for(let i=0;i<20&&!pg;i++){pg=(await b.pages()).find(x=>x.url().startsWith('app://'));if(!pg)await sleep(500)}
 await pg.waitForFunction(()=>window.rmpRestoreP).catch(()=>{});await pg.evaluate(()=>rmpRestoreP);return {p,b,pg}}
const quit=async({p,b})=>{b.disconnect();p.kill();await new Promise(r=>p.once('exit',r));await sleep(500)};
(async()=>{let s=await launch();const errs=[];
 ok(await s.pg.evaluate(()=>!!window.rmpDesktop&&typeof rmpDesktop.pathForFile=='function'),'preload bridge present');
 const files=fs.readdirSync(MUS,{recursive:true}).filter(f=>/\.(mp3|wav)$/i.test(f));
 await (await s.pg.$('#dir')).uploadFile(MUS);await s.pg.waitForFunction(n=>tracks.length==n&&tracks.every(t=>t.saved),{timeout:20000},files.length);
 const fp=await s.pg.evaluate(()=>tracks.map(t=>t.filePath));ok(fp.every(x=>x&&x.startsWith(HOME)),'absolute paths captured: '+fp[0]);
 await s.pg.evaluate(()=>{doRename('artist',tracks[0].artistDisp||tracks[0].artist,'Lilith (renamed)');$('vol').value=.42;setVol();saveState()});await sleep(800);
 const recs=await s.pg.evaluate(()=>pdbTx('tracks','readonly',s=>s.getAll()).then(r=>r.map(x=>({fp:x.filePath,blob:!!x.blob}))));ok(recs.every(r=>r.fp&&!r.blob),'IndexedDB stores paths, not file copies');
 const before=await s.pg.evaluate(()=>tracks.map(t=>t.title+'|'+(t.artistDisp||t.artist)));await quit(s);
 s=await launch();s.pg.on('pageerror',e=>errs.push(e.message));
 const r=await s.pg.evaluate(()=>({lib:tracks.map(t=>t.title+'|'+(t.artistDisp||t.artist)),urls:tracks.map(t=>t.url),vol:+$('vol').value,miss:tracks.filter(t=>t.missing).length}));
 ok(JSON.stringify(r.lib)==JSON.stringify(before),'library + rename restored after relaunch ('+r.lib.length+' songs)');ok(r.urls.every(u=>u.startsWith('rmpfile://')),'plays from rmpfile:// paths');
 ok(Math.abs(r.vol-.42)<.01,'volume restored');ok(r.miss==0,'nothing missing');
 await s.pg.evaluate(()=>playIdx(0));ok(await s.pg.waitForFunction(()=>playing&&au.currentTime>0.5,{timeout:8000}).then(()=>true).catch(()=>false),'playback after relaunch');
 const seek=await s.pg.evaluate(async()=>{await new Promise(r=>setTimeout(r,300));const d=au.duration;au.currentTime=d/2;await new Promise(r=>setTimeout(r,800));return {d,t:au.currentTime}});ok(seek.t>=seek.d/2-0.5,'seeking works (range requests) '+JSON.stringify(seek));
 const f0=fp[1];fs.renameSync(f0,f0+'.moved');await quit(s);
 s=await launch();s.pg.on('pageerror',e=>errs.push(e.message));
 const m=await s.pg.evaluate(()=>({miss:tracks.filter(t=>t.missing).map(t=>t.title),n:tracks.length,notice:($('rmpNotice')||{}).textContent||'',grey:document.querySelectorAll('#list li.miss').length}));
 ok(m.miss.length==1&&m.n==files.length&&m.grey==1,'moved file shown greyed: '+JSON.stringify(m));
 await s.pg.evaluate(()=>playIdx(tracks.findIndex(t=>t.missing)));await sleep(1500);const pl=await s.pg.evaluate(()=>({playing,cur:tracks[idx]&&tracks[idx].missing}));ok(pl.playing&&!pl.cur,'missing file skipped, next song plays');
 const forb=await s.pg.evaluate(()=>fetch('rmpfile://local/'+encodeURIComponent('/etc/passwd')).then(r=>r.status).catch(e=>'err'));ok(forb==403||forb=='err','non-audio files not served ('+forb+')');
 ok(!errs.length,'no page errors '+JSON.stringify(errs));await quit(s);fs.rmSync(HOME,{recursive:true,force:true});console.log(fails?fails+' FAILED':'ALL PASSED');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
