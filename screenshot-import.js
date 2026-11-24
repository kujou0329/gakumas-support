/* Gakumas support card screenshot importer — browser-only beta. */
(()=>{
"use strict";
const style=document.createElement("style");
style.textContent=`
#scan-panel{margin:16px 0;padding:16px;background:#1c2230;border:1px solid #374358;border-radius:14px}
#scan-panel[hidden],#scan-summary[hidden],.scan-problem[hidden]{display:none}
#scan-panel h2{font-size:19px;margin:0 0 9px}
.scan-line{display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin:10px 0}
.scan-line label{min-width:0;display:flex;flex-direction:column;gap:4px;color:#b9c9da;font-size:12px}
.scan-line input[type=file]{max-width:100%}
.scan-line input[type=number]{width:94px}
#scan-preview{position:relative;width:min(100%,340px);margin:8px 0}
#scan-guide{display:block;width:100%;border-radius:7px}
#scan-frames{position:absolute;inset:0}
#scan-frames button{position:absolute;padding:0;border:2px solid #60ffd5;border-radius:4px;background:transparent;touch-action:none;color:#10141e;text-align:left;cursor:move;font-size:11px}
#scan-frames button span{position:absolute;top:0;left:0;background:#60ffd5;padding:0 3px}
#scan-frames button[aria-pressed=true]{border-color:#ffd38f}
#scan-frames button[aria-pressed=true] span{background:#ffd38f}
#scan-frames button:focus-visible{outline:2px solid #fff;outline-offset:2px}
#scan-adjust label{max-width:100%}
#scan-shot{max-width:100%}
#scan-adjust button{padding:6px 9px}#scan-adjust-mode{min-width:155px}#scan-group-hint{font-size:12px;color:#bceadb;line-height:1.5;margin:0 0 5px}
#scan-result{display:grid;gap:7px}
.scan-card{display:grid;grid-template-columns:188px minmax(0,1fr);gap:7px 10px;padding:8px;border:1px solid #46516a;background:#273349;border-radius:10px}
.scan-card header{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:12px}
.scan-card header strong{min-width:0;overflow-wrap:anywhere}
.scan-thumbs{display:grid;grid-template-columns:repeat(2,minmax(0,92px));gap:6px;min-width:0}
.scan-thumb{position:relative;min-width:0}
.scan-thumb img,.scan-thumb .scan-missing{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:5px;border:1px solid #63718a}
.scan-thumb img{cursor:zoom-in}
.scan-thumb span{position:absolute;left:2px;top:1px;padding:1px 5px;background:#0d121dd6;font-size:10px;color:white;pointer-events:none}
.scan-thumb .scan-missing{display:grid;place-items:center;background:#172334;color:#d9e0ec;font-size:11px}
.scan-check{display:flex;flex-shrink:0;align-items:center;gap:4px;font-size:12px;color:#e6f7f2}
.scan-check input{width:19px;height:19px;accent-color:#20a68e}
.scan-fields{display:grid;grid-template-columns:minmax(0,1fr) 62px 56px;gap:5px;align-items:end}
.scan-fields label{display:flex;flex-direction:column;gap:3px;min-width:0;color:#b9c9da;font-size:11px}
.scan-fields input,.scan-fields select{width:100%;min-width:0;font-size:16px;padding:5px 4px}
.scan-details,.scan-problem{font-size:11px;line-height:1.4;margin-top:5px}
.scan-details{color:#b4c4d4}
.scan-details summary{cursor:pointer}
.scan-candidates{display:flex;gap:7px;overflow-x:auto;padding:7px 0}
.scan-candidate{flex:0 0 104px;width:104px;text-align:left;background:#172334;padding:5px;border:1px solid #455671;border-radius:7px}
.scan-candidate img{display:block;width:92px;height:52px;object-fit:cover}
.scan-candidate small{display:block;overflow-wrap:anywhere}
.scan-problem{color:#ffbd8e}
.scan-card.scan-invalid{border-color:#e49d6c}
.scan-summary{position:sticky;bottom:max(7px,env(safe-area-inset-bottom));background:#142136f7;border:1px solid #426679;border-radius:11px;padding:8px;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:5px 8px;flex-wrap:wrap;margin-top:7px}
.scan-summary button{flex:0 0 auto}
.scan-summary strong,#scan-message,#scan-import-message{font-size:13px}
#scan-message,#scan-import-message{color:#bceadb}
#scan-import-message{flex-basis:100%;margin:0}
#scan-import-message:empty{display:none}
#scan-zoom{max-width:min(95vw,920px);width:95vw;padding:14px;background:#192438;color:white;border:1px solid #66758f;border-radius:13px}
#scan-zoom::backdrop{background:#050b13d9}
#scan-zoom img{width:100%;height:auto;max-height:62vh;object-fit:contain}
#scan-zoom h3{font-size:15px;margin:0 0 10px}
@media(max-width:520px){.scan-card{grid-template-columns:minmax(0,1fr)}}
`;
document.head.append(style);
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const toggle=document.createElement("button");toggle.type="button";toggle.setAttribute("aria-controls","scan-panel");toggle.setAttribute("aria-expanded","false");toggle.textContent="從遊戲截圖讀取";
document.querySelector(".actions").append(toggle);
const box=document.createElement("section");box.id="scan-panel";box.hidden=true;
box.innerHTML=[
'<h2>支援卡截圖匯入（測試版）</h2>',
'<p style="font-size:12px;line-height:1.6;color:#b9c9da">適用於遊戲內「每列三張卡」的持有列表截圖。圖片只在瀏覽器中處理；會先產生待確認清單，<b>不會自動更動收藏</b>。請確認卡名、突破與等級後才勾選匯入。</p>',
'<div class="scan-line">',
'<label>上傳截圖（最多 20 張）<input id="scan-files" type="file" multiple accept="image/png,image/jpeg,image/webp"></label>',
'</div>',
 '<div id="scan-preview-controls" hidden><div class="scan-line" id="scan-adjust">',
'<label>預覽截圖<select id="scan-shot"></select></label>',
'<label>微調步長<select id="scan-step"><option>1</option><option>2</option><option selected>3</option><option>4</option><option>5</option></select></label>',
'<label>調整方式<select id="scan-adjust-mode"><option value="group" selected>整組平移（推薦）</option><option value="single">單張微調</option></select></label>',
'<button type="button" id="scan-add">新增裁切框</button><button type="button" id="scan-remove">移除選取框</button>',
'<button type="button" data-move="ArrowLeft" aria-label="裁切框左移">←</button><button type="button" data-move="ArrowUp" aria-label="裁切框上移">↑</button><button type="button" data-move="ArrowDown" aria-label="裁切框下移">↓</button><button type="button" data-move="ArrowRight" aria-label="裁切框右移">→</button>',
'</div><p id="scan-group-hint">預設拖動任一綠框，或按方向鍵，即可讓目前截圖的全部裁切框一起平移；各張截圖獨立調整。</p><div id="scan-preview"><canvas id="scan-guide" aria-label="截圖裁切預覽"></canvas><div id="scan-frames"></div></div></div>',
'<div class="scan-line">',
'<button id="scan-start" class="primary" type="button" disabled>辨識已確認的裁切框</button>',
'<label style="flex-direction:row;align-items:center"><input id="scan-use-ocr" type="checkbox" checked>讀取等級（OCR 首次需載入免費元件）</label>',
'</div>',
'<p id="scan-message" role="status"></p>',
 '<div id="scan-result"></div>',
'<div id="scan-summary" class="scan-summary" hidden><strong id="scan-count">尚未選取</strong><button id="scan-save" class="primary" type="button">確認匯入</button><p id="scan-import-message" role="status"></p></div>',
'<datalist id="scan-names"></datalist>'
].join("");
document.querySelector(".top").after(box);
toggle.onclick=()=>{box.hidden=!box.hidden;toggle.setAttribute("aria-expanded",String(!box.hidden));if(!box.hidden)box.scrollIntoView({behavior:"smooth",block:"start"})};
const cards=CATALOG.cards, lookup=new Map(cards.map(c=>[c.name,c]));
for(const c of cards){const opt=document.createElement("option");opt.value=c.name;$("scan-names").append(opt)}
let screenshots=[],items=[],reference=null,running=false,uploadVersion=0;
const say=s=>{$("scan-message").textContent=s};
const importStatus=s=>{$("scan-import-message").textContent=s};
// Work on a bounded canvas so wide or high-resolution phone captures stay inexpensive.
function detectFrames(img){
  const scale=Math.min(1,590/img.width,1800/img.height);
  const c=canvas(img.width*scale,img.height*scale),w=c.width,h=c.height;
  const ctx=c.getContext("2d",{willReadFrequently:true});
  ctx.drawImage(img,0,0,w,h);
  const rgba=ctx.getImageData(0,0,w,h).data;
  const gray=new Uint8Array(w*h);
  for(let i=0;i<gray.length;i++)gray[i]=.299*rgba[i*4]+.587*rgba[i*4+1]+.114*rgba[i*4+2];
  const at=(x,y)=>gray[y*w+x];
  const margin=Math.max(2,Math.round(w*.007));
  const cardWidth=Math.round(w*.294);
  if(cardWidth<20)return [];
  const cardHeight=cardWidth*9/16;
  const found=[];
  for(let column=0;column<3;column++){
    const left=Math.round(w*(.045+column*.307)),right=left+cardWidth;
    const top=new Float32Array(h),bottom=new Float32Array(h);
    const sampleStep=Math.max(1,Math.round(w/250));
    for(let y=4;y<h-4;y++){
      let starts=0,ends=0,samples=0;
      for(let x=left+Math.round(cardWidth*.12);x<right-Math.round(cardWidth*.12);x+=sampleStep){
        const dark=Math.min(at(x,y-1),at(x,y),at(x,y+1))<178;
        if(dark&&Math.max(at(x,y-4),at(x,y-3))>=222)starts++;
        if(dark&&Math.max(at(x,y+3),at(x,y+4))>=222)ends++;
        samples++;
      }
      top[y]=starts/samples;bottom[y]=ends/samples;
    }
    const candidates=[];
    for(let y=4;y<h-Math.round(cardHeight)-4;y++){
      if(top[y]<.53)continue;
      let end=0;
      for(let k=y+Math.round(cardHeight*.94);k<h-4&&k<=y+Math.round(cardHeight*1.07);k++){
        if(bottom[k]>(bottom[end]||0))end=k;
      }
      if(!end||bottom[end]<.47)continue;
      const sides=[findSide(left,1,y,end),findSide(right,-1,y,end)];
      if(sides.some(side=>side.score<.6))continue;
      // The game overlay draws across inter-column gutters. Refuse interrupted borders.
      if(sides.some(side=>side.covered>=Math.max(3,Math.round(w*.009))))continue;
      candidates.push({x:sides[0].x,y,end,right:sides[1].x,score:top[y]+bottom[end]+sides[0].score+sides[1].score,col:column+1});
    }
    const keep=[];
    for(const frame of candidates.sort((a,b)=>b.score-a.score||a.y-b.y)){
      if(keep.every(other=>Math.abs(other.y-frame.y)>cardHeight*.6))keep.push(frame);
    }
    found.push(...keep);
  }
  function findSide(expected,direction,top,bottom){
    let best={score:0,x:expected,covered:0};
    const radius=Math.max(2,Math.round(w*.012));
    for(let x=expected-radius;x<=expected+radius;x++){
      let matched=0,total=0,covered=0;
      for(let y=top+margin;y<bottom-margin;y++){
        const outside=at(x-direction*margin,y);
        const edge=Math.min(at(x-1,y),at(x,y),at(x+1,y));
        if(outside<187)covered++;
        if(outside>=224&&outside-edge>45)matched++;
        total++;
      }
      const score=matched/total-Math.abs(x-expected)*.012;
      if(score>best.score)best={x,score,covered};
    }
    return best;
  }
  const rows=[];
  for(const frame of found.sort((a,b)=>a.y-b.y)){
    let row=rows.find(row=>Math.abs(row[0].y-frame.y)<cardHeight*.15);
    if(!row){row=[];rows.push(row)}
    row.push(frame);
  }
  return rows.flatMap((row,i)=>row.sort((a,b)=>a.col-b.col).map(frame=>({
    x:Math.round(frame.x*img.width/w),y:Math.round(frame.y*img.height/h),
    w:Math.round((frame.right-frame.x+1)*img.width/w),h:Math.round((frame.end-frame.y+1)*img.height/h),
    row:i+1,col:frame.col
  })));
}
function canvas(w,h){const c=document.createElement("canvas");c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c}
function loadImage(url){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error("圖片無法載入"));img.src=url})}
let shotIndex=0,frameIndex=-1,drag=null;
const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
function activeShot(){return screenshots[shotIndex]}
function selectedFrame(){return activeShot()?.frames[frameIndex]}
function groupMode(){return $("scan-adjust-mode").value==="group"}
async function onFiles(){
  const version=++uploadVersion;
  screenshots=[];items=[];importStatus("");render();
  $("scan-preview-controls").hidden=true;
  $("scan-start").disabled=true;
  const files=Array.from($("scan-files").files||[]).slice(0,20);
  const loaded=[],failed=[];
  for(const file of files){
    const url=URL.createObjectURL(file);
    try{
      const img=await loadImage(url);
      if(version!==uploadVersion)return;
      loaded.push({file:file.name,img,frames:detectFrames(img)});
    }catch(err){failed.push(file.name)}
    finally{URL.revokeObjectURL(url)}
    if(version!==uploadVersion)return;
  }
  screenshots=loaded;
  shotIndex=0;frameIndex=-1;drag=null;
  const select=$("scan-shot");
  select.replaceChildren(...screenshots.map((shot,i)=>new Option((i+1)+" · "+shot.file,i)));
  $("scan-preview-controls").hidden=!screenshots.length;
  if(screenshots.length)drawGuide();
  else say("請上傳可讀取的 PNG、JPEG 或 WebP 截圖。");
  if(failed.length)say($("scan-message").textContent+" 讀取失敗："+failed.join("、"));
}
$("scan-files").onchange=onFiles;
function drawGuide(){
  const {img}=activeShot(),c=$("scan-guide");
  c.height=570;c.width=Math.round(c.height*img.width/img.height);
  c.getContext("2d").drawImage(img,0,0,c.width,c.height);
  renderFrames();
}
function syncFrame(button,frame){
  const {img}=activeShot();
  button.style.cssText=`left:${frame.x/img.width*100}%;top:${frame.y/img.height*100}%;width:${frame.w/img.width*100}%;height:${frame.h/img.height*100}%`;
}
function selectFrame(index){
  frameIndex=index;
  for(const button of $("scan-frames").children)button.setAttribute("aria-pressed",String(Number(button.dataset.frame)===index));
  $("scan-remove").disabled=index<0;
  const hasFrames=Boolean(activeShot()?.frames.length);
  for(const button of box.querySelectorAll("[data-move]"))button.disabled=running||!hasFrames||(!groupMode()&&index<0);
}
function renderFrames(){
  const frames=activeShot().frames;
  $("scan-frames").replaceChildren(...frames.map((frame,i)=>{
    const button=document.createElement("button");
    button.type="button";button.dataset.frame=i;
    button.setAttribute("aria-label","裁切框 "+(i+1));
    button.innerHTML="<span>"+(i+1)+"</span>";
    syncFrame(button,frame);
    return button;
  }));
  selectFrame(frameIndex);
  $("scan-start").disabled=!screenshots.some(shot=>shot.frames.length);
  say(frames.length?"此截圖有 "+frames.length+" 個裁切框。"+(groupMode()?"拖曳任一框或用方向鍵，就能整組平移。":"目前是單張微調模式。")+" 遮擋的卡片可移除。":"此截圖找不到完整卡框，可新增裁切框後拖曳至完整卡片。");
}
function moveFrame(x,y){
  const frame=selectedFrame();
  if(!frame||running)return;
  const {img}=activeShot();
  frame.x=Math.round(Math.max(0,Math.min(img.width-frame.w,x)));
  frame.y=Math.round(Math.max(0,Math.min(img.height-frame.h,y)));
  syncFrame($("scan-frames").children[frameIndex],frame);
}
function shiftGroup(dx,dy){
  const shot=activeShot();
  if(!shot?.frames.length||running)return {dx:0,dy:0};
  const frames=shot.frames;
  const minX=Math.max(...frames.map(f=>-f.x));
  const maxX=Math.min(...frames.map(f=>shot.img.width-f.w-f.x));
  const minY=Math.max(...frames.map(f=>-f.y));
  const maxY=Math.min(...frames.map(f=>shot.img.height-f.h-f.y));
  dx=Math.round(Math.max(minX,Math.min(maxX,dx)));
  dy=Math.round(Math.max(minY,Math.min(maxY,dy)));
  frames.forEach((f,i)=>{f.x+=dx;f.y+=dy;syncFrame($("scan-frames").children[i],f)});
  return {dx,dy};
}
function nudge(key){
  if(!moves[key])return;
  const [dx,dy]=moves[key],step=Number($("scan-step").value);
  if(groupMode()){shiftGroup(dx*step,dy*step);return}
  const frame=selectedFrame();if(frame)moveFrame(frame.x+dx*step,frame.y+dy*step);
}
$("scan-adjust-mode").onchange=()=>renderFrames();
$("scan-shot").onchange=e=>{shotIndex=Number(e.target.value);frameIndex=-1;drag=null;drawGuide()};
$("scan-frames").onclick=e=>{const button=e.target.closest("[data-frame]");if(button&&!running)selectFrame(Number(button.dataset.frame))};
$("scan-frames").onkeydown=e=>{
  const button=e.target.closest("[data-frame]");
  if(button&&moves[e.key]&&!running){e.preventDefault();selectFrame(Number(button.dataset.frame));nudge(e.key)}
};
$("scan-frames").onpointerdown=e=>{
  const button=e.target.closest("[data-frame]");
  if(!button||running||e.button!==0)return;
  selectFrame(Number(button.dataset.frame));
  const frame=selectedFrame();
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,frameX:frame.x,frameY:frame.y,group:groupMode(),appliedX:0,appliedY:0};
  button.setPointerCapture(e.pointerId);
};
$("scan-frames").onpointermove=e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const bounds=$("scan-guide").getBoundingClientRect(),{img}=activeShot();
  const offsetX=Math.round((e.clientX-drag.x)*img.width/bounds.width);
  const offsetY=Math.round((e.clientY-drag.y)*img.height/bounds.height);
  if(drag.group){
    const moved=shiftGroup(offsetX-drag.appliedX,offsetY-drag.appliedY);
    drag.appliedX+=moved.dx;drag.appliedY+=moved.dy;
  }else moveFrame(drag.frameX+offsetX,drag.frameY+offsetY);
};
$("scan-frames").onlostpointercapture=()=>{drag=null};
for(const button of box.querySelectorAll("[data-move]"))button.onclick=()=>nudge(button.dataset.move);
$("scan-add").onclick=()=>{
  const {img,frames}=activeShot();
  const w=Math.round(img.width*.294),h=Math.min(img.height,Math.round(w*9/16));
  frames.push({x:Math.round((img.width-w)/2),y:Math.round((img.height-h)/2),w,h,row:null,col:null});
  frameIndex=frames.length-1;renderFrames();$("scan-frames").children[frameIndex].focus();
};
$("scan-remove").onclick=()=>{
  if(frameIndex<0)return;
  activeShot().frames.splice(frameIndex,1);
  frameIndex=-1;renderFrames();
};
function cut(img,r){const c=canvas(210,116);c.getContext("2d").drawImage(img,r.x,r.y,r.w,r.h,0,0,210,116);return c}
function feature(img,dx=0,dy=0){
const c=canvas(20,12),ctx=c.getContext("2d",{willReadFrequently:true});
ctx.drawImage(img,img.width*(.035+dx),img.height*(.04+dy),img.width*.93,img.height*.61,0,0,20,12);
const data=ctx.getImageData(0,0,20,12).data,texture=[],color=[];
for(let channel=0;channel<3;channel++){
let a=[];for(let i=channel;i<data.length;i+=4)a.push(data[i]);
const avg=a.reduce((s,x)=>s+x,0)/a.length;
const sd=Math.sqrt(a.reduce((s,x)=>s+(x-avg)*(x-avg),0)/a.length)+16;
color.push(avg/90);
for(const n of a)texture.push((n-avg)/sd);
}
return {texture,color};
}
function averageSquaredDistance(a,b){
  let sum=0;
  for(let i=0;i<a.length;i++)sum+=(a[i]-b[i])**2;
  return sum/a.length;
}
function metric(a,b){
  return averageSquaredDistance(a.texture,b.texture)+averageSquaredDistance(a.color,b.color)/3;
}
async function references(){
if(reference)return reference;
const list=cards.filter(c=>cardImages[c.id]?.path);if(!list.length)throw Error("卡圖尚未載入，請先確認顯示 213 張卡圖後重試");
let i=0,found=[],bad=0;
await Promise.all(Array.from({length:6},async()=>{while(i<list.length){const c=list[i++];try{
const img=await loadImage("./"+cardImages[c.id].path);
found.push({id:c.id,name:c.name,v:feature(img)});
}catch(e){bad++}
if(i%35===0)say("準備比對卡圖："+i+"/"+list.length);
}}));
if(!found.length)throw Error("參考卡圖全部載入失敗");
reference=found;say("參考卡圖可用："+found.length+" 張；載入失敗："+bad+" 張。");return found;
}
function guessLimit(tile){
const ctx=tile.getContext("2d",{willReadFrequently:true});
const d=ctx.getImageData(0,0,tile.width,tile.height).data,w=tile.width,h=tile.height;
function bright(cx){let yes=0,total=0;for(let y=Math.floor(h*.73);y<Math.floor(h*.89);y++)
for(let x=Math.floor(w*(cx-.035));x<Math.floor(w*(cx+.035));x++){
if(x<0||x>=w)continue;const k=(y*w+x)*4,r=d[k],g=d[k+1],b=d[k+2];total++;
if(r>170&&g>148&&b>160&&Math.max(r,g,b)-Math.min(r,g,b)<100)yes++;
}return yes/(total||1)}
const scores=[.29,.40,.51,.62].map(bright),flags=scores.map(v=>v>.29);
const prefix=flags.every((v,i)=>!v||flags.slice(0,i).every(Boolean));
return {value:prefix?flags.filter(Boolean).length:null,certainty:prefix&&scores.every(v=>v<.14||v>.42)?"看似清楚":"需確認"};
}
const OCR_DIST="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/";
const OCR_LANG="https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int";
function deadline(promise,ms,message){
  let timer;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),ms)});
  return Promise.race([promise,timeout]).finally(()=>clearTimeout(timer));
}
async function createOCR(){
  if(!window.Tesseract){
    const script=document.createElement("script");
    script.src=OCR_DIST+"tesseract.min.js";
    try{
      await deadline(new Promise((resolve,reject)=>{
        script.onload=resolve;
        script.onerror=()=>reject(new Error("無法下載 OCR 元件"));
        document.head.append(script);
      }),15000,"下載 OCR 元件逾時");
    }catch(err){script.remove();throw err}
  }
  let fail;
  const failure=new Promise((_,reject)=>{fail=reject});
  const pending=window.Tesseract.createWorker("eng",1,{
    workerPath:OCR_DIST+"worker.min.js",
    corePath:"https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1",
    langPath:OCR_LANG,
    errorHandler:error=>fail(new Error(String(error)))
  });
  const initialization=Promise.race([pending,failure]);
  let worker;
  try{
    worker=await deadline(initialization,30000,"啟動 OCR 逾時");
    await deadline(worker.setParameters({tessedit_char_whitelist:"0123456789",tessedit_pageseg_mode:"7"}),10000,"設定 OCR 逾時");
    return worker;
  }catch(err){
    if(worker)await worker.terminate().catch(()=>{});
    else pending.then(late=>late.terminate()).catch(()=>{});
    throw err;
  }
}
async function readLevel(worker,tile,{top,right,height,threshold}){
  const c=canvas(184,110),ctx=c.getContext("2d",{willReadFrequently:true});
  ctx.fillStyle="#000";
  ctx.fillRect(0,0,c.width,c.height);
  ctx.drawImage(tile,0,tile.height*top,tile.width*right,tile.height*height,12,12,160,86);
  const pixels=ctx.getImageData(0,0,c.width,c.height),d=pixels.data;
  for(let k=0;k<d.length;k+=4){
    const luminance=.299*d[k]+.587*d[k+1]+.114*d[k+2];
    d[k]=d[k+1]=d[k+2]=luminance>=threshold?0:255;
  }
  ctx.putImageData(pixels,0,0);
  const {data}=await deadline(worker.recognize(c),10000,"辨識等級逾時");
  const digits=data.text.trim(),level=Number(digits);
  return /^\d{1,2}$/.test(digits)&&level>=1&&level<=60&&data.confidence>=60?level:null;
}
async function guessLevel(worker,tile){
  const level=await readLevel(worker,tile,{top:.69,right:.21,height:.22,threshold:220});
  return level??await readLevel(worker,tile,{top:.71,right:.245,height:.25,threshold:175});
}
async function scan(){
if(running)return;
if(!screenshots.length){say("請先上傳截圖");return}
const controls=box.querySelectorAll("input,select,#scan-start,#scan-adjust button,#scan-frames button");
running=true;
for(const control of controls)control.disabled=true;
items=[];importStatus("");render();let worker=null,ocrIssue="";
const useOCR=$("scan-use-ocr").checked;
try{
const ref=await references();
if(useOCR){try{say("準備 OCR 元件…");worker=await createOCR()}catch(e){ocrIssue="OCR 無法使用，請手動填寫等級。";console.warn(e)}}
for(const [shotIndex,shot] of screenshots.entries())for(const [index,b] of shot.frames.entries()){
const tile=cut(shot.img,b),fv=feature(tile);
if(fv.texture.every(value=>Math.abs(value)<.05))continue;
const samples=[{fv,penalty:0}];
for(const dx of [-.023,0,.023])for(const dy of [-.032,0,.032]){
  if(dx||dy)samples.push({fv:feature(tile,dx,dy),penalty:dx&&dy ? .008 : .004});
}
const top=ref.map(c=>({id:c.id,name:c.name,d:Math.min(...samples.map(sample=>metric(sample.fv,c.v)+sample.penalty))})).sort((a,b)=>a.d-b.d).slice(0,3);
const br=guessLimit(tile);
let lv=null;
if(worker)try{
  lv=await guessLevel(worker,tile);
  if(lv===null){
    // A border detector can land just inside the outline and clip a digit stroke.
    const pad=b.w/174;
    const expanded=cut(shot.img,{
      x:Math.max(0,b.x-pad),y:Math.max(0,b.y-pad),
      w:Math.min(shot.img.width-b.x,b.w+pad),h:Math.min(shot.img.height-b.y,b.h+2*pad)
    });
    lv=await guessLevel(worker,expanded);
  }
}catch(e){
  ocrIssue="OCR 中途停止，請手動補齊空白等級。";
  const failedWorker=worker;worker=null;
  await failedWorker.terminate().catch(()=>{});
}
items.push({file:shot.file,shot:shotIndex+1,row:b.row,col:b.col,frame:index+1,name:top[0]?.name||"",id:top[0]?.id||"",limit:br.value,
level:lv,levelReason:!useOCR?"OCR 已關閉":ocrIssue?ocrIssue.startsWith("OCR 中途")?"OCR 中途停止":"OCR 無法載入":"OCR 未能可靠辨識",candidates:top,certainty:br.certainty,confirmed:false,thumb:tile.toDataURL("image/jpeg",.85)});
say("已辨識 "+items.length+" 個卡片位置…");
}
render();say((items.length?"辨識完成："+items.length+" 個位置，請逐張核對後勾選匯入。":"完整裁切框內沒有偵測到卡面，請檢查截圖與裁切位置。")+" "+ocrIssue);
}catch(e){say("辨識失敗："+e.message)}finally{if(worker)try{await worker.terminate()}catch(e){};running=false;for(const control of controls)control.disabled=false;selectFrame(frameIndex)}
}
$("scan-start").onclick=scan;

const zoom=document.createElement("dialog");
zoom.id="scan-zoom";
zoom.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><h3 id="scan-zoom-label">圖片對照</h3><button id="scan-zoom-close" type="button">關閉</button></div><img id="scan-zoom-image" alt="卡面放大對照">';
box.append(zoom);
$("scan-zoom-close").onclick=()=>zoom.close();
zoom.addEventListener("click",e=>{if(e.target===zoom)zoom.close()});
function invalidField(r){
  if(!r.id||lookup.get(r.name)?.id!==r.id)return "name";
  if(!Number.isInteger(r.limit)||r.limit<0||r.limit>4)return "limit";
  if(!Number.isInteger(r.level)||r.level<1||r.level>60)return "level";
  return "";
}
function issue(r){
  return {name:"請選擇有效的卡片名稱",limit:"請確認突破數（0～4 凸）",level:levelIssue(r)}[invalidField(r)]||"";
}
function levelIssue(r){
  return r.levelReason+"，請手動填入 Lv1～60。";
}
function referenceImage(r){
  const ref=cardImage(r.id);
  return (ref?'<img src="'+esc(ref)+'" data-zoom="'+esc(ref)+'" data-zoom-label="資料庫卡圖：'+esc(r.name)+'" alt="資料庫參考卡圖" loading="lazy">':'<div class="scan-missing">無參考圖片</div>')+'<span>資料庫對照</span>';
}
function cardImage(id){
  const path=cardImages[id]?.path;
  return path?"./"+path:"";
}
function render(){
  $("scan-summary").hidden=!items.length;
  $("scan-result").innerHTML=items.map((r,i)=>{
    const opts=[null,0,1,2,3,4].map(v=>'<option value="'+(v===null?"":v)+'"'+(r.limit===v?" selected":"")+'>'+(v===null?"未知":v+"凸")+'</option>').join("");
    const candidates=r.candidates.map(c=>{
      const src=cardImage(c.id);
      return '<button type="button" class="scan-candidate" data-candidate="'+esc(c.name)+'">'+
        (src?'<img src="'+esc(src)+'" alt="'+esc(c.name)+'" loading="lazy">':'')+
        '<small>'+esc(c.name)+'</small></button>';
    }).join("");
    return '<article class="scan-card" data-i="'+i+'">'+
      '<header><strong title="'+esc(r.file)+'"><span class="scan-position">'+(screenshots.length>1?'圖 '+r.shot+' · ':'')+(r.row?r.row+'-'+r.col:'框 '+r.frame)+'</span> <span class="scan-name">'+esc(r.name)+'</span></strong>'+
      '<label class="scan-check"><input type="checkbox" data-field="confirmed"'+(r.confirmed?' checked':'')+'>核對</label></header>'+
      '<div class="scan-thumbs"><div class="scan-thumb"><img src="'+r.thumb+'" data-zoom="'+r.thumb+'" data-zoom-label="遊戲截圖：第'+r.frame+' 個裁切框" alt="遊戲截圖裁切"><span>遊戲截圖</span></div>'+
      '<div class="scan-thumb scan-reference">'+referenceImage(r)+'</div></div>'+
      '<div class="scan-main">'+
      '<div class="scan-fields"><label>卡名<input data-field="name" list="scan-names" value="'+esc(r.name)+'"></label>'+
      '<label>突破<select data-field="limit">'+opts+'</select></label>'+
      '<label>等級<input data-field="level" type="number" min="1" max="60" inputmode="numeric" value="'+(r.level??"")+'" placeholder="未知" aria-describedby="scan-problem-'+i+'"></label></div>'+
      '<details class="scan-details"><summary>辨識候選（點圖可切換卡名） · 突破：'+esc(r.certainty)+'</summary><div class="scan-candidates">'+candidates+'</div></details>'+
       '<div class="scan-problem" id="scan-problem-'+i+'" hidden></div>'+
      '</div></article>';
  }).join("");
  $("scan-result").querySelectorAll(".scan-card").forEach((item,i)=>updateRow(item,items[i]));
  updateSummary();
}
function updateRow(item,r){
  const invalid=r.confirmed&&issue(r);
  const warning=invalid||(r.level===null?levelIssue(r):"");
  const notice=item.querySelector(".scan-problem");
  notice.textContent=warning;
  notice.hidden=!warning;
  item.classList.toggle("scan-invalid",Boolean(invalid));
}
function updateSummary(){
  const selected=items.filter(r=>r.confirmed),incomplete=selected.filter(r=>issue(r));
  const ok=selected.length-incomplete.length;
  $("scan-count").textContent="已勾選 "+selected.length+" 張 · 資料完整 "+ok+" 張"+(incomplete.length?" · 待補 "+incomplete.length+" 張":"");
  $("scan-save").textContent="確認匯入 "+ok+" 張";
}
$("scan-result").onchange=e=>{
  const item=e.target.closest(".scan-card");if(!item)return;
  const r=items[Number(item.dataset.i)],field=e.target.dataset.field;
  if(field==="name"){
    r.name=e.target.value.trim();
    r.id=lookup.get(r.name)?.id||"";
    item.querySelector(".scan-reference").innerHTML=referenceImage(r);
    item.querySelector(".scan-name").textContent=r.name;
  }
  if(field==="limit")r.limit=e.target.value===""?null:Number(e.target.value);
  if(field==="level"){
    const n=e.target.valueAsNumber;
    r.level=Number.isInteger(n)&&n>=1&&n<=60?n:null;
    r.levelReason=e.target.validity.badInput||e.target.value?"等級須為整數 1～60":"等級尚未填寫";
  }
  if(field==="confirmed")r.confirmed=e.target.checked;
  else{
    r.confirmed=false;
    item.querySelector('[data-field="confirmed"]').checked=false;
  }
  importStatus("");
  updateRow(item,r);
  updateSummary();
};
$("scan-result").onclick=e=>{
  const image=e.target.closest("[data-zoom]");
  if(image){
    $("scan-zoom-image").src=image.dataset.zoom;
    $("scan-zoom-label").textContent=image.dataset.zoomLabel||"卡面對照";
    zoom.showModal();
    return;
  }
  const candidate=e.target.closest("[data-candidate]");
  if(candidate){
    const name=candidate.closest(".scan-card").querySelector('[data-field="name"]');
    name.value=candidate.dataset.candidate;
    name.dispatchEvent(new Event("change",{bubbles:true}));
  }
};
function saveSelections(){
  const chosen=items.filter(r=>r.confirmed);
  if(!chosen.length){importStatus("請先核對卡片圖片和數值，並勾選想匯入的卡片。");$("scan-summary").scrollIntoView({behavior:"smooth",block:"center"});return}
  const firstInvalid=chosen.find(r=>issue(r));
  if(firstInvalid){
    const problem=issue(firstInvalid);
    importStatus("還有 "+chosen.filter(r=>issue(r)).length+" 張已勾選的卡片資料不完整："+problem+"。請填完後再匯入。");
    const target=$("scan-result").querySelector('.scan-card[data-i="'+items.indexOf(firstInvalid)+'"]');
    if(target){target.scrollIntoView({behavior:"smooth",block:"center"});const field=invalidField(firstInvalid);target.querySelector('[data-field="'+field+'"]')?.focus({preventScroll:true})}
    return;
  }
  const seen=new Set(),duplicates=[];
  for(const r of chosen){if(seen.has(r.id))duplicates.push(r.name);seen.add(r.id)}
  if(duplicates.length){importStatus("同張卡在多張截圖中重複勾選，請只保留一筆："+duplicates.join("、"));return}
  const changed=chosen.filter(r=>own[r.id]?.status==="owned"&&(own[r.id]?.limit!==r.limit||own[r.id]?.level!==r.level));
  if(!confirm("將匯入 "+chosen.length+" 張卡，其中 "+changed.length+" 張會更新先前的突破或等級。確定？"))return;
  const next={...own};
  for(const r of chosen)next[r.id]={...own[r.id],status:"owned",limit:r.limit,level:r.level};
  if(!persist(next)){importStatus("儲存失敗，收藏沒有被修改。請先匯出 JSON 備份。");return}
  own=next;draw();
  const message="已儲存 "+chosen.length+" 張！可以匯出 JSON 備份。";
  say(message);importStatus(message);
  items=items.filter(r=>!r.confirmed);render();
}
$("scan-save").onclick=saveSelections;
})();