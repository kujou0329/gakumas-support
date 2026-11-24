import { digest, readLibrary, SAMPLE_REGION, saveSamples } from "./level-sample-store.mjs";

// Save only explicit user-edited, confirmed Lv values after inventory is committed.
// Both screenshots and card artwork stay in memory; only a tiny Lv crop is stored.
const hashes = new WeakMap();
function toPng(canvas) {
  return new Promise((resolve,reject)=>canvas.toBlob(
    blob=>blob?resolve(blob):reject(Error("無法產生 Lv 裁切圖")),"image/png"));
}
async function sourceId(file) {
  if (!hashes.has(file)) hashes.set(file,digest(await file.arrayBuffer()));
  return hashes.get(file);
}
export async function captureConfirmedLevels(rows, screenshots, cut) {
  const corrected=rows.filter(r=>r.levelEdited&&r.confirmed&&Number.isInteger(r.level)&&r.level>=1&&r.level<=60);
  if (!corrected.length) return {added:0,duplicates:0,conflicts:0,attempted:0};
  const existing=new Map((await readLibrary()).samples.map(x=>[x.id,x.level]));
  const additions=[],staged=new Map();
  let duplicates=0,conflicts=0;
  for (const row of corrected) {
    const shot=screenshots[row.shot-1];
    if (!shot?.sourceFile||!row.captureFrame) throw Error("原始截圖已不存在，無法保存 Lv 樣本");
    const tile=cut(shot.img,row.captureFrame);
    const c=document.createElement("canvas");
    c.width=SAMPLE_REGION.width;c.height=SAMPLE_REGION.height;
    c.getContext("2d").drawImage(tile,SAMPLE_REGION.x,SAMPLE_REGION.y,SAMPLE_REGION.width,SAMPLE_REGION.height,0,0,c.width,c.height);
    const image=await toPng(c);
    const cropId=await digest(await image.arrayBuffer());
    const id=(await sourceId(shot.sourceFile))+":"+cropId;
    const level=existing.has(id)?existing.get(id):staged.get(id);
    if (level!==undefined) {
      if (level===row.level) duplicates++;
      else conflicts++;
      continue;
    }
    const newRow={id,sourceId:id.slice(0,64),cropId,level:row.level,image};
    staged.set(id,row.level);
    additions.push(newRow);
  }
  if (additions.length) await saveSamples(additions);
  return {added:additions.length,duplicates,conflicts,attempted:corrected.length};
}
