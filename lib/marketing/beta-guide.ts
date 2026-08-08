/**
> Ruta secreta para testers (no enlazar desde la landing ni el menú).
> URL: /acceso-beta/guia-sv7k9m2xp4
 */
export const BETA_GUIDE_PUBLIC_PATH = "/acceso-beta/guia-sv7k9m2xp4" as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMarkdown(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="guide-link">$1</a>'
  );
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return html;
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export type GuideTocItem = {
  id: string;
  label: string;
  level: 2 | 3;
};

/**
 * Convierte el markdown de la guía (subconjunto usado en docs) a HTML seguro.
 */
export function markdownGuideToHtml(markdown: string): {
  html: string;
  toc: GuideTocItem[];
} {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const toc: GuideTocItem[] = [];
  const htmlParts: string[] = [];
  let i = 0;
  let inUl = false;
  let inOl = false;
  let inChecklist = false;
  let inPre = false;
  let preBuffer: string[] = [];

  const closeLists = () => {
    if (inChecklist) {
      htmlParts.push("</ul>");
      inChecklist = false;
    }
    if (inUl) {
      htmlParts.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      htmlParts.push("</ol>");
      inOl = false;
    }
  };

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (line.startsWith("```")) {
      if (inPre) {
        htmlParts.push(
          `<pre class="guide-pre"><code>${escapeHtml(preBuffer.join("\n"))}</code></pre>`
        );
        preBuffer = [];
        inPre = false;
      } else {
        closeLists();
        inPre = true;
      }
      i += 1;
      continue;
    }

    if (inPre) {
      preBuffer.push(line);
      i += 1;
      continue;
    }

    if (line.trim() === "" || line.trim() === "---") {
      closeLists();
      if (line.trim() === "---") {
        htmlParts.push('<hr class="guide-hr" />');
      }
      i += 1;
      continue;
    }

    const hMatch = /^(#{1,4})\s+(.+)$/.exec(line);
    if (hMatch) {
      closeLists();
      const level = hMatch[1].length;
      const raw = hMatch[2].trim();
      const id = slugify(raw);
      const label = raw.replace(/^\d+\.\s*/, "").trim();
      if (level === 1) {
        htmlParts.push(`<h1 id="${id}" class="guide-h1">${inlineMarkdown(raw)}</h1>`);
      } else if (level === 2) {
        toc.push({ id, label, level: 2 });
        htmlParts.push(`<h2 id="${id}" class="guide-h2">${inlineMarkdown(raw)}</h2>`);
      } else if (level === 3) {
        toc.push({ id, label, level: 3 });
        htmlParts.push(`<h3 id="${id}" class="guide-h3">${inlineMarkdown(raw)}</h3>`);
      } else {
        htmlParts.push(`<h4 class="guide-h4">${inlineMarkdown(raw)}</h4>`);
      }
      i += 1;
      continue;
    }

    if (line.startsWith("> ")) {
      closeLists();
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i]?.startsWith("> ") || lines[i]?.trim() === ">")) {
        quoteLines.push((lines[i] ?? "").replace(/^>\s?/, ""));
        i += 1;
      }
      htmlParts.push(
        `<blockquote class="guide-quote">${quoteLines
          .map((q) => `<p>${inlineMarkdown(q)}</p>`)
          .join("")}</blockquote>`
      );
      continue;
    }

    if (/^\|(.+)\|$/.test(line.trim()) && lines[i + 1]?.includes("---")) {
      closeLists();
      const rows: string[][] = [];
      while (i < lines.length && /^\|(.+)\|$/.test((lines[i] ?? "").trim())) {
        const row = lines[i] ?? "";
        if (row.includes("---")) {
          i += 1;
          continue;
        }
        rows.push(
          row
            .split("|")
            .slice(1, -1)
            .map((cell) => cell.trim())
        );
        i += 1;
      }
      if (rows.length > 0) {
        const [header, ...body] = rows;
        htmlParts.push(
          `<div class="guide-table-wrap"><table class="guide-table"><thead><tr>${header
            .map((c) => `<th>${inlineMarkdown(c)}</th>`)
            .join("")}</tr></thead><tbody>${body
            .map(
              (r) =>
                `<tr>${r.map((c) => `<td>${inlineMarkdown(c)}</td>`).join("")}</tr>`
            )
            .join("")}</tbody></table></div>`
        );
      }
      continue;
    }

    const checklist = /^-\s+\[([ xX])\]\s+(.+)$/.exec(line);
    if (checklist) {
      if (inUl) {
        htmlParts.push("</ul>");
        inUl = false;
      }
      if (inOl) {
        htmlParts.push("</ol>");
        inOl = false;
      }
      if (!inChecklist) {
        htmlParts.push('<ul class="guide-checklist">');
        inChecklist = true;
      }
      const checked = checklist[1].toLowerCase() === "x";
      htmlParts.push(
        `<li><label class="guide-check-item"><input type="checkbox" ${
          checked ? "checked " : ""
        }disabled /> <span>${inlineMarkdown(checklist[2])}</span></label></li>`
      );
      i += 1;
      continue;
    }

    const ul = /^-\s+(.+)$/.exec(line);
    if (ul) {
      if (inChecklist) {
        htmlParts.push("</ul>");
        inChecklist = false;
      }
      if (inOl) {
        htmlParts.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        htmlParts.push('<ul class="guide-ul">');
        inUl = true;
      }
      htmlParts.push(`<li>${inlineMarkdown(ul[1])}</li>`);
      i += 1;
      continue;
    }

    const ol = /^(\d+)\.\s+(.+)$/.exec(line);
    if (ol) {
      if (inChecklist) {
        htmlParts.push("</ul>");
        inChecklist = false;
      }
      if (inUl) {
        htmlParts.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        htmlParts.push('<ol class="guide-ol">');
        inOl = true;
      }
      htmlParts.push(`<li>${inlineMarkdown(ol[2])}</li>`);
      i += 1;
      continue;
    }

    closeLists();
    htmlParts.push(`<p class="guide-p">${inlineMarkdown(line)}</p>`);
    i += 1;
  }

  closeLists();
  if (inPre) {
    htmlParts.push(
      `<pre class="guide-pre"><code>${escapeHtml(preBuffer.join("\n"))}</code></pre>`
    );
  }

  return { html: htmlParts.join("\n"), toc };
}
