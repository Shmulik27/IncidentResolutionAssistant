from setuptools import setup, find_packages

setup(
    name="k8s_log_scanner",
    version="0.1",
    packages=find_packages(),
    install_requires=[
        "fastapi",
        "pytest",
        "httpx",
        "requests",
        "types-requests",
        "prometheus_client",
        "mypy",
    ],
) 