import os, shutil, subprocess, tempfile, uuid, zipfile
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, JSONResponse
import fitz
from pdf2docx import Converter

app=FastAPI(title="ScanFlow Free Converter")
BASE=Path(tempfile.gettempdir())/"scanflow"
BASE.mkdir(exist_ok=True)

def workdir():
    p=BASE/str(uuid.uuid4()); p.mkdir(parents=True,exist_ok=True); return p

def result(path:Path, media:str):
    return FileResponse(path,media_type=media,filename=path.name)

@app.get("/health")
def health(): return {"ok":True,"engine":"LibreOffice + PyMuPDF + pdf2docx"}

@app.post("/word-to-pdf")
async def word_to_pdf(file:UploadFile=File(...)):
    d=workdir(); src=d/file.filename
    src.write_bytes(await file.read())
    out=d/"out"; out.mkdir()
    p=subprocess.run(["libreoffice","--headless","--convert-to","pdf","--outdir",str(out),str(src)],capture_output=True,text=True,timeout=120)
    pdf=out/(src.stem+".pdf")
    if not pdf.exists(): raise HTTPException(500,p.stderr or p.stdout or "Conversion failed")
    return result(pdf,"application/pdf")

@app.post("/pdf-to-word")
async def pdf_to_word(file:UploadFile=File(...)):
    d=workdir(); src=d/file.filename; dst=d/(src.stem+".docx")
    src.write_bytes(await file.read())
    cv=Converter(str(src))
    try: cv.convert(str(dst),start=0,end=None)
    finally: cv.close()
    return result(dst,"application/vnd.openxmlformats-officedocument.wordprocessingml.document")

@app.post("/pdf-merge")
async def pdf_merge(files:list[UploadFile]=File(...)):
    d=workdir(); out=fitz.open()
    for f in files:
        p=d/f.filename; p.write_bytes(await f.read()); doc=fitz.open(p); out.insert_pdf(doc); doc.close()
    dst=d/"merged.pdf"; out.save(dst,garbage=4,deflate=True); out.close()
    return result(dst,"application/pdf")

@app.post("/pdf-split")
async def pdf_split(file:UploadFile=File(...), start:int=1, end:int=1):
    d=workdir(); src=d/file.filename; src.write_bytes(await file.read())
    doc=fitz.open(src)
    if start<1 or end<start or end>len(doc): raise HTTPException(400,"Invalid page range")
    out=fitz.open(); out.insert_pdf(doc,from_page=start-1,to_page=end-1)
    dst=d/f"{src.stem}_{start}-{end}.pdf"; out.save(dst,garbage=4,deflate=True); out.close(); doc.close()
    return result(dst,"application/pdf")

@app.post("/pdf-to-images")
async def pdf_to_images(file:UploadFile=File(...), dpi:int=150):
    d=workdir(); src=d/file.filename; src.write_bytes(await file.read())
    doc=fitz.open(src); paths=[]
    zoom=max(0.5,min(dpi,300))/72
    for i,page in enumerate(doc):
        pix=page.get_pixmap(matrix=fitz.Matrix(zoom,zoom),alpha=False)
        p=d/f"page-{i+1}.png"; pix.save(p); paths.append(p)
    doc.close()
    zip_path=d/"pages.zip"
    with zipfile.ZipFile(zip_path,"w",zipfile.ZIP_DEFLATED) as z:
        for p in paths:z.write(p,p.name)
    return result(zip_path,"application/zip")

@app.post("/pdf-compress")
async def pdf_compress(file:UploadFile=File(...)):
    d=workdir(); src=d/file.filename; src.write_bytes(await file.read())
    doc=fitz.open(src); dst=d/"compressed.pdf"
    doc.save(dst,garbage=4,deflate=True,clean=True); doc.close()
    return result(dst,"application/pdf")
