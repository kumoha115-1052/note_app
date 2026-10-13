
const KEY = "memo_app_data_v1";

const $ = id => document.getElementById(id);

let memos = loadMemos();
let activeId = null;
let saveTimer = null;

function loadMemos() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveData() {
  try {
    localStorage.setItem(KEY, JSON.stringify(memos));
    $("saveStatus").textContent = "保存済み";
    $("footerStatus").textContent = "保存済み";
  } catch {
    $("saveStatus").textContent = "保存エラー";
    $("footerStatus").textContent = "保存できません";
  }
}

function currentMemo() {
  return memos.find(m => m.id === activeId);
}

function flushSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
    updateCurrentMemo();
    saveData();
    renderList();
  }
}

function updateCurrentMemo() {
  const memo = currentMemo();
  if (!memo) return;

  memo.title = $("title").value;
  memo.content = $("content").value;
  memo.updated = Date.now();
}

function queueSave() {
  if (!currentMemo()) return;

  $("saveStatus").textContent = "保存中…";
  $("footerStatus").textContent = "保存中…";
  $("length").textContent = $("content").value.length + "文字";

  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    updateCurrentMemo();
    saveData();
    renderList();
    updateDate();
  }, 300);
}

function formatDate(time) {
  const date = new Date(time || Date.now());
  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  return date.toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric"
  });
}

function updateDate() {
  const memo = currentMemo();
  if (!memo) return;

  $("updated").textContent = "更新：" +
    new Date(memo.updated).toLocaleString("ja-JP", {
      dateStyle: "medium",
      timeStyle: "short"
    });
}

function renderList() {
  const query = $("search").value.trim().toLowerCase();
  const list = $("memoList");
  list.replaceChildren();

  const sorted = [...memos]
    .sort((a, b) => b.updated - a.updated)
    .filter(m =>
      ((m.title || "") + " " + (m.content || ""))
        .toLowerCase().includes(query)
    );

  $("count").textContent = memos.length;

  if (!sorted.length) {
    const empty = document.createElement("p");
    empty.textContent = query
      ? "検索結果がありません"
      : "まだメモがありません";
    empty.style.cssText =
      "font-size:12px;color:#9299a9;padding:10px";
    list.append(empty);
    return;
  }

  sorted.forEach(memo => {
    const button = document.createElement("button");
    button.className =
      "memo" + (memo.id === activeId ? " active" : "");
    button.type = "button";

    const title = document.createElement("strong");
    title.textContent = memo.title.trim() || "無題のメモ";

    const preview = document.createElement("small");
    preview.textContent =
      memo.content.replace(/\s+/g, " ").trim() || "本文なし";

    const date = document.createElement("small");
    date.textContent = formatDate(memo.updated);

    button.append(title, preview, date);
    button.addEventListener("click", () => selectMemo(memo.id));
    list.append(button);
  });
}

function renderEditor() {
  const memo = currentMemo();
  const hasMemo = Boolean(memo);

  $("empty").hidden = hasMemo;
  $("editor").hidden = !hasMemo;
  $("deleteBtn").disabled = !hasMemo;

  if (!memo) return;

  $("title").value = memo.title;
  $("content").value = memo.content;
  $("length").textContent = memo.content.length + "文字";
  updateDate();
}

function selectMemo(id) {
  flushSave();
  activeId = id;
  renderEditor();
  renderList();
}

function createMemo() {
  flushSave();

  const now = Date.now();
  const memo = {
    id: now.toString(36) + Math.random().toString(36).slice(2),
    title: "",
    content: "",
    created: now,
    updated: now
  };

  memos.push(memo);
  activeId = memo.id;
  saveData();
  renderList();
  renderEditor();
  $("title").focus();
}

function deleteMemo() {
  const memo = currentMemo();
  if (!memo) return;

  const name = memo.title.trim() || "無題のメモ";
  if (!confirm("「" + name + "」を削除しますか？")) return;

  clearTimeout(saveTimer);
  saveTimer = null;

  memos = memos.filter(m => m.id !== activeId);
  activeId = null;

  saveData();
  renderList();
  renderEditor();
}

$("newBtn").addEventListener("click", createMemo);
$("emptyNewBtn").addEventListener("click", createMemo);
$("deleteBtn").addEventListener("click", deleteMemo);
$("search").addEventListener("input", renderList);
$("title").addEventListener("input", queueSave);
$("content").addEventListener("input", queueSave);

window.addEventListener("pagehide", flushSave);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushSave();
});

renderList();

if (memos.length) {
  memos.sort((a, b) => b.updated - a.updated);
  selectMemo(memos[0].id);
} else {
  renderEditor();
}


if ("serviceWorker" in navigator &&
    (location.protocol === "https:" ||
     location.hostname === "localhost")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .catch(error => console.error("登録失敗:", error));
  });
}
