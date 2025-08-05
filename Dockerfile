# Dockerfile محسن للأداء - Multi-stage build
FROM python:3.11-slim as builder

# تثبيت الأدوات المطلوبة للبناء
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# إنشاء بيئة افتراضية
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# نسخ ملف المتطلبات وتثبيت المكتبات
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# مرحلة الإنتاج
FROM python:3.11-slim as production

# تثبيت حزم النظام المطلوبة
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# نسخ البيئة الافتراضية من مرحلة البناء
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# إنشاء مستخدم غير root
RUN groupadd -r appuser && useradd -r -g appuser appuser

# إنشاء مجلد العمل
WORKDIR /app

# نسخ ملفات التطبيق
COPY --chown=appuser:appuser . .

# إنشاء مجلدات التخزين المؤقت
RUN mkdir -p /app/cache /app/logs && \
    chown -R appuser:appuser /app

# تبديل إلى المستخدم غير root
USER appuser

# تعيين متغيرات البيئة
ENV PYTHONPATH=/app
ENV FLASK_ENV=production
ENV FLASK_APP=app.py

# فتح المنفذ
EXPOSE 5000

# فحص الصحة
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# تشغيل التطبيق
CMD ["gunicorn", "--config", "gunicorn.conf.py", "app:app"]