const fs=require('fs'),path=require('path'),assert=require('assert');
const html=fs.readFileSync('../index.html','utf8');const lib=html.slice(html.indexOf('//#LIB-START'),html.indexOf('//#LIB-END'));
const L=new Function(lib+';return {isAudio,parseID3,makeTrack,applyTags,cmpTracks,walkEntry,toM3U,fixFolderArtists}')();
const rd=p=>{const b=fs.readFileSync(p);return [new Uint8Array(b),new Uint8Array(b.subarray(b.length-128))]};
let n=0;const ok=(c,m)=>{assert(c,m);n++;console.log('  ✓',m)};
// ID3 parsing
let g=L.parseID3(...rd('media/Sample Music/Album One/01 a.mp3'));console.log(JSON.stringify({...g,pic:g.pic&&{mime:g.pic.mime,len:g.pic.data.length}}));
ok(g.title=='Ünïcode Opening'&&g.artist=='The Testers'&&g.album=='Album One'&&g.track=='1/9','v2.3 text frames incl. unicode');
ok(g.pic&&g.pic.mime=='image/jpeg'&&g.pic.data[0]==0xFF&&g.pic.data[1]==0xD8,'v2.3 APIC cover is a JPEG');
g=L.parseID3(...rd('media/Sample Music/Night Drive/track.mp3'));ok(g.title=='Highway Lights'&&g.track=='1'&&g.pic&&g.pic.data[0]==0xFF,'v2.4 frames + APIC');
g=L.parseID3(...rd('media/v1only.mp3'));ok(g.title=='V1 Only'&&g.artist=='Old School'&&g.album=='Legacy'&&g.track=='5','ID3v1 fallback incl. v1.1 track');
g=L.parseID3(...rd('media/Sample Music/Untagged Folder/10 Tenth Song.mp3'));ok(Object.keys(g).length==0,'untagged -> empty');
// hand-made v2.2
const fr=(id,t)=>{const d=Buffer.from('\0'+t,'latin1');return Buffer.concat([Buffer.from(id),Buffer.from([0,0,d.length]),d])};
const body=Buffer.concat([fr('TT2','Old Title'),fr('TP1','Old Artist'),fr('TRK','07')]),sz=body.length;
const v22=new Uint8Array(Buffer.concat([Buffer.from([73,68,51,2,0,0,0,0,(sz>>7)&127,sz&127]),body,Buffer.alloc(20)]));
g=L.parseID3(v22,null);ok(g.title=='Old Title'&&g.artist=='Old Artist'&&g.track=='07','ID3v2.2 frames');
// UTF-16 with BOM frame (v2.3)
const u=Buffer.concat([Buffer.from([1,0xFF,0xFE]),Buffer.from('Ωmega\0','utf16le')]);const f3=Buffer.concat([Buffer.from('TIT2'),Buffer.from([0,0,0,u.length,0,0]),u]);
g=L.parseID3(new Uint8Array(Buffer.concat([Buffer.from([73,68,51,3,0,0,0,0,0,f3.length]),f3])),null);ok(g.title=='Ωmega','UTF-16 BOM text');
// folder walk + filter + sort via fake FileSystemEntry tree built from disk
function entry(p){const st=fs.statSync(p),name=path.basename(p);if(st.isDirectory()){return {isDirectory:true,name,createReader(){let done=false;return {readEntries(res){const k=done?[]:fs.readdirSync(p).map(c=>entry(path.join(p,c)));done=true;setTimeout(()=>res(k))}}}}}
 return {isFile:true,name,file(res){res({name,size:st.size,type:''})}}}
(async()=>{const out=await L.walkEntry(entry('media/Sample Music'),'',[]);
 ok(out.length==10&&out.every(o=>o.path.startsWith('Sample Music/')),'recursive walk finds 10 files with relative paths');
 const aud=out.filter(o=>L.isAudio(o.file.name));ok(aud.length==9&&!aud.some(o=>o.file.name.endsWith('.txt')),'filters non-audio');
 ok(['a.MP3','x.flac','y.opus','z.webm','q.oga','r.m4a','s.aac','t.ogg','u.wav'].every(L.isAudio)&&!L.isAudio('cover.jpg'),'all required extensions accepted');
 const tr=aud.map(o=>{const t=L.makeTrack(o.file,o.path);const p='media/'+o.path;if(p.endsWith('.mp3'))L.applyTags(t,L.parseID3(...rd(p)));return t});
 tr.sort(L.cmpTracks);const order=tr.map(t=>t.folder.split('/').pop()+' | '+t.trackNo+' | '+t.title+' | '+t.album);console.log(order.join('\n'));
 ok(JSON.stringify(tr.map(t=>t.title))==JSON.stringify(['Ünïcode Opening','Sunrise Theme','Track 1','Airbag','Track 2','Highway Lights','Second Exit','Second Song','Tenth Song']),'sorted by folder, then track number (tag or filename), then name');
 const un=tr.find(t=>t.title=='Tenth Song');ok(un.album=='Untagged Folder'&&un.artist=='Unknown Artist'&&un.trackNo==10,'untagged fallback: folder as album, filename as title');
 const m=L.toM3U(tr.slice(0,2).map(t=>(t.dur=5,t)));ok(m.startsWith('#EXTM3U\n#EXTINF:5,The Testers - Ünïcode Opening\nSample Music/Album One/01 a.mp3'),'m3u export');
 console.log(n+' tests passed')})().catch(e=>{console.error(e);process.exit(1)});
// ---- v3: artist cleanup, seeds, renames ----
const L3=new Function(lib+';return {cleanArtist,artistCands,artistSource,seedArtists,simA,makeTrack,applyRenames,setRename,normA}')();
(()=>{const c=L3.cleanArtist,eq=(a,b,m)=>ok(JSON.stringify(a)==JSON.stringify(b),m+' → '+JSON.stringify(a));
 eq(c('Flxweroff feat. Someone'),'Flxweroff','strip feat.');eq(c('Flxweroff ft. A & B'),'Flxweroff','strip ft. + &');eq(c('Flxweroff x Someone'),'Flxweroff','strip x collab');
 eq(c('Flxweroff, Other'),'Flxweroff','strip comma');eq(c('Flxweroff - Something (2021)'),'Flxweroff','folder Artist - Album (Year)');eq(c('Flxweroff [2020]'),'Flxweroff','brackets/years');
 eq(c('01 - Flxweroff'),'Flxweroff','track-number prefix');eq(c('Various Artists'),'','Various Artists ignored');eq(c('Simon & Garfunkel',true),'Simon & Garfunkel','keepAmp variant');
 eq(L3.artistCands('Simon & Garfunkel'),['Simon & Garfunkel','Simon'],'candidates full then primary');
 const t=L3.makeTrack({name:'03 lost.mp3'},'Music/Flxweroff - Something (2021)/03 lost.mp3');eq([t.artist,t.album,t.year,t.trackNo,t.title],['Flxweroff','Something','2021',3,'lost'],'makeTrack parses "Artist - Album (Year)" folder');
 eq(L3.artistSource({artist:'Unknown Artist',folder:'Music/Flxweroff/Album A'}),'Flxweroff','artist from parent folder when untagged');
 const S=L3.seedArtists([{artist:'FLXWEROFF',folder:''},{artist:'Flxweroff feat. Someone',folder:''},{artist:'Unknown Artist',folder:'x/Flxweroff - Something (2021)'},{artist:'Other',folder:''}]);
 eq(S.map(s=>[s.name,s.count]),[['FLXWEROFF',3],['Other',1]],'variants group into one seed');
 ok(L3.simA('FLXWEROFF','Flxweroff')==1&&L3.simA('flowerovlove','Flxweroff')<.8,'fuzzy match: case-insensitive, rejects flowerovlove');
 const tr=[{path:'a/1.mp3',origArtist:'Flxwer0ff',origAlbum:'A',origTitle:'one'},{path:'a/2.mp3',origArtist:'Flxwer0ff',origAlbum:'A',origTitle:'two'}].map(x=>({...x,artist:x.origArtist,album:x.origAlbum,title:x.origTitle}));
 const R={};L3.setRename(R,'artist',tr,'Flxweroff');L3.setRename(R,'track',[tr[1]],'Two (fixed)');tr.forEach(x=>L3.applyRenames(x,R));
 eq(tr.map(x=>x.artist+'/'+x.title),['Flxweroff/one','Flxweroff/Two (fixed)'],'renames apply');
 const re=L3.applyRenames({path:'a/2.mp3',origArtist:'Flxwer0ff',origAlbum:'A',origTitle:'two'},JSON.parse(JSON.stringify(R)));eq([re.artist,re.title],['Flxweroff','Two (fixed)'],'renames reapply on re-import (serialized)');
 L3.setRename(R,'artist',tr,'Flxwer0ff');ok(!('Flxwer0ff' in R.artist),'renaming back to original removes entry');
})();
// ---- v4 regression: different artists must never merge ----
const L4=new Function(lib+';return {makeTrack,applyTags,parseID3,fixFolderArtists,canonArtists,applyRenames,setRename,artistKey}')();
function importBatch(paths,tags={},R={}){const b=paths.map(p=>{const t=L4.makeTrack({name:p.split('/').pop()},p);if(tags[p])L4.applyTags(t,tags[p]);return t});
 L4.fixFolderArtists(b);b.forEach(t=>{t.origArtist=t.artist;t.origAlbum=t.album;t.origTitle=t.title;L4.applyRenames(t,R)});return b}
const groupsOf=list=>{L4.canonArtists(list);const m={};list.forEach(t=>(m[t.artistDisp]=m[t.artistDisp]||[]).push(t.path.split('/').slice(-3).join('/')));return Object.keys(m).sort()};
(()=>{const eq=(a,b,m)=>ok(JSON.stringify(a)==JSON.stringify(b),m+' → '+JSON.stringify(a));
 const F=['Flxweroff/Album A/01 one.mp3','Flxweroff/Album A/02 two.mp3'],Li=['Lilith/Album B/01 dark.mp3','Lilith/Album B/02 light.mp3'];
 // (a) two folders added one after another
 let lib1=[...importBatch(F),...importBatch(Li)];eq(groupsOf(lib1),['Flxweroff','Lilith'],'(a) separate Add-folder imports → 2 artists');
 // (b) both under a common parent, selected at once
 eq(groupsOf(importBatch(F.map(p=>'Music/'+p).concat(Li.map(p=>'Music/'+p)))),['Flxweroff','Lilith'],'(b) common parent "Music/" never becomes the artist');
 eq(groupsOf(importBatch(['Stuff/Flxweroff/Album A/1.mp3','Stuff/Lilith/Album B/1.mp3'])),['Flxweroff','Lilith'],'(b) non-generic common grandparent ignored');
 // album folders directly under a shared root: root is NOT an artist; unknowns stay split per album folder
 const sh=importBatch(['Collection/Album A/1.mp3','Collection/Album B/1.mp3'],{'Collection/Album A/1.mp3':{artist:'Flxweroff'},'Collection/Album B/1.mp3':{artist:'Lilith'}});
 eq(groupsOf(sh),['Flxweroff','Lilith'],'tagged albums under shared root');
 const sh2=importBatch(['Collection/Album A/1.mp3','Collection/Album A/2.mp3','Collection/Album B/1.mp3'],{'Collection/Album A/1.mp3':{artist:'Flxweroff'},'Collection/Album B/1.mp3':{artist:'Lilith'}});
 eq(groupsOf(sh2),['Flxweroff','Lilith','Unknown Artist'],'shared root with mixed tags: untagged file not assigned the root folder name');
 eq(groupsOf(importBatch(['Album A/01 a.mp3','Album A/02 b.mp3','Album B/01 c.mp3','Album B/02 d.mp3'])),['Unknown Artist (Album A)','Unknown Artist (Album B)'],'untagged single-level albums are not merged into one Unknown Artist');
 // (c) tagged + untagged variants; tag / albumartist wins; case/feat variants merge, nothing fuzzy
 const c=importBatch(['Tagged/Album A/01.mp3','Tagged/Album B/01.mp3','Tagged/Album B/02.mp3','Flxweroff/Album A/03.mp3','x/Flxweroff feat. Lilith/1.mp3'],
  {'Tagged/Album A/01.mp3':{artist:'Flxweroff'},'Tagged/Album B/01.mp3':{albumArtist:'Lilith'},'Tagged/Album B/02.mp3':{artist:'LILITH'},'x/Flxweroff feat. Lilith/1.mp3':{artist:'Flxweroff feat. Lilith'}});
 eq(groupsOf(c),['Flxweroff','Lilith'],'(c) tag wins over folder "Tagged"; albumartist used; LILITH≡Lilith; feat. merges into main artist');
 eq(groupsOf(importBatch(['A/x/1.mp3','B/y/1.mp3'],{'A/x/1.mp3':{artist:'The Testers'},'B/y/1.mp3':{artist:'The Toasters'}})),['The Testers','The Toasters'],'no fuzzy merging in library');
 ok(L4.artistKey('Flxweroff')!=L4.artistKey('Lilith')&&L4.artistKey(' flxWEROFF. ')==L4.artistKey('Flxweroff'),'artistKey exact-ish only');
 // (d) existing renames in localStorage, including legacy broad keys that caused the merge
 const R={artist:{'Unknown Artist':'Flxweroff','':'Flxweroff','Flxweroff':'FLXWEROFF ✓'}};
 eq(groupsOf([...importBatch(['Album A/01 a.mp3','Album A/02 b.mp3'],{},R),...importBatch(Li,{},R),...importBatch(F,{},R)]),['FLXWEROFF ✓','Lilith','Unknown Artist'],'(d) legacy "Unknown Artist"/"" renames ignored; exact key rename applies only to Flxweroff');
 const u=importBatch(['Album A/01 a.mp3','Album A/02 b.mp3','Album B/01 c.mp3','Album B/02 d.mp3']);const R2={};L4.setRename(R2,'artist',[u[0]],'Flxweroff');eq(Object.keys(R2.artist),['folder:Album A'],'renaming an Unknown Artist group is keyed by its folder');
 const u2=importBatch(['Album A/01 a.mp3','Album A/02 b.mp3','Album B/01 c.mp3','Album B/02 d.mp3'],{},JSON.parse(JSON.stringify(R2)));eq(u2.map(t=>t.artist),['Flxweroff','Flxweroff','Unknown Artist','Unknown Artist'],'… and does not spread to other unknown albums');
})();
// ---- v4b exact user repro: Flxweroff root with album subfolders, then Lilith loose singles ----
(()=>{const eq=(a,b,m)=>ok(JSON.stringify(a)==JSON.stringify(b),m+' → '+JSON.stringify(a));
 const fx=["Flxweroff/Some Promises Aren't Forgotten/01 intro.mp3","Flxweroff/Some Promises Aren't Forgotten/02 outro.mp3","Flxweroff/My Broken Hopes/01 intro.mp3","Flxweroff/Listen This/01 intro.mp3","Flxweroff/loose single.mp3"];
 const li=['Lilith/endless night.mp3','Lilith/hollow.mp3','Lilith/drift.mp3'];
 const lib=[...importBatch(fx),...importBatch(li,{'Lilith/hollow.mp3':{title:'hollow (1 hour)'},'Lilith/drift.mp3':{title:'drift'}})];
 eq(groupsOf(lib),['Flxweroff','Lilith'],'repro: Flxweroff root then Lilith singles → 2 artists');
 eq(lib.filter(t=>t.path.startsWith('Lilith')).map(t=>[t.artist,t.album,t.title]),[['Lilith','Singles','endless night'],['Lilith','Singles','hollow (1 hour)'],['Lilith','Singles','drift']],'Lilith loose files: artist=folder, album=Singles, title from tag or filename');
 eq([...new Set(lib.filter(t=>t.path.startsWith('Flxweroff')).map(t=>t.artist+'/'+t.album))],["Flxweroff/Some Promises Aren't Forgotten","Flxweroff/My Broken Hopes","Flxweroff/Listen This","Flxweroff/Singles"],'Flxweroff albums from subfolders; root-level file is a single');
 eq(importBatch(['Album A/01 a.mp3','Album A/02 b.mp3']).map(t=>t.artist+'/'+t.album),['Unknown Artist/Album A','Unknown Artist/Album A'],'a selected folder of numbered tracks is treated as an album, not an artist');
 eq(importBatch(['Music/x.mp3']).map(t=>t.artist+'/'+t.album),['Unknown Artist/Music'],'generic root folder never becomes the artist');
 const tagged=importBatch(['Lilith/t.mp3'],{'Lilith/t.mp3':{title:'T',album:'Real Album'}});eq([tagged[0].artist,tagged[0].album],['Lilith','Real Album'],'album tag kept, folder artist fills missing artist tag');
})();
// ---- v5 manual organization ----
const L5=new Function(lib+';return {makeTrack,applyRenames,applyManual,assignTracks,trackKey,albKeyOf,canonArtists}')();
(()=>{const eq=(a,b,m)=>ok(JSON.stringify(a)==JSON.stringify(b),m+' → '+JSON.stringify(a));
 const mk=(p,size)=>{const t=L5.makeTrack({name:p.split('/').pop(),size},p);t.origArtist=t.artist;t.origAlbum=t.album;t.origTitle=t.title;return t};
 const a=mk('Lilith/drift.mp3',100),b=mk('Lilith/hollow.mp3',200),c=mk('Flxweroff/Album/01 x.mp3',300);
 eq(L5.trackKey(a),'Lilith/drift.mp3|100','track key = path + size');
 const MAN={};L5.assignTracks(MAN,[a,b],{artist:'Lilith',album:'Hour Tapes'});L5.assignTracks(MAN,[c],{artist:'Space Jack'});
 [a,b,c].forEach(t=>{L5.applyRenames(t,{});L5.applyManual(t,MAN)});
 eq([a,b,c].map(t=>t.artist+'/'+t.album),['Lilith/Hour Tapes','Lilith/Hour Tapes','Space Jack/Album'],'manual assignment overrides artist/album; artist-only target keeps album');
 ok(L5.albKeyOf(a)==L5.albKeyOf(b)&&a.manual,'manually assigned tracks share one album key regardless of folder');
 const re=mk('Lilith/drift.mp3',100);L5.applyRenames(re,{});L5.applyManual(re,JSON.parse(JSON.stringify(MAN)));eq(re.artist+'/'+re.album,'Lilith/Hour Tapes','reapplies on re-import (same path+size)');
 const other=mk('Lilith/drift.mp3',999);L5.applyRenames(other,{});L5.applyManual(other,MAN);ok(other.album!='Hour Tapes'&&!other.manual,'different file size → not matched');
})();
