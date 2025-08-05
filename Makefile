# Makefile لتطبيق MT103 محسن الأداء

.PHONY: help install run test build deploy clean performance-test docker-build docker-run docker-stop

# المتغيرات
PYTHON = python3
PIP = pip3
DOCKER = docker
DOCKER_COMPOSE = docker-compose
APP_NAME = mt103-app

# المساعدة
help:
	@echo "🚀 أوامر تطبيق MT103 محسن الأداء"
	@echo ""
	@echo "التثبيت والتشغيل:"
	@echo "  install          - تثبيت المتطلبات"
	@echo "  run              - تشغيل التطبيق محلياً"
	@echo "  run-dev          - تشغيل التطبيق في وضع التطوير"
	@echo ""
	@echo "Docker:"
	@echo "  docker-build     - بناء صورة Docker"
	@echo "  docker-run       - تشغيل التطبيق بـ Docker"
	@echo "  docker-stop      - إيقاف التطبيق"
	@echo "  docker-logs      - عرض سجلات Docker"
	@echo ""
	@echo "الاختبار:"
	@echo "  test             - تشغيل اختبارات الوحدة"
	@echo "  performance-test - اختبار الأداء"
	@echo "  load-test        - اختبار التحميل"
	@echo ""
	@echo "الصيانة:"
	@echo "  clean            - تنظيف الملفات المؤقتة"
	@echo "  logs             - عرض السجلات"
	@echo "  status           - حالة التطبيق"

# تثبيت المتطلبات
install:
	@echo "📦 تثبيت المتطلبات..."
	$(PYTHON) -m venv venv
	. venv/bin/activate && $(PIP) install --upgrade pip
	. venv/bin/activate && $(PIP) install -r requirements.txt
	@echo "✅ تم تثبيت المتطلبات بنجاح"

# تشغيل التطبيق محلياً
run:
	@echo "🚀 تشغيل التطبيق..."
	. venv/bin/activate && $(PYTHON) app.py

# تشغيل التطبيق في وضع التطوير
run-dev:
	@echo "🔧 تشغيل التطبيق في وضع التطوير..."
	. venv/bin/activate && FLASK_ENV=development $(PYTHON) app.py

# بناء صورة Docker
docker-build:
	@echo "🔨 بناء صورة Docker..."
	$(DOCKER) build -t $(APP_NAME) .
	@echo "✅ تم بناء الصورة بنجاح"

# تشغيل التطبيق بـ Docker
docker-run:
	@echo "🐳 تشغيل التطبيق بـ Docker..."
	$(DOCKER_COMPOSE) up -d
	@echo "✅ التطبيق يعمل على http://localhost"

# إيقاف التطبيق
docker-stop:
	@echo "🛑 إيقاف التطبيق..."
	$(DOCKER_COMPOSE) down
	@echo "✅ تم إيقاف التطبيق"

# عرض سجلات Docker
docker-logs:
	@echo "📋 عرض السجلات..."
	$(DOCKER_COMPOSE) logs -f

# اختبارات الوحدة
test:
	@echo "🧪 تشغيل اختبارات الوحدة..."
	. venv/bin/activate && $(PYTHON) -m pytest tests/ -v

# اختبار الأداء
performance-test:
	@echo "⚡ اختبار الأداء..."
	. venv/bin/activate && $(PYTHON) performance_test.py

# اختبار التحميل
load-test:
	@echo "📊 اختبار التحميل..."
	. venv/bin/activate && $(PYTHON) performance_test.py --concurrent-users 20 --requests-per-user 10

# تنظيف الملفات المؤقتة
clean:
	@echo "🧹 تنظيف الملفات المؤقتة..."
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	rm -rf build/
	rm -rf dist/
	rm -rf .pytest_cache/
	rm -rf .coverage
	rm -rf htmlcov/
	@echo "✅ تم التنظيف بنجاح"

# عرض السجلات
logs:
	@echo "📋 عرض السجلات..."
	tail -f logs/app.log

# حالة التطبيق
status:
	@echo "📊 حالة التطبيق..."
	@echo "Docker Containers:"
	$(DOCKER_COMPOSE) ps
	@echo ""
	@echo "System Resources:"
	$(DOCKER) stats --no-stream

# إعادة تشغيل التطبيق
restart:
	@echo "🔄 إعادة تشغيل التطبيق..."
	$(DOCKER_COMPOSE) restart
	@echo "✅ تم إعادة التشغيل"

# تحديث التطبيق
update:
	@echo "🔄 تحديث التطبيق..."
	git pull origin main
	$(DOCKER_COMPOSE) down
	$(DOCKER_COMPOSE) build --no-cache
	$(DOCKER_COMPOSE) up -d
	@echo "✅ تم التحديث بنجاح"

# نسخ احتياطي
backup:
	@echo "💾 إنشاء نسخة احتياطية..."
	tar -czf backup-$(shell date +%Y%m%d-%H%M%S).tar.gz \
		--exclude=venv \
		--exclude=__pycache__ \
		--exclude=*.pyc \
		--exclude=.git \
		.
	@echo "✅ تم إنشاء النسخة الاحتياطية"

# استعادة النسخة الاحتياطية
restore:
	@echo "📥 استعادة النسخة الاحتياطية..."
	@read -p "أدخل اسم ملف النسخة الاحتياطية: " backup_file; \
	tar -xzf $$backup_file
	@echo "✅ تم استعادة النسخة الاحتياطية"

# مراقبة الأداء
monitor:
	@echo "📈 مراقبة الأداء..."
	@echo "Prometheus: http://localhost:9090"
	@echo "Grafana: http://localhost:3000 (admin/admin)"
	@echo "Health Check: http://localhost/health"

# تثبيت أدوات التطوير
install-dev:
	@echo "🔧 تثبيت أدوات التطوير..."
	. venv/bin/activate && $(PIP) install pytest pytest-cov black flake8 mypy
	@echo "✅ تم تثبيت أدوات التطوير"

# تنسيق الكود
format:
	@echo "🎨 تنسيق الكود..."
	. venv/bin/activate && black .
	@echo "✅ تم تنسيق الكود"

# فحص جودة الكود
lint:
	@echo "🔍 فحص جودة الكود..."
	. venv/bin/activate && flake8 .
	. venv/bin/activate && mypy .
	@echo "✅ تم فحص جودة الكود"

# إنشاء شهادات SSL للتطوير
ssl-dev:
	@echo "🔐 إنشاء شهادات SSL للتطوير..."
	mkdir -p ssl
	openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/C=SA/ST=Riyadh/L=Riyadh/O=Dev/CN=localhost"
	@echo "✅ تم إنشاء الشهادات"

# تشغيل كامل للتطوير
dev-setup: install ssl-dev docker-build docker-run
	@echo "🎉 تم إعداد بيئة التطوير بنجاح!"
	@echo "🌐 التطبيق: http://localhost"
	@echo "📊 Grafana: http://localhost:3000"
	@echo "📈 Prometheus: http://localhost:9090"