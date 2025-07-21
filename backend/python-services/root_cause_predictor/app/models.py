from pydantic import BaseModel
from typing import List


class PredictRequest(BaseModel):
    logs: List[str]
