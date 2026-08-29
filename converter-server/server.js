import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import CloudConvert from "cloudconvert";

dotenv.config();
if (!process.env.CLOUDCONVERT_API_KEY) throw new Error("Missing CLOUDCONVERT_API_KEY");

const app=express();
app.use(cors());
const upload=multer({dest:path.join(os.tmpdir(),"scanflow-upload"),limits:{fileSize:(Number(process.env.MAX_UPLOAD_MB)||25)*1024*1024}});
const cloudConvert=new CloudConvert(process.env.CLOUDCONVERT_API_KEY);

app.get("/health",(_,res)=>res.json({ok:true}));

app.post("/convert",upload.single("file"),async(req,res)=>{
  const file=req.file;
  const target=(req.body.target||"pdf").toLowerCase();
  const mode=(req.body.mode||"convert").toLowerCase();
  if(!file) return res.status(400).json({error:"file is required"});
  try{
    const ext=path.extname(file.originalname).slice(1).toLowerCase();
    const convertTask=mode==="ocr"
      ? {operation:"pdf/ocr",input:"upload",language:["eng"]}
      : mode==="optimize"
      ? {operation:"optimize",input:"upload",input_format:ext,profile:req.body.profile||"web"}
      : {operation:"convert",input:"upload",input_format:ext,output_format:target};

    let job=await cloudConvert.jobs.create({tasks:{
      upload:{operation:"import/upload"},
      process:convertTask,
      export:{operation:"export/url",input:"process"}
    }});
    const uploadTask=job.tasks.find(t=>t.name==="upload");
    await cloudConvert.tasks.upload(uploadTask,fs.createReadStream(file.path),file.originalname);
    job=await cloudConvert.jobs.wait(job.id);
    const urls=cloudConvert.jobs.getExportUrls(job);
    const out=urls[0];
    if(!out?.url) throw new Error("No output file returned");
    res.json({downloadUrl:out.url,filename:out.filename,jobId:job.id});
  }catch(error){
    res.status(500).json({error:error?.message||"Conversion failed"});
  }finally{
    fs.promises.unlink(file.path).catch(()=>{});
  }
});

app.listen(process.env.PORT||3000,()=>console.log("ScanFlow converter running"));
