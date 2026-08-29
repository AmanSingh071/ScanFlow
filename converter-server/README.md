# ScanFlow Conversion Backend

This backend keeps the CloudConvert API key out of the Android APK.

## Supports
- Word/DOCX -> PDF
- PDF -> DOCX
- PDF OCR
- PDF/image optimization

## Run locally
1. Copy `.env.example` to `.env`
2. Add your CloudConvert API key
3. Run `npm install`
4. Run `npm start`

## Endpoint
POST `/convert` as multipart/form-data:
- `file`: source file
- `target`: pdf or docx for normal conversion
- `mode`: convert, ocr, or optimize
- `profile`: optional optimize profile

The response returns a temporary `downloadUrl`.

Do not place CLOUDCONVERT_API_KEY in the Expo app or commit .env.
