// rewrites/sw-patch.js
export function patchServiceWorkerRegistration(htmlText) {
  // 1) 無条件で navigator.serviceWorker.register を無効化する短いスニペットを挿入
  const disableSW = `<script>if (navigator && navigator.serviceWorker) { navigator.serviceWorker.register = async () => { console.log("SW registration disabled by proxy"); return; } }</script>`;
  // insert just before closing </head>
  return htmlText.replace("</head>", `${disableSW}</head>`);
}
