/* Gakumas support card screenshot importer — browser-only beta. */
(()=>{
"use strict";
const style=document.createElement("style");
style.textContent='#scan-panel{margin:16px 0;padding:16px;background:#1c2230;border:1px solid #374358;border-radius:14px}#scan-panel[hidden],#scan-finish[hidden]{display:none}#scan-panel h2{font-size:19px;margin:0 0 9px}.scan-line{display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin:10px 0}.scan-line label{min-width:0;display:flex;flex-direction:column;gap:4px;color:#b9c9da;font-size:12px}.scan-line input[type=file]{max-width:100%}.scan-line input[type=number]{width:94px}.scan-line small{color:#b9c9da}#scan-guide{display:block;max-width:290px;width:100%;border:1px solid #46516a;border-radius:7px}#scan-result{display:grid;gap:10px}.scan-card{display:grid;grid-template-columns:106px minmax(0,1fr);gap:10px;padding:10px;border:1px solid #46516a;background:#273349;border-radius:10px}.scan-card>img{width:106px;height:62px;object-fit:cover}.scan-card header strong{min-width:0;overflow-wrap:anywhere}.scan-card header{font-size:12px;display:flex;justify-content:space-between;gap:6px}.scan-card small{color:#bbc9d9;font-size:11px}.scan-fields{display:grid;grid-template-columns:minmax(0,1fr) 80px 80px;gap:7px;margin:8px 0}.scan-fields label{font-size:11px;color:#b9c9da;min-width:0}.scan-fields select,.scan-fields input{width:100%;padding:7px 5px;min-width:0}.scan-flag{color:#ffd38f}#scan-message{min-height:20px;color:#88e1ce;font-size:13px}@media(max-width:520px){.scan-card{grid-template-columns:84px minmax(0,1fr)}.scan-card>img{width:84px;height:51px}.scan-fields{grid-template-columns:1fr 1fr}.scan-fields label:first-child{grid-column:1/-1}}';
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
'<label>第一列頂端 %<input id="scan-top" type="number" min="10" max="80" step="0.1" value="32.9"></label>',
'<label>左側邊距 %<input id="scan-left" type="number" min="0" max="20" step="0.1" value="4.4"></label>',
'<label>辨識列數<select id="scan-rows"><option>1</option><option>2</option><option>3</option><option selected>4</option><option>5</option><option>6</option></select></label>',
'</div><div class="scan-line">',
'<button id="scan-check" type="button">檢查裁切框</button><button id="scan-start" class="primary" type="button">辨識截圖</button>',
'<label style="flex-direction:row;align-items:center"><input id="scan-use-ocr" type="checkbox" checked>讀取等級（OCR 首次需載入免費元件）</label>',
'</div>',
'<canvas id="scan-guide" hidden></canvas><p id="scan-message" role="status"></p>',
'<div id="scan-result"></div>',
'<div class="scan-line" id="scan-finish" hidden><button id="scan-save" class="primary" type="button">確認並寫入勾選卡片</button>',
'<small>不會把沒出現在截圖裡的卡片設為未持有；不會在未確認前覆蓋舊資料。</small></div>',
'<datalist id="scan-names"></datalist>'
].join("");
document.querySelector(".top").after(box);
toggle.onclick=()=>{box.hidden=!box.hidden;toggle.setAttribute("aria-expanded",String(!box.hidden));if(!box.hidden)box.scrollIntoView({behavior:"smooth",block:"start"})};
const cards=CATALOG.cards, lookup=new Map(cards.map(c=>[c.name,c]));
for(const c of cards){const opt=document.createElement("option");opt.value=c.name;$("scan-names").append(opt)}
let screenshots=[],items=[],reference=null,running=false,uploadVersion=0;
const say=s=>{$("scan-message").textContent=s};
function percent(id,fallback,min,max){
  const value=$(id).valueAsNumber;
  return Number.isFinite(value)?Math.max(min,Math.min(max,value/100)):fallback;
}
function settings(){
  return {top:percent("scan-top",.329,.1,.8),left:percent("scan-left",.044,0,.2),rows:Number($("scan-rows").value)};
}
function cropAreas(img,layout){
  const areas=[];
  for(let row=0;row<layout.rows;row++)for(let col=0;col<3;col++){
    const x=(layout.left+col*.307)*img.width;
    const y=layout.top*img.height+row*.176*img.width;
    const w=.294*img.width,h=.163*img.width;
    if(x+w<=img.width&&y+h<=img.height)areas.push({row:row+1,col:col+1,x,y,w,h});
  }
  return areas;
}
function canvas(w,h){const c=document.createElement("canvas");c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c}
function loadImage(url){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error("圖片無法載入"));img.src=url})}
async function onFiles(){
  const version=++uploadVersion;
  screenshots=[];items=[];render();
  $("scan-guide").hidden=true;
  $("scan-start").disabled=true;
  const files=Array.from($("scan-files").files||[]).slice(0,20);
  const loaded=[],failed=[];
  for(const file of files){
    const url=URL.createObjectURL(file);
    try{loaded.push({file:file.name,img:await loadImage(url)})}
    catch(err){failed.push(file.name)}
    finally{URL.revokeObjectURL(url)}
    if(version!==uploadVersion)return;
  }
  screenshots=loaded;
  $("scan-start").disabled=false;
  if(screenshots.length)drawGuide();
  else say("請上傳可讀取的 PNG、JPEG 或 WebP 截圖。");
  if(failed.length)say($("scan-message").textContent+" 讀取失敗："+failed.join("、"));
}
$("scan-files").onchange=onFiles;
function drawGuide(){
  if(!screenshots.length){say("請先上傳一張遊戲截圖");return}
  const img=screenshots[0].img,c=$("scan-guide");
  c.height=550;c.width=Math.round(550*img.width/img.height);c.hidden=false;
  const ctx=c.getContext("2d");
  ctx.drawImage(img,0,0,c.width,c.height);ctx.strokeStyle="#60ffd5";ctx.lineWidth=2;
  const areas=cropAreas(img,settings());
  for(const r of areas)ctx.strokeRect(r.x*c.width/img.width,r.y*c.height/img.height,r.w*c.width/img.width,r.h*c.height/img.height);
  say("第一張截圖共有 "+areas.length+" 個完整裁切框。請確認每列三張位置對準。");
}
$("scan-check").onclick=drawGuide;
function cut(img,r){const c=canvas(210,116);c.getContext("2d").drawImage(img,r.x,r.y,r.w,r.h,0,0,210,116);return c}
function feature(img){
const c=canvas(20,12),ctx=c.getContext("2d",{willReadFrequently:true});
ctx.drawImage(img,img.width*.035,img.height*.04,img.width*.93,img.height*.61,0,0,20,12);
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
const layout=settings();
const controls=["scan-files","scan-top","scan-left","scan-rows","scan-check","scan-start","scan-use-ocr"];
running=true;
for(const id of controls)$(id).disabled=true;
items=[];render();let worker=null,ocrIssue="";
try{
const ref=await references();
if($("scan-use-ocr").checked){try{say("準備 OCR 元件…");worker=await createOCR()}catch(e){ocrIssue="OCR 無法使用，請手動填寫等級。";console.warn(e)}}
for(const shot of screenshots)for(const b of cropAreas(shot.img,layout)){
const tile=cut(shot.img,b),fv=feature(tile);
if(fv.texture.every(value=>Math.abs(value)<.05))continue;
const top=ref.map(c=>({id:c.id,name:c.name,d:metric(fv,c.v)})).sort((a,b)=>a.d-b.d).slice(0,3);
const br=guessLimit(tile);
let lv=null;
if(worker)try{lv=await guessLevel(worker,tile)}catch(e){
  ocrIssue="OCR 中途停止，請手動補齊空白等級。";
  const failedWorker=worker;worker=null;
  await failedWorker.terminate().catch(()=>{});
}
items.push({file:shot.file,row:b.row,col:b.col,name:top[0]?.name||"",id:top[0]?.id||"",limit:br.value,
level:lv,candidates:top,certainty:br.certainty,confirmed:false,thumb:tile.toDataURL("image/jpeg",.85)});
say("已辨識 "+items.length+" 個卡片位置…");
}
render();say((items.length?"辨識完成："+items.length+" 個位置，請逐張核對後勾選匯入。":"完整裁切框內沒有偵測到卡面，請檢查截圖與裁切位置。")+" "+ocrIssue);
}catch(e){say("辨識失敗："+e.message)}finally{if(worker)try{await worker.terminate()}catch(e){};running=false;for(const id of controls)$(id).disabled=false}
}
$("scan-start").onclick=scan;
function render(){
$("scan-finish").hidden=!items.length;
$("scan-result").innerHTML=items.map((r,i)=>{
const opts=[null,0,1,2,3,4].map(v=>'<option value="'+(v===null?"":v)+'"'+(r.limit===v?" selected":"")+'>'+(v===null?"未知":v+"凸")+'</option>').join("");
return '<article class="scan-card" data-i="'+i+'"><img alt="截圖中的卡面" src="'+r.thumb+'"><div><header><strong>'+esc(r.file)+'，'+r.row+'列'+r.col+'張</strong><span class="scan-flag">待確認</span></header>'+
'<div class="scan-fields"><label>候選卡名<input data-field="name" list="scan-names" value="'+esc(r.name)+'"></label>'+
'<label>突破<select data-field="limit">'+opts+'</select></label><label>等級<input data-field="level" type="number" min="1" max="60" inputmode="numeric" value="'+(r.level??"")+'" placeholder="未知"></label></div>'+
'<label style="font-size:12px"><input type="checkbox" data-field="confirmed"'+(r.confirmed?" checked":"")+'>我已核對這張卡，允許寫入</label> '+
'<small>候選：'+r.candidates.map(c=>esc(c.name)).join("／")+"；突破："+esc(r.certainty)+'</small></div></article>';
}).join("");
}
$("scan-result").onchange=e=>{
const item=e.target.closest(".scan-card");if(!item)return;
const r=items[Number(item.dataset.i)],field=e.target.dataset.field;
if(field==="name"){r.name=e.target.value.trim();r.id=lookup.get(r.name)?.id||""}
if(field==="limit")r.limit=e.target.value===""?null:Number(e.target.value);
if(field==="level"){const n=Number(e.target.value);r.level=e.target.value!==""&&Number.isInteger(n)&&n>0&&n<=60?n:null}
if(field==="confirmed")r.confirmed=e.target.checked;
else{r.confirmed=false;item.querySelector('[data-field="confirmed"]').checked=false}
};
$("scan-save").onclick=()=>{
const chosen=items.filter(r=>r.confirmed);
const valid=chosen.filter(r=>r.id&&Number.isInteger(r.limit)&&r.limit>=0&&r.limit<=4&&Number.isInteger(r.level)&&r.level>0&&r.level<=60);
if(!valid.length){say("請先把卡名、突破和等級填妥，並勾選要匯入的卡片");return}
if(valid.length!==chosen.length){say("部分已勾選的卡片資料不完整，請修正或取消勾選");return}
const seen=new Set(),duplicates=[];
for(const r of valid){if(seen.has(r.id))duplicates.push(r.name);seen.add(r.id)}
if(duplicates.length){say("重複選到同一張卡，請只保留一筆："+duplicates.join("、"));return}
const changed=valid.filter(r=>own[r.id]?.status==="owned"&&(own[r.id]?.limit!==r.limit||own[r.id]?.level!==r.level));
if(!confirm("將匯入 "+valid.length+" 張卡，其中 "+changed.length+" 張會改變既有突破或等級。確定寫入？"))return;
const next={...own};
for(const r of valid)next[r.id]={...own[r.id],status:"owned",limit:r.limit,level:r.level};
if(!persist(next)){say("瀏覽器儲存失敗，這次匯入未寫入。");return}
own=next;draw();say("已儲存 "+valid.length+" 張，建議立刻匯出收藏 JSON 備份。");
};
})();