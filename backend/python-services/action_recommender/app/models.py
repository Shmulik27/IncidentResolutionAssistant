from pydantic import BaseModel

class RecommendRequest(BaseModel):
    root_cause: str

class RecommendResponse(BaseModel):
    action: str 