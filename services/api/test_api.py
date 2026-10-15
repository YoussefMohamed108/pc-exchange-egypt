import os
import io
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class ApiBoundaryTests(unittest.TestCase):
    def test_health_does_not_claim_pricing(self):
        response = client.get("/v1/health")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["pricing_available"])

    @patch.dict(os.environ, {"PRICING_SERVICE_TOKEN": "a" * 32})
    def test_authentication_required(self):
        response = client.post("/v1/price-estimates", json={})
        self.assertEqual(response.status_code, 401)

    @patch.dict(os.environ, {"PRICING_SERVICE_TOKEN": "a" * 32})
    def test_no_fabricated_estimate(self):
        response = client.post("/v1/price-estimates", headers={"Authorization": "Bearer " + "a" * 32}, json={
            "category": "gpu", "manufacturer": "Test fixture", "model": "Isolated test model",
            "condition": "B", "age_months": 12,
        })
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["detail"]["code"], "insufficient_market_data")

    @patch.dict(os.environ, {"PRICING_SERVICE_TOKEN": "a" * 32})
    def test_rejects_untrusted_fields(self):
        response = client.post("/v1/price-estimates", headers={"Authorization": "Bearer " + "a" * 32}, json={
            "category": "gpu", "manufacturer": "Test", "model": "Fixture", "condition": "A", "age_months": -1, "price": 100,
        })
        self.assertEqual(response.status_code, 422)


class EvidenceBoundaryTests(unittest.TestCase):
    def test_requires_a_session(self):
        response = client.post("/evidence/v1/submit/10000000-0000-4000-8000-000000000001?revision=1", content=b"%PDF-test", headers={"Content-Type":"application/pdf"})
        self.assertEqual(response.status_code, 401)

    def test_pdf_is_rebuilt_without_source_metadata(self):
        from PIL import Image
        from app.evidence import process_pdf
        source = io.BytesIO()
        Image.new("RGB", (400, 300), "white").save(source, format="PDF", title="PRIVATE_SOURCE_METADATA_123")
        original = source.getvalue()
        clean, pages = process_pdf(original)
        self.assertEqual(pages, 1)
        self.assertTrue(clean.startswith(b"%PDF-"))
        self.assertNotEqual(clean, original)
        self.assertNotIn(b"PRIVATE_SOURCE_METADATA_123", clean)

    def test_malformed_and_excessive_pages_are_rejected(self):
        from PIL import Image
        from app.evidence import process_pdf
        for value in (b"not pdf", b"%PDF-invalid", b"%PDF-" + b"x" * (3 * 1024 * 1024)):
            with self.assertRaises(ValueError):
                process_pdf(value)
        output = io.BytesIO()
        image = Image.new("RGB", (100, 100), "white")
        image.save(output, format="PDF", save_all=True, append_images=[image] * 12)
        with self.assertRaises(ValueError):
            process_pdf(output.getvalue())


if __name__ == "__main__":
    unittest.main()
