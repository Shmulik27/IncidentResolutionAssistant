from pydantic import BaseModel

class IncidentEvent(BaseModel):
    error_summary: str
    error_details: str
    file_path: str
    line_number: int 