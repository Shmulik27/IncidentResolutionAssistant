from pydantic import BaseModel
from typing import List

class LogRequest(BaseModel):
    logs: List[str] 