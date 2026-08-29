# ScanFlow Free Converter

No CloudConvert key. No paid conversion API.

## Engines
- LibreOffice: DOC/DOCX/ODT -> PDF
- pdf2docx: PDF -> DOCX
- PyMuPDF: merge, split, page extraction, PDF -> images, compression

## Run with Docker
docker build -t scanflow-free-converter .
docker run --rm -p 8000:8000 scanflow-free-converter

Open http://127.0.0.1:8000/health

## Endpoints
POST /word-to-pdf
POST /pdf-to-word
POST /pdf-merge (multiple files)
POST /pdf-split?start=1&end=3
POST /pdf-to-images?dpi=150
POST /pdf-compress

The server must be reachable from the Android phone. For same Wi-Fi use your PC's LAN IP and port 8000.
