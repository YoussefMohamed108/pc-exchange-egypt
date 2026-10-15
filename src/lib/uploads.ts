import sharp from "sharp";
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export async function sanitizeProductPhoto(bytes: Uint8Array, mime: string) {
  if (!bytes.length || bytes.length > MAX_PHOTO_BYTES)
    throw new Error("Photo must be smaller than 5 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(mime))
    throw new Error("Use a JPEG, PNG or WebP image.");
  const formats: Record<string, string> = {
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const decoder = sharp(bytes, { limitInputPixels: 24_000_000, animated: false });
  const metadata = await decoder.metadata();
  if (metadata.format !== formats[mime] || (metadata.pages || 1) > 1)
    throw new Error("Photo contents do not match the file type.");
  // Decode and re-encode; strip EXIF/GPS and embedded metadata, constrain dimensions.
  return decoder
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
}
