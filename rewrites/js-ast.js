// rewrites/js-ast.js
import acorn from "acorn";
import walk from "acorn-walk";
import escodegen from "escodegen";

/**
 * Replace string literals that look like absolute or protocol-relative URLs
 */
function isUrlString(s) {
  return /^https?:\/\/|^\/\/|^\/[A-Za-z0-9]/.test(s);
}

function toProxyLiteral(literalValue, base) {
  try {
    const abs = new URL(literalValue, base).href;
    return `/p/${encodeURIComponent(abs)}`;
  } catch {
    return literalValue;
  }
}

export default function rewriteJS(jsCode, baseUrl) {
  let ast;
  try {
    ast = acorn.parse(jsCode, { ecmaVersion: "latest", sourceType: "script" });
  } catch (e) {
    // If parse fails, fallback to simple regex replacement
    return jsCode.replace(/(['"])(https?:\/\/[^'"]+)\1/g, (m, q, url) => {
      try {
        const abs = new URL(url, baseUrl).href;
        return `${q}/p/${encodeURIComponent(abs)}${q}`;
      } catch {
        return m;
      }
    });
  }

  // Walk and mutate string literals and NewExpression URL(...) calls
  walk.simple(ast, {
    Literal(node) {
      if (typeof node.value === "string" && isUrlString(node.value)) {
        node.value = toProxyLiteral(node.value, baseUrl);
        node.raw = JSON.stringify(node.value);
      }
    },
    NewExpression(node) {
      // new URL("...") or new URL("/path", location)
      if (node.callee && node.callee.name === "URL" && node.arguments && node.arguments[0] && node.arguments[0].type === "Literal") {
        const orig = node.arguments[0].value;
        try {
          const abs = new URL(orig, baseUrl).href;
          node.arguments[0].value = `/p/${encodeURIComponent(abs)}`;
          node.arguments[0].raw = JSON.stringify(node.arguments[0].value);
        } catch (e) {}
      }
    }
  });

  return escodegen.generate(ast);
}
