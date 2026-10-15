import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { sanitizeProductPhoto, MAX_PHOTO_BYTES } from "@/lib/uploads";
describe("secure photo processing", () => {
  it("decodes and re-encodes images as WebP without metadata", async () => {
    const source = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .png()
      .toBuffer();
    const output = await sanitizeProductPhoto(source, "image/png");
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    expect(meta.width).toBe(1);
  });
  it("rejects disguised SVG, mismatched MIME types and oversized data", async () => {
    await expect(
      sanitizeProductPhoto(
        new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
        "image/png",
      ),
    ).rejects.toThrow();
    const source = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .png()
      .toBuffer();
    await expect(sanitizeProductPhoto(source, "image/jpeg")).rejects.toThrow(/match/);
    await expect(
      sanitizeProductPhoto(new Uint8Array(MAX_PHOTO_BYTES + 1), "image/png"),
    ).rejects.toThrow(/5 MB/);
  });
});
