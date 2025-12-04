const workerURL = "https://zcp.mnxsv69789.workers.dev"; // Cloudflare Worker URL
const urlInput = document.getElementById("urlInput");
const goBtn = document.getElementById("goBtn");
const reloadBtn = document.getElementById("reloadBtn");
const proxyFrame = document.getElementById("proxyFrame");

function isValidURL(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

async function loadURL() {
  let input = urlInput.value.trim();
  if (!input) return;

  // 入力がURLでなければ検索
  if (!isValidURL(input)) {
    input = `https://www.google.com/search?q=${encodeURIComponent(input)}`;
  }

  const proxiedURL = `${workerURL}?url=${encodeURIComponent(input)}`;

  proxyFrame.src = proxiedURL;
}

// ボタン操作
goBtn.addEventListener("click", loadURL);
urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loadURL();
});
reloadBtn.addEventListener("click", () => {
  proxyFrame.src = proxyFrame.src;
});
