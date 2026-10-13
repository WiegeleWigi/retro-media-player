const puppeteer=require('puppeteer-core');const {spawn}=require('child_process');const fs=require('fs');
const BIN=__dirname+'/out/Retro Media Player-linux-x64/Retro Media Player';
async function launch(){const p=spawn(BIN,['--remote-debugging-port=9333','--no-sandbox'],{stdio:['ignore','pipe','pipe']});let log='';p.stdout.on('data',d=>log+=d);p.stderr.on('data',d=>log+=d);
 for(let i=0;i<60;i++){try{const r=await fetch('http://127.0.0.1:9333/json/version');if(r.ok)break}catch(e){}await new Promise(r=>setTimeout(r,500))}
 const b=await puppeteer.connect({browserURL:'http://127.0.0.1:9333',defaultViewport:null});let pg;for(let i=0;i<20&&!pg;i++){pg=(await b.pages()).find(x=>x.url().startsWith('app://'));if(!pg)await new Promise(r=>setTimeout(r,500))}
 return {p,b,pg,log:()=>log}}
(async()=>{let {p,b,pg,log}=await launch();const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()=='error')errs.push(m.text())});
 await pg.reload();await new Promise(r=>setTimeout(r,1500));
 console.log('url',pg.url(),'title',await pg.title());
 const r=await pg.evaluate(async()=>{const o={};o.audio=typeof AudioContext;o.presets=presets.length;o.webkitdir='webkitdirectory' in document.createElement('input');o.node=typeof require;
  try{const d=await jsonp('https://api.deezer.com/search/artist?q=Flxweroff&limit=1&output=jsonp');o.deezerJSONP=d.data[0].name}catch(e){o.deezerJSONP='ERR '+e.message}
  try{const d=await jsonp('https://itunes.apple.com/search?term=flxweroff&entity=musicArtist&limit=1');o.itunesJSONP=d.results[0]?.artistName}catch(e){o.itunesJSONP='ERR '+e.message}
  try{const d=await mb('artist?query=artist:Radiohead&limit=1');o.musicbrainz=d.artists[0].name}catch(e){o.musicbrainz='ERR '+e.message}
  localStorage.setItem('smoke','persist-'+Date.now());o.ls=localStorage.getItem('smoke');o.origin=location.origin;return o});
 console.log(JSON.stringify(r));
 await (await pg.$('#dir')).uploadFile(__dirname+'/media/repro/Lilith');await pg.waitForFunction(()=>tracks.length==3,{timeout:15000});
 await pg.waitForFunction(()=>playing&&au.currentTime>0.5,{timeout:10000}).then(()=>console.log('folder import + playback OK, analyser lvl',0)).catch(e=>console.log('playback check',e.message));
 console.log('lvl',await pg.evaluate(()=>lvl.toFixed(3)),'tracks',await pg.evaluate(()=>tracks.map(t=>t.artist+'/'+t.album+'/'+t.title).join(', ')));
 await pg.evaluate(()=>{const a=document.createElement('a');a.href='https://www.youtube.com/results?search_query=x';a.target='_blank';document.body.appendChild(a);a.click()});await new Promise(r=>setTimeout(r,800));
 console.log('windows after external link click (should still be 1):',(await b.pages()).length);
 await pg.screenshot({path:__dirname+'/../screenshots/electron-linux.png'});
 const saved=r.ls;b.disconnect();p.kill();await new Promise(r=>setTimeout(r,1500));
 ({p,b,pg,log}=await launch());console.log('localStorage after restart matches:',await pg.evaluate(()=>localStorage.getItem('smoke'))==saved);
 console.log('userData exists:',fs.existsSync(process.env.HOME+'/.config/Retro Media Player'));
 console.log('ERRORS:',errs.length?errs:'none');b.disconnect();p.kill();
 console.log('stderr tail:',log().split('\n').filter(l=>/error|ERR/i.test(l)&&!/dbus|gpu|viz|vaapi|Fontconfig|libva|GLES|angle/i.test(l)).slice(-8).join('\n'));process.exit(0)})();
