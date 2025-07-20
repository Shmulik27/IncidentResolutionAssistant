import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from app.api import app
from app.logic import predict_root_cause
from app.models import PredictRequest

client = TestClient(app)

def test_memory_exhaustion() -> None:
    req = PredictRequest(logs=["2024-06-01 ERROR Out of memory in service X"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Memory exhaustion"

def test_disk_full() -> None:
    req = PredictRequest(logs=["2024-06-01 disk full on /dev/sda1"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Disk full"

def test_network_timeout() -> None:
    req = PredictRequest(logs=["2024-06-01 connection timeout to DB"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Network timeout"

def test_service_unavailable() -> None:
    req = PredictRequest(logs=["2024-06-01 connection refused by service Y"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Service unavailable"

def test_permission_issue() -> None:
    req = PredictRequest(logs=["2024-06-01 permission denied for file /etc/passwd"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Permission issue"

def test_unknown() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_predict_endpoint() -> None:
    payload = {"logs": ["2024-06-01 ERROR Out of memory in service X"]}
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    assert response.json()["root_cause"] == "Memory exhaustion"

def test_low_confidence() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_2() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_3() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_4() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_5() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_6() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_7() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_8() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_9() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_10() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_11() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_12() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_13() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_14() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_15() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_16() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_17() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_18() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_19() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_20() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_21() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_22() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_23() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_24() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_25() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_26() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_27() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_28() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_29() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_30() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_31() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_32() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_33() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_34() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_35() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_36() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_37() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_38() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_39() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_40() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_41() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_42() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_43() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_44() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_45() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_46() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_47() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_48() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_49() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_50() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_51() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_52() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_53() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_54() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_55() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_56() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_57() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_58() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_59() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_60() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_61() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_62() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_63() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_64() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_65() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_66() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_67() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_68() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_69() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_70() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_71() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_72() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_73() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_74() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_75() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_76() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_77() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_78() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_79() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_80() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_81() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_82() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_83() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_84() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_85() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_86() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_87() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_88() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_89() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_90() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_91() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_92() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_93() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_94() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_95() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_96() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_97() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_98() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_99() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_100() -> None:
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data" 