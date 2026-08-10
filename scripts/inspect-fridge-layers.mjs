import fs from "fs";

const s = fs.readFileSync("public/svg/fridge-layered.svg", "utf8");
console.log("size", (s.length / 1024).toFixed(1), "KB");

function extractGroup(id) {
  const start = s.indexOf(`id="${id}"`);
  if (start < 0) return null;
  const gStart = s.lastIndexOf("<g", start);
  let depth = 0;
  let i = gStart;
  while (i < s.length) {
    if (s.startsWith("<g", i)) {
      depth++;
      i = s.indexOf(">", i) + 1;
      continue;
    }
    if (s.startsWith("</g>", i)) {
      depth--;
      i += 4;
      if (depth === 0) return s.slice(gStart, i);
      continue;
    }
    i++;
  }
  return null;
}

function bounds(fragment) {
  const ds = [...fragment.matchAll(/\bd="([^"]+)"/g)].map((m) => m[1]);
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const d of ds) {
    const nums = [...d.matchAll(/-?\d+\.?\d*/g)].map(Number);
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = nums[i];
      const y = nums[i + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, maxX, minY, maxY };
}

const body = extractGroup("fridge-body");
const door = extractGroup("fridge-door");
console.log("body bounds", bounds(body));
console.log("door bounds", bounds(door));

// sample yellow fills in body
const yellows = [...body.matchAll(/fill="(rgb\([^"]+\))"/g)]
  .map((m) => m[1])
  .filter((f) => /255,\s*2[0-5]|2[0-4]\d,\s*1[89]|yellow|#[fF][eE]/i.test(f) || f.includes("255,2"));
const fills = {};
for (const m of body.matchAll(/fill="([^"]+)"/g)) {
  fills[m[1]] = (fills[m[1]] || 0) + 1;
}
console.log(
  "top body fills",
  Object.entries(fills)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
);
