import unittest
from fastapi.testclient import TestClient
from ..integrator import app

class TestIntegratorUnit(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_docs_endpoint(self):
        response = self.client.get("/docs")
        self.assertEqual(response.status_code, 200)

if __name__ == "__main__":
    unittest.main() 