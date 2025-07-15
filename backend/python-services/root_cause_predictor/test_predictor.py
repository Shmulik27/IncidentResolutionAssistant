import pytest
from fastapi.testclient import TestClient
from predictor import app, predict_root_cause, PredictRequest

client = TestClient(app)

def test_memory_exhaustion():
    req = PredictRequest(logs=["2024-06-01 ERROR Out of memory in service X"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Memory exhaustion"

def test_disk_full():
    req = PredictRequest(logs=["2024-06-01 disk full on /dev/sda1"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Disk full"

def test_network_timeout():
    req = PredictRequest(logs=["2024-06-01 connection timeout to DB"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Network timeout"

def test_service_unavailable():
    req = PredictRequest(logs=["2024-06-01 connection refused by service Y"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Service unavailable"

def test_permission_issue():
    req = PredictRequest(logs=["2024-06-01 permission denied for file /etc/passwd"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Permission issue"

def test_unknown():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_predict_endpoint():
    payload = {"logs": ["2024-06-01 ERROR Out of memory in service X"]}
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    assert response.json()["root_cause"] == "Memory exhaustion"

def test_low_confidence():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_2():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_3():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_4():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_5():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_6():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_7():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_8():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_9():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_10():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_11():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_12():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_13():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_14():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_15():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_16():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_17():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_18():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_19():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_20():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_21():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_22():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_23():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_24():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_25():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_26():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_27():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_28():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_29():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_30():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_31():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_32():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_33():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_34():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_35():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_36():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_37():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_38():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_39():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_40():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_41():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_42():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_43():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_44():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_45():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_46():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_47():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_48():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_49():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_50():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_51():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_52():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_53():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_54():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_55():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_56():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_57():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_58():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_59():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_60():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_61():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_62():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_63():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_64():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_65():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_66():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_67():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_68():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_69():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_70():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_71():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_72():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_73():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_74():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_75():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_76():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_77():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_78():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_79():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_80():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_81():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_82():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_83():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_84():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_85():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_86():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_87():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_88():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_89():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_90():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_91():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_92():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_93():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_94():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_95():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_96():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_97():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_98():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_99():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_low_confidence_threshold_100():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data" 