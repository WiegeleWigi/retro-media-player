const puppeteer=require('puppeteer-core');const M=__dirname+'/media/repro/';
(async()=>{const b=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});const p=await b.newPage();await p.setViewport({width:1100,height:700});const errs=[];
 p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()=='error')errs.push(m.text())});
 let answers=[];p.on('dialog',d=>d.accept(answers.shift()||''));const W=ms=>new Promise(r=>setTimeout(r,ms));
 const tree=()=>p.$$eval('#ltree .c[data-k=artist],#ltree .c[data-k=album]',x=>x.map(d=>(d.dataset.k=='album'?'   ':'')+d.textContent));
 await p.goto('file://'+require('path').resolve(__dirname,'../index.html')+'');await p.evaluate(()=>{localStorage.clear();indexedDB.deleteDatabase('rmp-library')});await p.reload();
 const load=async()=>{await (await p.$('#dir')).uploadFile(M+'Flxweroff');await p.waitForFunction(()=>tracks.length==6);await (await p.$('#dir')).uploadFile(M+'Lilith');await p.waitForFunction(()=>tracks.length==9);await W(300)};
 await load();await p.click('.tab[data-v="library"]');
 answers=['Space Jack'];await p.click('#newArt');await W(200);
 await p.click('#ltree .c[data-k=artist][data-v="Lilith"]');answers=['Hour Tapes'];await p.click('#newAlb');await W(200);
 console.log('tree after new artist/album:',JSON.stringify(await tree()));
 // multi-select Lilith songs (click + ctrl-click) and drag onto "Hour Tapes"
 await p.click('#ltree .c[data-k=artist][data-v="Lilith"]');await W(100);const rows=await p.$$('#lpane tr[data-i]');
 await rows[0].click();await p.keyboard.down('Control');await rows[2].click();await p.keyboard.up('Control');
 console.log('selected',await p.evaluate(()=>[...rowSel].map(i=>tracks[i].title)));
 await p.evaluate(()=>{const dt=new DataTransfer(),r=document.querySelector('#lpane tr.sel'),tg=[...document.querySelectorAll('#ltree .c[data-k=album]')].find(d=>d.textContent.includes('Hour Tapes'));
  r.dispatchEvent(new DragEvent('dragstart',{dataTransfer:dt,bubbles:true}));tg.dispatchEvent(new DragEvent('dragover',{dataTransfer:dt,bubbles:true,cancelable:true}));tg.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}))});
 await W(200);console.log('after drag:',await p.evaluate(()=>tracks.filter(t=>t.artist=='Lilith').map(t=>t.title+' → '+t.album).join(', ')));
 // right-click a Flxweroff track > Move to… > Space Jack
 await p.click('#ltree .c[data-k=artist][data-v="Flxweroff"]');await W(100);const fr=(await p.$$('#lpane tr[data-i]'))[0];const bb=await fr.boundingBox();
 await p.mouse.click(bb.x+60,bb.y+5,{button:'right'});await W(100);await p.evaluate(()=>[...document.querySelectorAll('#ctx [data-m]')].find(d=>d.textContent.startsWith('Move')).click());await W(100);
 await p.screenshot({path:__dirname+'/../screenshots/library-move-menu.png'});
 await p.evaluate(()=>[...document.querySelectorAll('#ctx [data-m]')].find(d=>d.textContent.trim()=='→ Space Jack').click());await W(200);
 console.log('Space Jack has:',await p.evaluate(()=>tracks.filter(t=>t.artist=='Space Jack').map(t=>t.path).join(', ')));
 // import a file directly into an album via its context-menu (Import files into this album…) — uses the file input
 await p.evaluate(()=>{importTarget=targetOf('album',[...LM.meta.entries()].find(([k,m])=>m.album=='Hour Tapes')[0])});
 await (await p.$('#file')).uploadFile(__dirname+'/media/Sample Music/Night Drive/zz.mp3');await p.waitForFunction(()=>tracks.length==10);
 console.log('imported into album:',await p.evaluate(()=>{const t=tracks[9];return t.title+' | tag artist '+t.origArtist+' → '+t.artist+' / '+t.album}));
 // drop an external file onto an artist in the tree
 await p.evaluate(()=>{const dt=new DataTransfer();dt.items.add(new File([new Uint8Array(2000)],'dropped single.mp3',{type:'audio/mpeg'}));const tg=document.querySelector('#ltree .c[data-k=artist][data-v="Space Jack"]');
  tg.dispatchEvent(new DragEvent('dragover',{dataTransfer:dt,bubbles:true,cancelable:true}));tg.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}))});
 await p.waitForFunction(()=>tracks.length==11);console.log('dropped onto artist:',await p.evaluate(()=>tracks[10].title+' → '+tracks[10].artist));
 answers=['Empty One'];await p.click('#ltree .c[data-k=artist][data-v="Space Jack"]');await p.click('#newAlb');await W(200);
 await p.click('#ltree .c[data-k=artist][data-v="Lilith"]');await W(200);
 console.log('tree:',JSON.stringify(await tree()));await p.screenshot({path:__dirname+'/../screenshots/library-manual.png'});
 // persistence: reload + re-import the same folders
 await p.reload();await p.evaluate(()=>rmpRestoreP);console.log('restored after reload (no re-import needed):',await p.evaluate(()=>tracks.length));await p.click('.tab[data-v="library"]');await W(200);
 console.log('after reload+reimport tree:',JSON.stringify(await tree()));
 console.log('Lilith after reload:',await p.evaluate(()=>tracks.filter(t=>t.path.startsWith('Lilith')).map(t=>t.title+' → '+t.artist+'/'+t.album).join(', ')));
 console.log('ERRORS:',errs.length?errs:'none');await b.close()})();
