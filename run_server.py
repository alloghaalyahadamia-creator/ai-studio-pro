import base64
import os
from io import BytesIO

import torch
import uvicorn
from diffusers import DiffusionPipeline
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import pipeline

QWEN_MODEL = os.getenv("QWEN_MODEL", "Qwen/Qwen2.5-1.5B-Instruct")
SD_MODEL = os.getenv("SD_MODEL", "runwayml/stable-diffusion-v1-5")
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

app = FastAPI(title="AI Studio Pro API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

qwen_pipeline = None
sd_pipeline = None


def get_device():
    return "cuda" if torch.cuda.is_available() else "cpu"


def get_dtype():
    return torch.float16 if torch.cuda.is_available() else torch.float32


@app.on_event("startup")
def startup_event():
    global qwen_pipeline, sd_pipeline

    device = get_device()
    dtype = get_dtype()

    try:
        qwen_pipeline = pipeline(
            "text-generation",
            model=QWEN_MODEL,
            tokenizer=QWEN_MODEL,
            torch_dtype=dtype,
            device_map="auto" if device == "cuda" else None,
        )
    except Exception as exc:
        qwen_pipeline = None
        print(f"Qwen load error: {exc}")

    try:
        sd_pipeline = DiffusionPipeline.from_pretrained(
            SD_MODEL,
            torch_dtype=dtype,
            safety_checker=None,
        )
        sd_pipeline = sd_pipeline.to(device)
    except Exception as exc:
        sd_pipeline = None
        print(f"Stable Diffusion load error: {exc}")


class GenerateRequest(BaseModel):
    prompt: str
    mode: str = "text"
    conversation_history: list = Field(default_factory=list)


@app.get("/")
def root():
    return {"message": "AI Studio Pro API is running", "status": "ok"}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "qwen_loaded": qwen_pipeline is not None,
        "sd_loaded": sd_pipeline is not None,
    }


def generate_qwen_response(prompt: str) -> str:
    if qwen_pipeline is None:
        raise HTTPException(status_code=503, detail="Qwen model not loaded")

    messages = [
        {"role": "system", "content": "أنت مساعد عربي ذكي ومفيد."},
        {"role": "user", "content": prompt},
    ]

    result = qwen_pipeline(
        messages,
        max_new_tokens=250,
        do_sample=True,
        temperature=0.7,
        top_p=0.9,
        num_return_sequences=1,
    )

    generated = result[0]["generated_text"]
    if isinstance(generated, list):
        text = generated[-1].get("content", "") if generated else ""
    elif isinstance(generated, str):
        text = generated
    else:
        text = str(generated)

    return text.strip() or "لم يتم إنشاء رد، جرّب سؤالاً مختلفاً."


def generate_sd_image(prompt: str):
    if sd_pipeline is None:
        raise HTTPException(status_code=503, detail="Stable Diffusion model not loaded")

    image = sd_pipeline(
        prompt=prompt,
        num_inference_steps=25,
        guidance_scale=7.5,
    ).images[0]

    buffered = BytesIO()
    image.save(buffered, format="PNG")
    encoded = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


@app.post("/generate")
def generate(req: GenerateRequest):
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="الرسالة لا يمكن أن تكون فارغة")

    if req.mode == "image":
        image_data = generate_sd_image(prompt)
        return {"mode": "image", "result": "تم إنشاء الصورة بنجاح.", "url": image_data}

    text_result = generate_qwen_response(prompt)
    return {"mode": "text", "result": text_result}


if __name__ == "__main__":
    uvicorn.run("run_server:app", host=HOST, port=PORT, reload=False)
