const INSTAGRAM_HOST_PATTERN = /(^|\.)instagram\.com$/i;

export function getInstagramUrlMatchKey(input: string): string | null {
  const normalized = normalizeInstagramUrl(input);
  if (!normalized) return null;

  try {
    const url = new URL(normalized);
    const path = url.pathname.replace(/\/+$/g, "");
    const mediaMatch = path.match(/\/(reel|p|tv)\/([^/]+)/i);
    if (mediaMatch) {
      return `${mediaMatch[1].toLowerCase()}/${mediaMatch[2]}`;
    }

    const handleMatch = path.match(/^\/([^/]+)\/?$/);
    if (handleMatch && !["reel", "p", "tv", "stories"].includes(handleMatch[1].toLowerCase())) {
      return `@${handleMatch[1].toLowerCase()}`;
    }

    return path.toLowerCase();
  } catch {
    return null;
  }
}

export function instagramUrlsMatch(left: string, right: string): boolean {
  const leftKey = getInstagramUrlMatchKey(left);
  const rightKey = getInstagramUrlMatchKey(right);
  return Boolean(leftKey && rightKey && leftKey === rightKey);
}

export function normalizeInstagramUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("@")) {
    const handle = trimmed.slice(1).replace(/\/+$/g, "");
    if (!handle) return null;
    return `https://www.instagram.com/${handle}/`;
  }

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (!INSTAGRAM_HOST_PATTERN.test(url.hostname)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function isValidInstagramUrl(input: string): boolean {
  return normalizeInstagramUrl(input) !== null;
}
