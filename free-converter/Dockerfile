FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends libreoffice libreoffice-writer fonts-dejavu-core && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Render builds this Dockerfile with the repository root as build context.
COPY free-converter/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY free-converter/main.py .

RUN mkdir -p /tmp/scanflow

EXPOSE 8000

CMD ["sh","-c","uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
