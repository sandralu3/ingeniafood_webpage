import fs from "fs";

const svg = fs.readFileSync("public/svg/Fridge.svg", "utf8");
const paths = [...svg.matchAll(/\bd="([^"]+)"/g)].map((m) => m[1]);

function boundsOf(d) {
  let i = 0;
  let x = 0,
    y = 0;
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  const mark = () => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };

  const num = () => {
    while (i < d.length && /[\s,]/.test(d[i])) i++;
    const m = d.slice(i).match(/^-?\d*\.?\d+(?:e[-+]?\d+)?/i);
    if (!m) return null;
    i += m[0].length;
    return +m[0];
  };

  while (i < d.length) {
    while (i < d.length && /[\s,]/.test(d[i])) i++;
    if (i >= d.length) break;
    let cmd = d[i];
    if (/[a-zA-Z]/.test(cmd)) {
      i++;
    } else {
      // implicit repeat
      cmd = "L";
    }
    const rel = cmd === cmd.toLowerCase();
    const c = cmd.toUpperCase();

    const take = (n) => {
      const out = [];
      for (let k = 0; k < n; k++) {
        const v = num();
        if (v == null) break;
        out.push(v);
      }
      return out;
    };

    if (c === "M" || c === "L" || c === "T") {
      while (true) {
        const p = take(2);
        if (p.length < 2) break;
        if (rel) {
          x += p[0];
          y += p[1];
        } else {
          x = p[0];
          y = p[1];
        }
        mark();
        if (c === "M") {
          // subsequent pairs are L
        }
        // peek if next is number (implicit)
        const save = i;
        while (i < d.length && /[\s,]/.test(d[i])) i++;
        if (i < d.length && /[-0-9.]/.test(d[i]) && !/[a-zA-Z]/.test(d[i])) {
          // continue as L
          continue;
        }
        i = save;
        break;
      }
    } else if (c === "H") {
      const p = take(1);
      if (p.length) {
        x = rel ? x + p[0] : p[0];
        mark();
      }
    } else if (c === "V") {
      const p = take(1);
      if (p.length) {
        y = rel ? y + p[0] : p[0];
        mark();
      }
    } else if (c === "C") {
      while (true) {
        const p = take(6);
        if (p.length < 6) break;
        if (rel) {
          x += p[4];
          y += p[5];
        } else {
          x = p[4];
          y = p[5];
        }
        mark();
        const save = i;
        while (i < d.length && /[\s,]/.test(d[i])) i++;
        if (i < d.length && /[-0-9.]/.test(d[i]) && !/[a-zA-Z]/.test(d[i])) continue;
        i = save;
        break;
      }
    } else if (c === "S" || c === "Q") {
      const n = c === "Q" ? 4 : 4;
      const p = take(n);
      if (p.length >= n) {
        if (rel) {
          x += p[n - 2];
          y += p[n - 1];
        } else {
          x = p[n - 2];
          y = p[n - 1];
        }
        mark();
      }
    } else if (c === "Z") {
      // ignore
    } else {
      // skip unknown
      break;
    }
  }
  return { minX, maxX, minY, maxY };
}

let g = {
  minX: Infinity,
  maxX: -Infinity,
  minY: Infinity,
  maxY: -Infinity
};
for (const d of paths) {
  const b = boundsOf(d);
  if (!Number.isFinite(b.minX)) continue;
  g.minX = Math.min(g.minX, b.minX);
  g.maxX = Math.max(g.maxX, b.maxX);
  g.minY = Math.min(g.minY, b.minY);
  g.maxY = Math.max(g.maxY, b.maxY);
}
console.log("content bbox", g);
console.log("as % of 2048x1593", {
  left: ((g.minX / 2048) * 100).toFixed(1) + "%",
  right: ((g.maxX / 2048) * 100).toFixed(1) + "%",
  top: ((g.minY / 1593) * 100).toFixed(1) + "%",
  bottom: ((g.maxY / 1593) * 100).toFixed(1) + "%",
  width: (((g.maxX - g.minX) / 2048) * 100).toFixed(1) + "%",
  height: (((g.maxY - g.minY) / 1593) * 100).toFixed(1) + "%"
});

// hinge estimate: door wing starts near first yellow door path ~685
console.log("hinge guess 685 →", ((685 / 2048) * 100).toFixed(1) + "%");
console.log("body cavity left ~34?", g.minX);
