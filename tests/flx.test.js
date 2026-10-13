const puppeteer=require('puppeteer-core'),fs=require('fs');const OUT=__dirname+'/../screenshots/';
(async()=>{const b=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:'new',args:['--autoplay-policy=no-user-gesture-required','--no-sandbox']});
 const p=await b.newPage();await p.setViewport({width:1100,height:720});const errs=[];
 p.on('pageerror',e=>errs.push('pageerror: '+e.message));p.on('console',m=>{if(m.type()=='error')errs.push('console: '+m.text())});
 await p.goto('file://'+require('path').resolve(__dirname,'../index.html')+'');await p.evaluate(()=>localStorage.clear());await p.reload();
 await (await p.$('#dir')).uploadFile(__dirname+'/media/flx/Music');await p.waitForFunction(()=>tracks.length==4,{timeout:10000});
 console.log(await p.evaluate(()=>tracks.map(t=>[t.path,t.artist,t.album,t.title].join(' | ')).join('\n')));
 console.log('seeds',await p.evaluate(()=>JSON.stringify(seedArtists(tracks))));
 await p.click('.tab[data-v="rip"]');const t0=Date.now();
 await p.waitForFunction(()=>disc.state!='loading',{timeout:120000});console.log('discover took',(Date.now()-t0)/1000,'s');
 const r=await p.evaluate(()=>JSON.stringify({st:disc.state,n:disc.items.length,why:disc.why,items:disc.items.map(t=>t.artist+' - '+t.title+'  ['+t.because+' via '+t.via+']'),log:disc.log.map(l=>l.step+' => '+l.res)},null,1));console.log(r);
 await new Promise(r=>setTimeout(r,3000));await p.screenshot({path:OUT+'discover-flxweroff.png'});
 await p.evaluate(()=>{document.querySelector('#dpane details').open=true;document.querySelector('#dpane details').scrollIntoView()});await p.screenshot({path:OUT+'discover-flxweroff-log.png'});
 await p.evaluate(()=>{document.querySelector('#dpane .es').click();$('dpane').scrollTop=0});await p.screenshot({path:OUT+'discover-seed-editor.png'});
 // ---- rename ----
 await p.click('.tab[data-v="library"]');await new Promise(r=>setTimeout(r,300));
 const art=await p.$$eval('#ltree .c[data-k=artist]',x=>x.map(d=>d.textContent));console.log('artists before',art);
 const el=(await p.$$('#ltree .c[data-k=artist]'))[0];const bb=await el.boundingBox();await p.mouse.click(bb.x+20,bb.y+5,{button:'right'});await new Promise(r=>setTimeout(r,200));
 await p.screenshot({path:OUT+'rename-menu.png'});
 await p.evaluate(()=>document.querySelector('#ctx [data-m="0"]').click());await new Promise(r=>setTimeout(r,100));
 await p.keyboard.down('Control');await p.keyboard.press('a');await p.keyboard.up('Control');await p.keyboard.type('Flxweroff (renamed)');await p.screenshot({path:OUT+'rename-inline.png'});
 await p.keyboard.press('Enter');await new Promise(r=>setTimeout(r,200));
 console.log('artists after',await p.$$eval('#ltree .c[data-k=artist]',x=>x.map(d=>d.textContent)),'tracks:',await p.evaluate(()=>tracks.map(t=>t.artist).join(',')));
 // F2 on a track row
 await p.click('#ltree .c[data-k=songs]');await p.click('#lpane tr[data-i="0"]');await p.keyboard.press('F2');await p.keyboard.type('Lost In The Rain');await p.keyboard.press('Enter');
 console.log('title after F2',await p.evaluate(()=>tracks[0].title),'stored',await p.evaluate(()=>localStorage.getItem('wmp.renames')));
 await p.screenshot({path:OUT+'rename-done.png'});
 // re-import: clear and re-add -> renames reapply
 await p.evaluate(()=>$('clr').click());await (await p.$('#dir')).uploadFile(__dirname+'/media/flx/Music');await p.waitForFunction(()=>tracks.length==4);
 console.log('after reimport',await p.evaluate(()=>tracks.map(t=>t.artist+'/'+t.title).join(', ')));
 await p.click('.tab[data-v="rip"]');await p.waitForFunction(()=>disc.state!='loading',{timeout:120000});console.log('discover seeds after rename',await p.evaluate(()=>disc.seeds.map(s=>s.name)+' n='+disc.items.length));
 await p.click('.tab[data-v="library"]');p.on('dialog',d=>d.accept());await p.click('#resetNames');await new Promise(r=>setTimeout(r,200));
 console.log('after reset',await p.evaluate(()=>tracks.map(t=>t.artist+'/'+t.title).join(', ')),await p.evaluate(()=>localStorage.getItem('wmp.renames')));
 console.log('ERRORS:',errs.length?errs:'none');await b.close()})();
