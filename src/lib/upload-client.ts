"use client";

// Phone-first upload: shrink to ≤1600px WebP ≤800KB in-browser (saves data),
// strip EXIF/GPS by re-drawing to canvas, then POST to /api/uploads.
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const max = 1600;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  for (const q of [0.82, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", q));
    if (blob && blob.size <= 800 * 1024) return blob;
    if (blob && q === 0.55) return blob;
  }
  return file;
}

export async function uploadPhoto(file: File, kind = "evidence"): Promise<string> {
  const small = await compressImage(file);
  const form = new FormData();
  form.set("file", small, "photo.webp");
  form.set("kind", kind);
  const res = await fetch("/api/uploads", { method: "POST", body: form });
  const j = await res.json().catch(() => ({}));
  if (!j.ok) throw new Error(j.error ?? "Upload failed");
  return j.url as string;
}
