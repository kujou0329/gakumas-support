import { digest, exportLibrary, importLibrary, readLibrary, removeSample, SAMPLE_REGION, saveSamples, setSplit } from "./level-sample-store.mjs";
import { learnLevels, matchLevel, matchWholeLevel } from "./tools/level-template.mjs";

const sourceHashes = new WeakMap();

function makeCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function cropLevel(tile) {
  const { x, y, width, height } = SAMPLE_REGION;
  const canvas = makeCanvas(width, height);
  canvas.getContext("2d").drawImage(tile, x, y, width, height, 0, 0, width, height);
  return canvas;
}

function png(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(Error("無法建立裁切圖。")), "image/png"));
}

async function decodeTile(blob) {
  const tile = makeCanvas(210, 116), url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(Error("無法讀取樣本圖。"));
      image.src = url;
    });
    tile.getContext("2d").drawImage(image, SAMPLE_REGION.x, SAMPLE_REGION.y);
    return tile;
  } finally { URL.revokeObjectURL(url); }
}

function appendText(parent, tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  parent.append(node);
  return node;
}

function describe(method, rows) {
  const valid = rows.filter(row => row[method] !== undefined);
  if (!valid.length) return "無法執行";
  const correct = valid.filter(row => row[method] === row.level).length;
  const unknown = valid.filter(row => row[method] === null).length;
  const wrong = valid.length - correct - unknown;
  const percent = n => (100 * n / valid.length).toFixed(1) + "%";
  const times = valid.map(row => row[method + "Ms"]).sort((a, b) => a - b);
  const middle = Math.floor(times.length / 2);
  const median = times.length % 2 ? times[middle] : (times[middle - 1] + times[middle]) / 2;
  return "正確 " + correct + "/" + valid.length + "（" + percent(correct) + "）、未知 " + unknown +
    "（" + percent(unknown) + "）、誤讀 " + wrong + "，每筆中位數 " + median.toFixed(1) + " ms";
}

export function mountLevelSamples(host, { frames, cut, levelSample, createOCR, guessLevel }) {
  const panel = document.createElement("section");
  panel.id = "lv-library";
  panel.hidden = true;
  panel.innerHTML = `
    <style>
      #lv-library{margin:14px 0;padding:12px;border:1px solid #46516a;border-radius:10px}
      #lv-library h3,#lv-library h4{margin:8px 0}
      #lv-library button,#lv-library select,#lv-library input{font-size:16px}
      .lv-actions{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
      .lv-draft,.lv-record{padding:8px 0;border-bottom:1px solid #46516a}
      .lv-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
      .lv-pair figure{min-width:0;margin:0}
      .lv-pair canvas{width:100%;aspect-ratio:63/43;object-fit:contain;background:#273349;display:block}
      .lv-record img{width:84px;vertical-align:middle;margin-inline:8px}
      .lv-draft input[type=number]{width:82px}
      #lv-results{overflow-x:auto}
      #lv-results table{border-collapse:collapse;width:100%;min-width:275px}
      #lv-results th,#lv-results td{border-bottom:1px solid #46516a;padding:4px;text-align:left}
    </style>
    <h3>Lv 樣本收集模式</h3>
    <p>沿用上方調整好的裁切框。只儲存左下角裁切、人工標記與截圖識別碼，整張截圖留在裝置上。</p>
    <div class="lv-actions">
      <button type="button" id="lv-capture">從目前裁切框取樣</button>
      <button type="button" id="lv-batch">加入勾選樣本</button>
    </div>
    <div id="lv-drafts"></div>
    <h4>樣本庫</h4>
    <p id="lv-count"></p>
    <p>在來源截圖下選擇訓練或獨立測試。同一張截圖的重新編碼版本也應放在同一組。</p>
    <div class="lv-actions">
      <button type="button" id="lv-export">匯出樣本庫</button>
      <button type="button" id="lv-import">匯入樣本庫</button>
      <input type="file" id="lv-file" accept="application/json,.json" hidden>
      <button type="button" id="lv-compare">比較三種辨識方法</button>
    </div>
    <p id="lv-status" role="status"></p>
    <div id="lv-records"></div>
    <div id="lv-results"></div>`;
  host.insertBefore(panel, host.querySelector("#scan-result"));
  const $ = id => panel.querySelector("#" + id);
  const say = message => { $("lv-status").textContent = message; };
  let busy = false, imageURLs = [];
  function run(action) {
    return async () => {
      if (busy) return;
      busy = true;
      panel.setAttribute("aria-busy", "true");
      const controls = Array.from(panel.querySelectorAll("button,input,select"), control => [control, control.disabled]);
      for (const [control] of controls) control.disabled = true;
      try { await action(); }
      catch (error) { say("操作失敗：" + (error.message || String(error))); }
      finally {
        for (const [control, previous] of controls) control.disabled = previous;
        panel.removeAttribute("aria-busy");
        busy = false;
      }
    };
  }

  async function refresh() {
    const { samples, sources } = await readLibrary();
    const groups = new Map();
    for (const row of samples) {
      if (!groups.has(row.sourceId)) groups.set(row.sourceId, []);
      groups.get(row.sourceId).push(row);
    }
    const tests = sources.filter(source => source.split === "test")
      .reduce((sum, source) => sum + (groups.get(source.id)?.length || 0), 0);
    $("lv-count").textContent = samples.length + " 筆 · " + groups.size + " 張來源截圖 · 訓練 " +
      (samples.length - tests) + " · 測試 " + tests;
    const list = $("lv-records");
    list.replaceChildren();
    for (const url of imageURLs) URL.revokeObjectURL(url);
    imageURLs = [];
    for (const source of sources) {
      const rows = groups.get(source.id);
      if (!rows?.length) continue;
      const details = document.createElement("details");
      const summary = appendText(details, "summary", "來源 " + source.id.slice(0, 12) + " · " + rows.length +
        " 筆 · " + (source.split === "train" ? "訓練" : "獨立測試"));
      summary.title = source.id;
      const label = appendText(details, "label", "整張截圖分組 ");
      const select = document.createElement("select");
      select.append(new Option("訓練", "train"), new Option("獨立測試", "test"));
      select.value = source.split;
      select.onchange = run(async () => {
        await setSplit(source.id, select.value);
        $("lv-results").replaceChildren();
        await refresh();
      });
      label.append(select);
      for (const row of rows) {
        const record = document.createElement("div");
        record.className = "lv-record";
        const image = new Image();
        const url = URL.createObjectURL(row.image);
        imageURLs.push(url);
        image.src = url; image.loading = "lazy"; image.alt = "Lv " + row.level + " 裁切圖";
        record.append(image);
        appendText(record, "span", "Lv " + row.level + " ");
        const button = appendText(record, "button", "刪除此樣本");
        button.type = "button";
        button.onclick = run(async () => {
          if (!confirm("刪除這筆 Lv " + row.level + " 樣本？")) return;
          await removeSample(row.id);
          $("lv-results").replaceChildren();
          await refresh();
          say("已刪除樣本。");
        });
        details.append(record);
      }
      list.append(details);
    }
  }

  async function addDrafts(rows) {
    if (!rows.length) { say("請先勾選要加入的樣本。"); return; }
    const levels = rows.map(row => row.querySelector('input[type="number"]').valueAsNumber);
    const invalid = levels.findIndex(value => !Number.isInteger(value) || value < 1 || value > 60);
    if (invalid >= 0) throw Error("每筆選取樣本都需要填寫 1～60 的整數等級。");
    const records = await Promise.all(rows.map(async (row, i) => {
      const image = await png(row.querySelector("canvas"));
      const cropId = await digest(await image.arrayBuffer());
      const { sourceId } = row.dataset;
      return { id: sourceId + ":" + cropId, sourceId, cropId, level: levels[i], image };
    }));
    await saveSamples(records);
    rows.forEach(row => row.remove());
    $("lv-results").replaceChildren();
    await refresh();
    say("已儲存 " + records.length + " 筆樣本標記。");
  }

  $("lv-capture").onclick = run(async () => {
    const sources = frames();
    if (!sources.some(source => source.frames.length)) throw Error("請先上傳截圖並確認裁切框。");
    const draftList = document.createDocumentFragment();
    for (const [shotIndex, source] of sources.entries()) {
      if (!source.frames.length) continue;
      if (!sourceHashes.has(source.sourceFile)) {
        sourceHashes.set(source.sourceFile, digest(await source.sourceFile.arrayBuffer()));
      }
      const sourceId = await sourceHashes.get(source.sourceFile);
      for (const [frameIndex, frame] of source.frames.entries()) {
        const tile = cut(source.img, frame), row = document.createElement("article");
        row.className = "lv-draft";
        row.dataset.sourceId = sourceId;
        const heading = appendText(row, "strong", "截圖 " + (shotIndex + 1) + " · 裁切框 " + (frameIndex + 1));
        heading.title = source.file;
        appendText(row, "div", "來源 " + sourceId.slice(0, 12));
        const pair = document.createElement("div");
        pair.className = "lv-pair";
        for (const [title, preview] of [["原始數字區域", cropLevel(tile)], ["去背遮罩", levelSample(tile, {
          left: SAMPLE_REGION.x / tile.width, top: SAMPLE_REGION.y / tile.height,
          right: (SAMPLE_REGION.x + SAMPLE_REGION.width) / tile.width,
          bottom: (SAMPLE_REGION.y + SAMPLE_REGION.height) / tile.height, mode: "white"
        })]]) {
          const figure = document.createElement("figure");
          figure.append(preview);
          appendText(figure, "figcaption", title);
          pair.append(figure);
        }
        row.append(pair);
        const actions = document.createElement("div");
        actions.className = "lv-actions";
        actions.innerHTML = '<label>正確 Lv <input type="number" min="1" max="60" step="1" inputmode="numeric"></label> <label><input type="checkbox"> 批次加入</label>';
        const add = appendText(actions, "button", "加入樣本");
        add.type = "button";
        add.onclick = run(() => addDrafts([row]));
        row.append(actions);
        draftList.append(row);
      }
    }
    $("lv-drafts").replaceChildren(draftList);
    say("請核對裁切，再填寫每張卡的正確等級。");
  });
  $("lv-batch").onclick = run(() => addDrafts(Array.from($("lv-drafts").querySelectorAll('input[type="checkbox"]:checked'), box => box.closest(".lv-draft"))));
  $("lv-export").onclick = run(async () => {
    const url = URL.createObjectURL(await exportLibrary()), link = document.createElement("a");
    link.href = url; link.download = "gakumas-lv-samples.json";
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    say("已產生樣本庫備份。");
  });
  $("lv-import").onclick = () => $("lv-file").click();
  $("lv-file").onchange = run(async () => {
    const [file] = $("lv-file").files;
    $("lv-file").value = "";
    if (!file) return;
    const added = await importLibrary(file);
    $("lv-results").replaceChildren();
    await refresh();
    say("已新增 " + added + " 筆，既有樣本及分組保留。");
  });
  $("lv-compare").onclick = run(async () => {
    const { samples, sources } = await readLibrary();
    const splits = new Map(sources.map(source => [source.id, source.split]));
    const train = samples.filter(row => splits.get(row.sourceId) === "train");
    const test = samples.filter(row => splits.get(row.sourceId) === "test");
    const seen = new Set(train.map(row => row.cropId));
    const independent = test.filter(row => !seen.has(row.cropId));
    if (!train.length || !independent.length) throw Error("請用不同來源截圖分別建立訓練與測試樣本，並確認測試樣本未和訓練圖重複。");
    const training = [];
    for (const row of train) training.push({ level: row.level, tile: await decodeTile(row.image) });
    const bank = learnLevels(training);
    const results = $("lv-results");
    results.replaceChildren();
    const rows = [];
    let worker, ocrFailed = false;
    say("正在比較三種方法…");
    try {
      try { worker = await createOCR(); } catch (error) { ocrFailed = true; }
      for (const sample of independent) {
        const tile = await decodeTile(sample.image);
        const row = { level: sample.level, sourceId: sample.sourceId };
        let started = performance.now();
        row.whole = matchWholeLevel(tile, bank.levels);
        row.wholeMs = performance.now() - started;
        started = performance.now();
        row.digits = matchLevel(tile, bank.digits).value;
        row.digitsMs = performance.now() - started;
        if (worker && !ocrFailed) {
          try {
            started = performance.now();
            row.ocr = await guessLevel(worker, tile);
            row.ocrMs = performance.now() - started;
          } catch (error) { ocrFailed = true; }
        }
        rows.push(row);
      }
    } finally { if (worker) await worker.terminate().catch(() => {}); }
    appendText(results, "h4", "獨立測試結果");
    appendText(results, "p", "完整等級覆蓋 " + bank.levels.size + "/60，逐字覆蓋 " +
      bank.digits.size + "/10。排除 " + (test.length - independent.length) + " 張與訓練重複的裁切。");
    for (const [method, title] of [["whole", "完整等級模板"], ["digits", "逐字模板"], ["ocr", "Tesseract.js"]]) {
      appendText(results, "p", title + "：" + describe(method, rows));
    }
    const table = document.createElement("table"), head = table.createTHead().insertRow();
    for (const title of ["標記", "完整模板", "逐字模板", "OCR"]) appendText(head, "th", title).scope = "col";
    const body = table.createTBody();
    for (const row of rows) {
      const item = body.insertRow();
      item.title = "來源 " + row.sourceId.slice(0, 12);
      for (const method of ["level", "whole", "digits", "ocr"]) {
        const value = row[method];
        const label = value === undefined ? "未執行" : value ?? "未知";
        appendText(item, "td", String(label) + (typeof value === "number" && value !== row.level ? "（誤讀）" : ""));
      }
    }
    results.append(table);
    say(ocrFailed ? "模板比較完成，OCR 無法完成全部測試。所有結果只供比較。" : "比較完成，結果只供參考，不會寫入收藏。");
  });

  return run(async () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) await refresh();
  });
}
