# AI Studio

تطبيق Gradio بسيط يجمع بين:
- Qwen: نموذج محادثة عربي/إنجليزي
- Stable Diffusion: إنشاء الصور من الوصف النصي

## التشغيل محليًا

```bash
pip install -r requirements.txt
python app.py
```

ثم افتح الرابط الذي يظهر في terminal، عادةً على:

```text
http://localhost:7860
```

## النشر على Hugging Face Spaces

1. أنشئ مستودعًا جديدًا على Hugging Face Spaces.
2. اختر SDK: Gradio
3. ارفع الملفات التالية:
   - app.py
   - requirements.txt
4. تأكد من أن اسم التطبيق هو `app.py`.
5. بعد الرفع، سيبني Hugging Face التطبيق تلقائيًا.

## ملاحظات

- تعتمد النماذج على الاتصال بالإنترنت عند أول تشغيل لأنها ستقوم بتحميل الأوزان.
- قد تحتاج إلى موارد مناسبة مثل GPU في Spaces.
- إذا كنت تستخدم Spaces المجاني، قد تكون السرعة محدودة حسب الخطة.
