const puppeteer=require('puppeteer-core');const M=__dirname+'/media/two/';
(async()=>{const b=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});const errs=[];
 async function run(file,label,dirs,ls){const p=await (await b.createBrowserContext()).newPage();await p.setViewport({width:1100,height:680});p.on('pageerror',e=>errs.push(label+': '+e.message));
  await p.goto('file://'+file);await p.evaluate(ls=>{localStorage.clear();if(ls)localStorage.setItem('wmp.renames',ls)},ls);await p.reload();
  let n=0;for(const d of dirs){await (await p.$('#dir')).uploadFile(M+d);n+=await p.evaluate(()=>0);await p.waitForFunction(k=>tracks.length>k,{},n);n=await p.evaluate(()=>tracks.length);await new Promise(r=>setTimeout(r,300))}
  await p.click('.tab[data-v="library"]');await new Promise(r=>setTimeout(r,200));
  const arts=await p.$$eval('#ltree .c[data-k=artist]',x=>x.map(d=>d.textContent));console.log(label.padEnd(48),JSON.stringify(arts));return p}
 const V4=require('path').resolve(__dirname,'../index.html');
 for(const [f,tag] of [[V4,'NEW']]){
  await run(f,tag+' (a) Flxweroff then Lilith',['Flxweroff','Lilith']);
  await run(f,tag+' (b) common parent Music/',['Music']);
  await run(f,tag+' (c) tagged variants',['Tagged']);
  await run(f,tag+' (d) legacy rename Unknown Artist->Flxweroff',['Flxweroff','Lilith'],JSON.stringify({artist:{'Unknown Artist':'Flxweroff'}}));}
 const p=await run(V4,'NEW all together',['Music','Tagged']);
 await p.click('#ltree .c[data-k=artists]');await new Promise(r=>setTimeout(r,300));await p.screenshot({path:__dirname+'/../screenshots/library-two-artists.png'});
 // rename one artist: must not touch the other
 await p.click('#ltree .c[data-k=artist]');await p.keyboard.press('F2');await p.keyboard.type('Flxweroff ✎');await p.keyboard.press('Enter');
 console.log('after F2 rename of first artist',JSON.stringify(await p.$$eval('#ltree .c[data-k=artist]',x=>x.map(d=>d.textContent))),await p.evaluate(()=>localStorage.getItem('wmp.renames')));
 console.log('ERRORS:',errs.length?errs:'none');await b.close()})();
