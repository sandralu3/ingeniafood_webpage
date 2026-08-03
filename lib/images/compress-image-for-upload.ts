/**
 * Comprime una imagen en el cliente antes de enviarla como base64 a la API.
 * Evita el límite de ~10MB del body en Next.js.
 */
export async function compressImageForUpload(
  file: File,
  options?: { maxDimension?: number; maxBase64Length?: number }
): Promise<{ base64: string; mimeType: string }> {
  const maxDimension = options?.maxDimension ?? 1200;
  const maxLength = options?.maxBase64Length ?? 3_500_000;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Lectura de imagen inválida"));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Error al leer la imagen"));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen para compresión"));
    img.src = dataUrl;
  });

  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo inicializar el canvas");

  context.drawImage(image, 0, 0, width, height);

  let quality = 0.8;
  let compressed = canvas.toDataURL("image/jpeg", quality);
  while (compressed.length > maxLength && quality > 0.45) {
    quality -= 0.1;
    compressed = canvas.toDataURL("image/jpeg", quality);
  }

  // Si aún es grande, bajar resolución.
  if (compressed.length > maxLength) {
    const shrink = 0.75;
    canvas.width = Math.max(1, Math.round(width * shrink));
    canvas.height = Math.max(1, Math.round(height * shrink));
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    compressed = canvas.toDataURL("image/jpeg", 0.7);
  }

  const match = compressed.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("No se pudo generar la imagen comprimida");

  return { mimeType: "image/jpeg", base64: match[2]!.replace(/\s/g, "") };
}
