const DB_NAME = "gakumas-level-samples";
const FORMAT = "gakumas-level-samples";
const VERSION = 1;
const hashPattern = /^[a-f0-9]{64}$/;
const MAX_BACKUP_BYTES = 32 * 1024 * 1024;
const MAX_PNG_BYTES = 64 * 1024;
export const SAMPLE_REGION = { x: 0, y: 72, width: 63, height: 43 };
let connection;

export async function digest(buffer) {
  if (!globalThis.crypto?.subtle) throw Error("請以 HTTPS 開啟網站以建立截圖識別碼。");
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", buffer));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

function openDatabase() {
  if (!connection) {
    connection = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, VERSION);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("samples", { keyPath: "id" });
        request.result.createObjectStore("sources", { keyPath: "id" });
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); connection = undefined; };
        resolve(db);
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(Error("另一個分頁正在使用舊版樣本庫，請先關閉該分頁。"));
    }).catch(error => { connection = undefined; throw error; });
  }
  return connection;
}

async function transaction(mode, action) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["samples", "sources"], mode);
    tx.oncomplete = () => resolve(result());
    tx.onabort = () => reject(tx.error || Error("樣本庫儲存失敗。"));
    const result = action(tx.objectStore("samples"), tx.objectStore("sources"));
  });
}

export function readLibrary() {
  return transaction("readonly", (samples, sources) => {
    const a = samples.getAll(), b = sources.getAll();
    return () => ({ samples: a.result, sources: b.result });
  });
}

export function saveSamples(rows) {
  return transaction("readwrite", (samples, sources) => {
    for (const sourceId of new Set(rows.map(row => row.sourceId))) {
      const request = sources.get(sourceId);
      request.onsuccess = () => {
        if (!request.result) sources.add({ id: sourceId, split: "train" });
      };
    }
    for (const row of rows) samples.put(row);
    return () => rows.length;
  });
}

export function removeSample(id) {
  return transaction("readwrite", samples => { samples.delete(id); return () => undefined; });
}

export function setSplit(id, split) {
  return transaction("readwrite", (_, sources) => { sources.put({ id, split }); return () => undefined; });
}

function encode(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function exportLibrary() {
  const { samples, sources } = await readLibrary();
  const entries = await Promise.all(samples.map(async ({ image, ...sample }) => ({
    ...sample, png: await encode(image)
  })));
  const backup = new Blob([JSON.stringify({ format: FORMAT, version: VERSION, sources, samples: entries })],
    { type: "application/json" });
  if (backup.size > MAX_BACKUP_BYTES) throw Error("樣本庫備份超過 32 MB，請先刪除不需要的樣本。");
  return backup;
}

async function checkPNG(blob) {
  const url = URL.createObjectURL(blob);
  try {
    await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = resolve;
      image.onerror = () => reject(Error("備份含有無法解碼的數字裁切圖。"));
      image.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
}

export async function importLibrary(file) {
  if (file.size > MAX_BACKUP_BYTES) throw Error("備份超過 32 MB。");
  const data = JSON.parse(await file.text());
  if (data?.format !== FORMAT || data.version !== VERSION || !Array.isArray(data.sources) ||
      !Array.isArray(data.samples)) throw Error("無法讀取這個樣本庫備份。");
  const sourceMap = new Map();
  for (const source of data.sources) {
    if (!hashPattern.test(source?.id) || !["train", "test"].includes(source.split) || sourceMap.has(source.id)) {
      throw Error("備份含有無效的截圖分組。");
    }
    sourceMap.set(source.id, { id: source.id, split: source.split });
  }
  const rows = new Map();
  for (const row of data.samples) {
    if (!sourceMap.has(row?.sourceId) || !Number.isInteger(row.level) || row.level < 1 || row.level > 60 ||
        typeof row.png !== "string" || row.png.length > Math.ceil(MAX_PNG_BYTES / 3) * 4) {
      throw Error("備份含有無效的 Lv 樣本。");
    }
    const bytes = Uint8Array.from(atob(row.png), char => char.charCodeAt(0));
    const signature = [137,80,78,71,13,10,26,10];
    const dimensions = bytes.length >= 24 && new DataView(bytes.buffer);
    if (!dimensions || !signature.every((byte, i) => bytes[i] === byte) ||
        dimensions.getUint32(16) !== SAMPLE_REGION.width || dimensions.getUint32(20) !== SAMPLE_REGION.height ||
        bytes.length > MAX_PNG_BYTES) throw Error("備份含有無效的數字裁切圖。");
    const cropId = await digest(bytes);
    const id = row.sourceId + ":" + cropId;
    if (id !== row.id || cropId !== row.cropId || rows.has(id)) throw Error("備份圖片識別碼不一致。");
    const image = new Blob([bytes], { type: "image/png" });
    await checkPNG(image);
    rows.set(id, { id, cropId, sourceId: row.sourceId, level: row.level, image });
  }
  return transaction("readwrite", (samples, sources) => {
    let added = 0;
    for (const source of sourceMap.values()) {
      const request = sources.get(source.id);
      request.onsuccess = () => { if (!request.result) sources.add(source); };
    }
    for (const row of rows.values()) {
      const request = samples.get(row.id);
      request.onsuccess = () => { if (!request.result) { samples.add(row); added++; } };
    }
    return () => added;
  });
}
