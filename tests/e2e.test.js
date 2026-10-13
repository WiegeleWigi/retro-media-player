const puppeteer=require('puppeteer-core'),fs=require('fs');
const OUT=__dirname+'/../screenshots/',DL=require('os').tmpdir()+'/dl';fs.rmSync(DL,{recursive:true,force:true});fs.mkdirSync(DL);
(async()=>{const b=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:'new',args:['--autoplay-policy=no-user-gesture-required','--no-sandbox','--allow-file-access-from-files']});
 const p=await b.newPage();await p.setViewport({width:1100,height:680});const errs=[];
 p.on('pageerror',e=>errs.push('pageerror: '+e.message));p.on('console',m=>{if(m.type()=='error')errs.push('console: '+m.text())});
 const cdp=await p.createCDPSession();await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:DL});
 await p.goto('file://'+require('path').resolve(__dirname,'../index.html')+'?demo');await new Promise(r=>setTimeout(r,1500));
 await p.screenshot({path:OUT+'now-playing.png'});
 // folder import through the webkitdirectory input
 const dir=await p.$('#dir');await dir.uploadFile(__dirname+'/media/Sample Music');
 await p.waitForFunction(()=>tracks.length>=9&&tracks.every(t=>t.dur>0),{timeout:15000}).catch(()=>{});
 const info=await p.evaluate(()=>tracks.map(t=>[t.path,t.title,t.artist,t.album,t.trackNo,Math.round(t.dur),!!t.art].join(' | ')));console.log(info.join('\n'));
 const tab=async v=>{await p.click(`.tab[data-v="${v}"]`);await new Promise(r=>setTimeout(r,300))};
 await tab('library');await p.click('#ltree [data-k="albums"]');await new Promise(r=>setTimeout(r,300));await p.screenshot({path:OUT+'library.png'});
 await p.click('#lpane .tile');await new Promise(r=>setTimeout(r,200));await p.screenshot({path:OUT+'library-album.png'});
 await p.click('#ltree .c[data-k="songs"]');await p.type('#q','neon');await new Promise(r=>setTimeout(r,200));
 console.log('search rows:',await p.$$eval('#lpane tr[data-i]',r=>r.length));await p.screenshot({path:OUT+'library-search.png'});
 await p.$eval('#q',e=>{e.value='';e.oninput()});
 await tab('rip');await p.waitForSelector('#dpane .rec',{timeout:30000}).catch(()=>console.log('no recs:',''));
 console.log('discover:',await p.evaluate(()=>JSON.stringify({st:disc.state,src:disc.src,seeds:disc.seeds,n:disc.items.length,msg:disc.msg,sample:disc.items.slice(0,3).map(t=>t.artist+' - '+t.title+' / because '+t.because)})));
 await new Promise(r=>setTimeout(r,2500));await p.click('#dpane .pv');await new Promise(r=>setTimeout(r,3000));
 console.log('preview:',await p.evaluate(()=>JSON.stringify({playing,plain:!!(preview&&preview.plain),t:au.currentTime,lvl})));
 await p.screenshot({path:OUT+'discover.png'});
 await p.evaluate(()=>{const o=navigator.onLine;Object.defineProperty(navigator,'onLine',{get:()=>false,configurable:true});loadDiscover(true)});await p.screenshot({path:OUT+'discover-offline.png'});
 await p.evaluate(()=>{delete navigator.onLine;Object.defineProperty(navigator,'onLine',{get:()=>true,configurable:true});stopAll()});
 await tab('burn');await p.click('#burnAll');
 // drag one row via synthetic DataTransfer
 await p.evaluate(()=>{const dt=new DataTransfer();const r=document.querySelector('#bsrc tr[data-i="2"]');r.dispatchEvent(new DragEvent('dragstart',{dataTransfer:dt,bubbles:true}));
  $('blist').dispatchEvent(new DragEvent('dragover',{dataTransfer:dt,bubbles:true,cancelable:true}));$('blist').dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}))});
 console.log('burn count',await p.evaluate(()=>burn.length));
 await p.screenshot({path:OUT+'burn.png'});await p.click('#burnGo');await new Promise(r=>setTimeout(r,2500));
 await tab('sync');await p.click('#spane input[data-c="1"]');await p.screenshot({path:OUT+'sync.png'});await p.click('#syncGo');await new Promise(r=>setTimeout(r,1000));
 await p.screenshot({path:OUT+'sync-progress.png'});await new Promise(r=>setTimeout(r,2000));
 console.log('downloads',fs.readdirSync(DL));for(const f of fs.readdirSync(DL))console.log('--',f,'\n'+fs.readFileSync(DL+'/'+f,'utf8'));
 // history
 await p.click('#back');const h1=await p.evaluate(()=>curView);await p.click('#back');const h2=await p.evaluate(()=>curView);await p.click('#fwd');const h3=await p.evaluate(()=>curView);console.log('history',h1,h2,h3);
 await tab('now');
 await p.evaluate(()=>{stopAll();startDemo();AC.resume()});
 await p.keyboard.press('v');const a=await p.evaluate(()=>pi);await p.keyboard.down('Shift');await p.keyboard.press('V');await p.keyboard.up('Shift');const c=await p.evaluate(()=>pi);console.log('V/Shift+V',a,c);
 await p.mouse.click(300,300,{button:'right'});await new Promise(r=>setTimeout(r,200));await p.screenshot({path:OUT+'context-menu.png'});
 await p.evaluate(()=>[...document.querySelectorAll('#ctx [data-i]')].find(d=>d.textContent=='Tunnel').click());console.log('ctx pick',await p.evaluate(()=>presets[pi].name));
 const n=await p.evaluate(()=>presets.length);const names=await p.evaluate(()=>presets.map(x=>x.name));
 for(let i=0;i<n;i++){await p.evaluate(i=>{setPreset(i);$('preset').style.opacity=0},i);await new Promise(r=>setTimeout(r,1400));
  const el=await p.$('#vis');await el.screenshot({path:`${require('os').tmpdir()}/vis${i}.png`})}
 fs.writeFileSync(require('os').tmpdir()+'/names.json',JSON.stringify(names));
 const p2=await b.newPage();p2.on('pageerror',e=>errs.push('reload pageerror: '+e.message));await p2.goto('file://'+require('path').resolve(__dirname,'../index.html')+'');console.log('persisted preset after reload:',await p2.evaluate(()=>presets[pi].name));
 for(const v of ['library','rip','burn','sync']){} 
 console.log('ERRORS:',errs.length?errs:'none');await b.close()})();
