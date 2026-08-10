import fs from "fs";

const svg = fs.readFileSync("public/svg/fridge.svg", "utf8");
const paths = [...svg.matchAll(/<path\b[^>]*>/g)].map((m) => m[0]);
const HINGE = 1585;

const content = [];
for (const p of paths) {
  const fill = p.match(/\bfill="([^"]+)"/)?.[1] ?? "";
  const d = p.match(/\bd="([^"]+)"/)?.[1] ?? "";
  const nums = [...d.matchAll(/-?\d+\.?\d*/g)].map(Number);
  const xs = [];
  for (let i = 0; i < nums.length - 1; i += 2) xs.push(nums[i]);
  if (!xs.length) continue;
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  if (fill === "rgb(255,255,255)" && minX < 5 && maxX > 2000) continue;
  content.push(p);
}

const joined = content.join("\n");

function wrap(id, clipRect, pathsInner) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 1593" fill="none">
  <defs>
    <clipPath id="${id}-clip">
      ${clipRect}
    </clipPath>
  </defs>
  <g clip-path="url(#${id}-clip)">
${pathsInner}
  </g>
</svg>
`;
}

const body = wrap(
  "body",
  `<rect x="0" y="0" width="${HINGE}" height="1593"/>`,
  joined
);
const door = wrap(
  "door",
  `<rect x="${HINGE}" y="0" width="${2048 - HINGE}" height="1593"/>`,
  joined
);

fs.writeFileSync("public/svg/fridge-body.svg", body);
fs.writeFileSync("public/svg/fridge-door.svg", door);
console.log("wrote body", body.length, "door", door.length);
