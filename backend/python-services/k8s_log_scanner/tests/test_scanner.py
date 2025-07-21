import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.api import app


class TestK8sLogScanner(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_health_endpoint(self) -> None:
        """Test the health endpoint"""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_metrics_endpoint(self) -> None:
        """Test the metrics endpoint"""
        response = self.client.get("/metrics")
        self.assertEqual(response.status_code, 200)
        self.assertIn("k8s_scanner_requests_total", response.text)

    @patch("app.api.execute_kubectl_command")
    def test_list_clusters(self, mock_kubectl: MagicMock) -> None:
        """Test listing clusters"""
        mock_kubectl.return_value = (
            "CURRENT   NAME           CLUSTER                                                  AUTHINFO   NAMESPACE\n"
            "*         eks-cluster-1  arn:aws:eks:us-west-2:123456789012:cluster/eks-cluster-1  aws       default\n"
            "          gke-cluster-1  gke_project-zone_gke-cluster-1                            gcp       \n"
        )

        response = self.client.get("/clusters")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("clusters", data)
        self.assertEqual(len(data["clusters"]), 2)
        self.assertEqual(data["clusters"][0]["name"], "eks-cluster-1")

    @patch("app.api.execute_kubectl_command")
    def test_scan_logs_success(self, mock_kubectl: MagicMock) -> None:
        """Test successful log scanning"""
        # Mock kubectl commands
        mock_kubectl.side_effect = [
            # get pods
            """
            {
              "items": [
                {
                  "metadata": {
                    "name": "test-pod-1",
                    "namespace": "default",
                    "labels": {"app": "test"}
                  },
                  "status": {"phase": "Running"}
                }
              ]
            }
            """,
            # get logs
            """
            2024-01-01T10:00:00Z ERROR: Test error message
            2024-01-01T10:01:00Z WARN: Test warning message
            """,
        ]

        scan_request = {
            "cluster_config": {
                "name": "test-cluster",
                "type": "eks",
                "context": "test-context",
            },
            "namespaces": ["default"],
            "time_range_minutes": 60,
            "log_levels": ["ERROR", "WARN"],
            "max_lines_per_pod": 100,
        }

        response = self.client.post("/scan-logs", json=scan_request)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["cluster_name"], "test-cluster")
        self.assertGreater(data["total_logs"], 0)
        self.assertIn("test-pod-1", data["pods_scanned"][0])

    def test_scan_logs_invalid_request(self) -> None:
        """Test log scanning with invalid request"""
        response = self.client.post("/scan-logs", json={})
        self.assertEqual(response.status_code, 422)  # Validation error

    @patch("app.api.execute_kubectl_command")
    def test_scan_logs_with_filters(self, mock_kubectl: MagicMock) -> None:
        """Test log scanning with filters"""
        mock_kubectl.side_effect = [
            # get pods
            """
            {
              "items": [
                {
                  "metadata": {
                    "name": "test-pod-1",
                    "namespace": "default",
                    "labels": {"app": "test", "env": "prod"}
                  },
                  "status": {"phase": "Running"}
                }
              ]
            }
            """,
            # get logs
            """
            2024-01-01T10:00:00Z ERROR: Database connection failed
            2024-01-01T10:01:00Z INFO: Service started successfully
            """,
        ]

        scan_request = {
            "cluster_config": {"name": "test-cluster", "type": "eks"},
            "namespaces": ["default"],
            "pod_labels": {"app": "test"},
            "time_range_minutes": 30,
            "log_levels": ["ERROR"],
            "search_patterns": ["Database"],
            "max_lines_per_pod": 50,
        }

        response = self.client.post("/scan-logs", json=scan_request)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        # Should only return logs matching the search pattern
        self.assertGreater(data["total_logs"], 0)
        for log in data["logs"]:
            self.assertIn("Database", log)

    @patch("app.api.execute_kubectl_command")
    def test_scan_logs_error_handling(self, mock_kubectl: MagicMock) -> None:
        """Test error handling in log scanning"""
        mock_kubectl.side_effect = Exception("kubectl command failed")

        scan_request = {
            "cluster_config": {"name": "test-cluster", "type": "eks"},
            "namespaces": ["default"],
            "time_range_minutes": 60,
            "log_levels": ["ERROR"],
            "max_lines_per_pod": 100,
        }

        response = self.client.post("/scan-logs", json=scan_request)
        self.assertEqual(response.status_code, 500)
        self.assertIn("kubectl command failed", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
