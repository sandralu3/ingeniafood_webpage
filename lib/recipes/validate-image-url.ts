export async function isImageUrlReachable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(6000)
    });
    return response.ok;
  } catch {
    return false;
  }
}
