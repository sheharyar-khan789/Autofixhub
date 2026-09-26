"use client";

const MAX_DIMENSION = 1600;
const TARGET_BYTES = 900_000;

const toBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

/**
 * Resizes and re-encodes to JPEG in the browser. Keeps uploads small enough for
 * a serverless request body, and drops EXIF metadata (including GPS location).
 */
export async function compressImage(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    throw new Error("Use a JPEG, PNG or WebP photo.");
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This image could not be read. Try a different photo.");
  }
  let scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  for (let attempt = 0; attempt < 5; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser could not process this image.");
    ctx.fillStyle = "#ffffff"; // flatten transparency
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const q of [0.82, 0.7, 0.58]) {
      const blob = await toBlob(canvas, q);
      if (blob && blob.size <= TARGET_BYTES) {
        bitmap.close();
        return blob;
      }
    }
    scale *= 0.8;
  }
  bitmap.close();
  throw new Error("This photo is too large to upload. Try a smaller one.");
}
