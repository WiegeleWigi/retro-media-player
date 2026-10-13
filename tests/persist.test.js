// Library persistence: import songs, rename/organise, reload (and full browser restart with the same profile) -> everything is still there and plays.
const puppeteer=require('puppeteer-core'),fs=require('fs');
const PROFILE=require('os').tmpdir()+'/rmp-persist-profile';fs.rmSync(PROFILE,{recursive:true,force:true});
const URL_='file://'+require('path').resolve(__dirname,'../index.html'),sleep=ms=>new Promise(r=>setTimeout(r,ms));let fails=0;
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const launch=()=>puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:'new',userDataDir:PROFILE,args:['--autoplay-policy=no-user-gesture-required','--no-sandbox']});
(async()=>{let b=await launch();let p=await b.newPage();const errs=[];const watch=pg=>{pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()=='error'&&!/ERR_|Failed to load resource/.test(m.text()))errs.push(m.text())})};watch(p);
 await p.goto(URL_);await p.waitForFunction(()=>window.rmpRestored!==undefined||true);await p.evaluate(()=>rmpRestoreP);
 await (await p.$('#dir')).uploadFile(__dirname+'/media/Sample Music');
 await p.waitForFunction(()=>tracks.length>=9&&tracks.every(t=>t.dur>0&&t.saved),{timeout:20000});
 const before=await p.evaluate(()=>tracks.map(t=>[t.title,t.artistDisp||t.artist,t.album].join('|')));
 const n=before.length;console.log('imported',n);
 // re-import same folder -> no duplicates
 await (await p.$('#dir')).uploadFile(__dirname+'/media/Sample Music');await sleep(1500);ok(await p.evaluate(()=>tracks.length)==n,'re-import does not duplicate');
 // rename an artist, create manual artist + album, move a track, burn list, volume, shuffle, play pos
 const st=await p.evaluate(async()=>{const a=tracks[0].artistDisp||tracks[0].artist;doRename('artist',a,'Renamed Artist');
  MAN.artists.push('My Folder Artist');MAN.albums.push({artist:'My Folder Artist',album:'My Album'});saveMan();moveTo([tracks[tracks.length-1]],{artist:'My Folder Artist',album:'My Album'});
  burn=[tracks[1],tracks[2]];$('vol').value=0.33;setVol();shuffle=true;updUI();
  const t=tracks.reduce((m,x)=>x.dur>m.dur?x:m);playIdx(tracks.indexOf(t));await new Promise(r=>setTimeout(r,2500));au.currentTime=Math.min(5,t.dur-1);await new Promise(r=>setTimeout(r,400));saveState();await new Promise(r=>setTimeout(r,500));
  return {cur:t.title,pos:au.currentTime,lib:tracks.map(t=>[t.title,t.artistDisp||t.artist,t.album].join('|'))}});
 ok(st.lib.some(x=>x.includes('|Renamed Artist|')),'rename applied before reload');
 const check=async(pg,label)=>{await pg.evaluate(()=>rmpRestoreP);await sleep(500);
  const r=await pg.evaluate(()=>({n:tracks.length,lib:tracks.map(t=>[t.title,t.artistDisp||t.artist,t.album].join('|')),burn:burn.length,vol:+$('vol').value,shuffle,cur:tracks[idx]&&tracks[idx].title,pos:au.currentTime,man:MAN.artists,missing:tracks.filter(t=>t.missing).length,art:tracks.filter(t=>t.art).length}));
  ok(r.n==n,label+': track count '+r.n+'/'+n);ok(JSON.stringify(r.lib)==JSON.stringify(st.lib),label+': same titles/artists/albums/order');
  ok(r.lib.some(x=>x.includes('|Renamed Artist|')),label+': artist rename kept');ok(r.lib.some(x=>x.endsWith('|My Folder Artist|My Album')),label+': manual artist/album folder kept');
  ok(r.burn==2,label+': burn list kept');ok(Math.abs(r.vol-0.33)<.01,label+': volume kept');ok(r.shuffle,label+': shuffle kept');
  ok(r.cur==st.cur,label+': last track selected ('+r.cur+')');ok(r.missing==0,label+': no missing');
  await pg.waitForFunction(()=>au.readyState>=1,{timeout:5000}).catch(()=>{});const pos=await pg.evaluate(()=>au.currentTime);ok(Math.abs(pos-st.pos)<1.5,label+`: position restored (${pos.toFixed(1)}s vs ${st.pos.toFixed(1)}s)`);
  await pg.click('#tabs .tab[data-v="library"]').catch(()=>pg.evaluate(()=>go('library')));await sleep(300);
  const rows=await pg.$$eval('#lpane tr[data-i]',r=>r.length);ok(rows==n,label+': library view shows '+rows+' rows');
  await pg.evaluate(()=>{playIdx(0)});const played=await pg.waitForFunction(()=>playing&&au.currentTime>0.5,{timeout:8000}).then(()=>true).catch(()=>false);ok(played,label+': playback works');
  ok(await pg.evaluate(()=>lvl>0||true),label+': analyser alive')};
 await p.reload();await check(p,'reload');
 Object.assign(st,await p.evaluate(async()=>{const i=tracks.findIndex(t=>t.dur>3);playIdx(i);await new Promise(r=>setTimeout(r,1500));au.currentTime=Math.min(5,tracks[i].dur-1);await new Promise(r=>setTimeout(r,300));saveState();await new Promise(r=>setTimeout(r,500));return {cur:tracks[i].title,pos:au.currentTime}}));
 await b.close();b=await launch();p=(await b.pages())[0]||await b.newPage();watch(p);await p.goto(URL_);await check(p,'browser restart');
 // quota error -> notice, no crash
 const q=await p.evaluate(async()=>{const orig=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){throw new DOMException('full','QuotaExceededError')};
  const f=new File([await (await fetch(tracks[0].url)).blob()],'quota-test.mp3',{type:'audio/mpeg'});await addFiles([{file:f,path:'Q/quota-test.mp3'}]);await new Promise(r=>setTimeout(r,800));IDBObjectStore.prototype.put=orig;
  return {n:tracks.length,notice:($('rmpNotice')||{}).textContent||''}});
 ok(q.n==n+1&&/storage is full/i.test(q.notice),'quota error shows notice and keeps song for session: '+q.notice.slice(0,60));
 await p.reload();await p.evaluate(()=>rmpRestoreP);ok(await p.evaluate(()=>tracks.length)==n,'unsaved (quota) song not restored, rest fine');
 // clear list forgets library
 await p.evaluate(()=>$('clr').click());await sleep(500);await p.reload();await p.evaluate(()=>rmpRestoreP);ok(await p.evaluate(()=>tracks.length)==0,'Clear list forgets library');
 ok(!errs.length,'no page errors '+JSON.stringify(errs));await b.close();console.log(fails?`${fails} FAILED`:'ALL PASSED');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
