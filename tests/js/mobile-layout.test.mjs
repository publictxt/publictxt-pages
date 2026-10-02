import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

const dir = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(dir, "../../assets/css/main.css"), "utf8");

function block(cssText, atRule) {
  const start = cssText.indexOf(atRule);
  assert.ok(start >= 0, `missing ${atRule}`);
  const open = cssText.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < cssText.length; i++) {
    if (cssText[i] === "{") depth++;
    else if (cssText[i] === "}") {
      depth--;
      if (depth === 0) return cssText.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated ${atRule}`);
}

function stripMediaBlocks(cssText) {
  let out = "";
  let i = 0;
  while (i < cssText.length) {
    const at = cssText.indexOf("@media", i);
    if (at === -1) {
      out += cssText.slice(i);
      break;
    }
    out += cssText.slice(i, at);
    const open = cssText.indexOf("{", at);
    assert.ok(open >= 0, "unterminated @media block");
    let depth = 0;
    for (let j = open; j < cssText.length; j++) {
      if (cssText[j] === "{") depth++;
      else if (cssText[j] === "}") {
        depth--;
        if (depth === 0) {
          i = j + 1;
          break;
        }
      }
    }
    if (depth !== 0) throw new Error("unterminated @media block");
  }
  return out;
}

const baseCss = stripMediaBlocks(css);

test("mobile list and section pages wrap long titles without overflowing", () => {
  const w900 = block(css, "@media (max-width: 900px)");
  const w520 = block(css, "@media (max-width: 520px)");

  assert.match(baseCss, /\.list-header h1\s*\{[^}]*overflow-wrap:\s*anywhere;/s);
  assert.match(baseCss, /\.page-card-title\s*\{[^}]*overflow-wrap:\s*anywhere;/s);
  assert.match(baseCss, /\.page-card-summary\s*\{[^}]*overflow-wrap:\s*anywhere;/s);
  assert.match(w900, /\.page-card\s*\{[\s\S]*padding:\s*0\.8rem 0\.9rem;/);
  assert.match(w900, /\.page-card-head\s*\{[\s\S]*flex-direction:\s*column;/);
  assert.match(w520, /\.page-card-head\s*\{[\s\S]*align-items:\s*stretch;/);
});
