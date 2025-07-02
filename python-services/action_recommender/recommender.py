from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

@app.post("/recommend")
def recommend_action(request: Request):
    return JSONResponse({"result": "Action recommendation not implemented yet."}) 