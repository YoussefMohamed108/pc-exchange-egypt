"""Convert untrusted screenshot PDFs into a new image-only PDF in a bounded child process."""
import io
import sys
from pathlib import Path


def render(source: bytes) -> tuple[bytes, int]:
    import pypdfium2 as pdfium
    from PIL import Image

    if not source.startswith(b"%PDF-") or not 0 < len(source) <= 3 * 1024 * 1024:
        raise ValueError("Invalid PDF input")
    images: list[Image.Image] = []
    try:
        with pdfium.PdfDocument(source) as pdf:
            if not 1 <= len(pdf) <= 12:
                raise ValueError("Use 1–12 pages")
            for page in pdf:
                width, height = page.get_size()
                if not (10 <= width <= 3000 and 10 <= height <= 3000):
                    raise ValueError("Unsupported page dimensions")
                # PDFium's default build has no V8/XFA; do not initialize forms.
                bitmap = page.render(scale=min(2, 1800 / max(width, height)), draw_annots=False)
                images.append(bitmap.to_pil().convert("RGB"))
                bitmap.close()
                page.close()
        output = io.BytesIO()
        images[0].save(output, format="PDF", save_all=True, append_images=images[1:], resolution=144, quality=90)
        data = output.getvalue()
        if len(data) > 3 * 1024 * 1024:
            raise ValueError("Rendered evidence is too large")
        return data, len(images)
    finally:
        for image in images:
            image.close()


if __name__ == "__main__":
    try:
        if sys.platform != "win32":
            import resource
            resource.setrlimit(resource.RLIMIT_AS, (768 * 1024 * 1024, 768 * 1024 * 1024))
            resource.setrlimit(resource.RLIMIT_CPU, (20, 20))
        result, pages = render(Path(sys.argv[1]).read_bytes())
        Path(sys.argv[2]).write_bytes(result)
        print(pages)
    except Exception:
        # Never reflect source content, paths or credentials in errors.
        sys.exit(1)
