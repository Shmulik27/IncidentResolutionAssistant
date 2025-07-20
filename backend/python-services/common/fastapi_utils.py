from fastapi.middleware.cors import CORSMiddleware
import logging
from fastapi import FastAPI


def add_cors(app: FastAPI):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def setup_logging(service_name: str = "service", level=logging.INFO):
    logging.basicConfig(level=level)
    logger = logging.getLogger(service_name)
    return logger


def add_metrics_endpoint(app: FastAPI, get_metrics_func, content_type):
    from fastapi import Response
    @app.get("/metrics")
    def metrics():
        return Response(get_metrics_func(), media_type=content_type) 