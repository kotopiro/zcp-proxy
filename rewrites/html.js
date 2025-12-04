// rewrites/html.js
import parse5 from "parse5";

/**
 * Convert an absolute URL to our proxy path /p/<encoded>
 */
function proxyURL(url) {
  return "/p/" + encodeURIComponent(url);
}

export default function rewriteHTML(html, baseUrl) {
  const document = parse5.parse(html, { sourceCodeLocationInfo: true });

  function visit(node) {
    if (!node) return;
    if (node.attrs) {
      for (const attr of node.attrs) {
        if (["href", "src", "action", "data-src", "poster"].includes(attr.name)) {
          const raw = attr.value;
          if (!raw) continue;
          if (raw.startsWith("data:") || raw.startsWith("javascript:") || raw.startsWith("mailto:")) continue;
          try {
            const abs = new URL(raw, baseUrl).href;
            attr.value = proxyURL(abs);
          } catch (e) {
            // ignore
          }
        }
      }
    }
    if (node.childNodes) {
      for (const c of node.childNodes) visit(c);
    }
  }

  visit(document);
  return parse5.serialize(document);
}
