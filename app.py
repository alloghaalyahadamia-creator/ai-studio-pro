import os

import gradio as gr
import torch
from diffusers import DiffusionPipeline
from transformers import pipeline

QWEN_MODEL = os.getenv("QWEN_MODEL", "Qwen/Qwen2.5-1.5B-Instruct")
SD_MODEL = os.getenv("SD_MODEL", "runwayml/stable-diffusion-v1-5")


def get_device():
    return "cuda" if torch.cuda.is_available() else "cpu"


def get_dtype():
    return torch.float16 if torch.cuda.is_available() else torch.float32


device = get_device()
dtype = get_dtype()

qwen_pipe = None
sd_pipe = None
qwen_ready = False
sd_ready = False

try:
    qwen_pipe = pipeline(
        "text-generation",
        model=QWEN_MODEL,
        tokenizer=QWEN_MODEL,
        torch_dtype=dtype,
        device_map="auto" if device == "cuda" else None,
    )
    qwen_ready = True
except Exception as exc:
    qwen_pipe = None
    qwen_ready = False
    print(f"Qwen load error: {exc}")

try:
    sd_pipe = DiffusionPipeline.from_pretrained(
        SD_MODEL,
        torch_dtype=dtype,
        safety_checker=None,
    )
    sd_pipe = sd_pipe.to(device)
    sd_ready = True
except Exception as exc:
    sd_pipe = None
    sd_ready = False
    print(f"Stable Diffusion load error: {exc}")


def answer_qwen(prompt: str):
    if not qwen_ready or qwen_pipe is None:
        return "حدث خطأ أثناء تحميل نموذج Qwen. يرجى التحقق من الاتصال أو اسم النموذج."

    messages = [
        {"role": "system", "content": "أنت مساعد عربي ذكي ومفيد."},
        {"role": "user", "content": prompt},
    ]
    result = qwen_pipe(
        messages,
        max_new_tokens=250,
        do_sample=True,
        temperature=0.7,
        top_p=0.9,
        num_return_sequences=1,
    )
    text = result[0]["generated_text"]
    if isinstance(text, list):
        text = text[-1].get("content", "")
    elif isinstance(text, str):
        text = text
    else:
        text = str(text)
    return text.strip() or "لم يتم إنشاء رد، جرّب سؤالاً مختلفاً."


def generate_image(prompt: str, steps: int = 25, guidance: float = 7.5):
    if not sd_ready or sd_pipe is None:
        return None, "حدث خطأ أثناء تحميل نموذج Stable Diffusion."

    image = sd_pipe(
        prompt=prompt,
        num_inference_steps=int(steps),
        guidance_scale=float(guidance),
    ).images[0]
    return image, "تم إنشاء الصورة بنجاح."


with gr.Blocks(title="AI Studio") as demo:
    gr.Markdown("# AI Studio\nواجهة عربية بسيطة لاختبار محادثة الذكاء الاصطناعي وتوليد الصور.")

    with gr.Tab("محادثة وكود"):
        chatbot = gr.Chatbot(type="messages", height=500)
        user_input = gr.Textbox(
            placeholder="اكتب سؤالك أو طلبك هنا...",
            lines=3,
            show_label=False,
        )

        def respond(message, history):
            if not message.strip():
                return history
            reply = answer_qwen(message)
            new_history = history + [{"role": "user", "content": message}, {"role": "assistant", "content": reply}]
            return new_history

        submit_btn = gr.Button("إرسال")
        clear_btn = gr.Button("مسح")

        submit_btn.click(
            respond,
            inputs=[user_input, chatbot],
            outputs=chatbot,
        )
        user_input.submit(
            respond,
            inputs=[user_input, chatbot],
            outputs=chatbot,
        )
        clear_btn.click(lambda: [], None, chatbot)

    with gr.Tab("توليد صور"):
        prompt_box = gr.Textbox(
            label="وصف الصورة",
            placeholder="مثال: مدينة مستقبلية عند الغروب، تفاصيل عالية، إضاءة جميلة",
            lines=2,
        )
        with gr.Row():
            steps_slider = gr.Slider(10, 60, value=25, step=1, label="عدد الخطوات")
            guidance_slider = gr.Slider(1, 20, value=7.5, step=0.5, label="مقياس التوجيه")

        with gr.Row():
            generate_btn = gr.Button("إنشاء الصورة")

        output_image = gr.Image(label="النتيجة")
        status_box = gr.Textbox(label="الحالة", interactive=False)

        generate_btn.click(
            generate_image,
            inputs=[prompt_box, steps_slider, guidance_slider],
            outputs=[output_image, status_box],
        )


if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860, share=False)
