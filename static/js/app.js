// تحسينات الأداء - JavaScript محسن
class MT103Form {
    constructor() {
        this.form = document.getElementById('mt103-form');
        this.resultDiv = document.getElementById('result');
        this.loadingDiv = document.getElementById('loading');
        this.submitBtn = document.getElementById('submit-btn');
        
        this.init();
    }

    init() {
        // إضافة مستمع الأحداث للنموذج
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        
        // إضافة التحقق من صحة البيانات في الوقت الفعلي
        this.addRealTimeValidation();
        
        // إضافة تحسينات UX
        this.addUXEnhancements();
        
        // إضافة Service Worker للتخزين المؤقت
        this.registerServiceWorker();
    }

    addRealTimeValidation() {
        const inputs = this.form.querySelectorAll('input[required]');
        
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    validateField(field) {
        const value = field.value.trim();
        const fieldName = field.name;
        
        // إزالة رسائل الخطأ السابقة
        this.clearFieldError(field);
        
        // التحقق من صحة البيانات
        let isValid = true;
        let errorMessage = '';
        
        switch(fieldName) {
            case 'sender_iban':
            case 'receiver_iban':
                if (!this.isValidIBAN(value)) {
                    isValid = false;
                    errorMessage = 'IBAN غير صحيح';
                }
                break;
            case 'sender_swift':
            case 'receiver_swift':
                if (!this.isValidSWIFT(value)) {
                    isValid = false;
                    errorMessage = 'SWIFT Code غير صحيح';
                }
                break;
            case 'amount':
                if (parseFloat(value) <= 0) {
                    isValid = false;
                    errorMessage = 'المبلغ يجب أن يكون أكبر من صفر';
                }
                break;
            default:
                if (value.length < 2) {
                    isValid = false;
                    errorMessage = 'هذا الحقل مطلوب';
                }
        }
        
        if (!isValid) {
            this.showFieldError(field, errorMessage);
        }
        
        return isValid;
    }

    isValidIBAN(iban) {
        // تبسيط التحقق من IBAN
        return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/.test(iban);
    }

    isValidSWIFT(swift) {
        return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swift);
    }

    showFieldError(field, message) {
        field.classList.add('error');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        errorDiv.style.color = 'var(--danger-color)';
        errorDiv.style.fontSize = '0.8rem';
        errorDiv.style.marginTop = '5px';
        
        field.parentNode.appendChild(errorDiv);
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const errorDiv = field.parentNode.querySelector('.field-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    addUXEnhancements() {
        // إضافة تأثيرات بصرية
        const inputs = this.form.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                input.parentNode.classList.add('focused');
            });
            
            input.addEventListener('blur', () => {
                input.parentNode.classList.remove('focused');
            });
        });
        
        // إضافة اختصارات لوحة المفاتيح
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.form.dispatchEvent(new Event('submit'));
            }
        });
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        // التحقق من صحة جميع الحقول
        const inputs = this.form.querySelectorAll('input[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });
        
        if (!isValid) {
            this.showResult('يرجى تصحيح الأخطاء في النموذج', 'error');
            return;
        }
        
        // إظهار حالة التحميل
        this.showLoading(true);
        
        try {
            const formData = new FormData(this.form);
            const payload = this.buildPayload(formData);
            
            const response = await this.sendRequest(payload);
            
            if (response.ok) {
                const data = await response.json();
                this.showResult(JSON.stringify(data, null, 2), 'success');
                
                // حفظ البيانات في التخزين المحلي
                this.saveToLocalStorage(payload);
                
                // إعادة تعيين النموذج
                this.form.reset();
            } else {
                const errorData = await response.json();
                this.showResult(`خطأ: ${errorData.error}`, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showResult('حدث خطأ في الاتصال بالخادم', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    buildPayload(formData) {
        return {
            protocol: "101.1",
            server: "SBI-3.10.0693.5.2-e19",
            currency: "EUR",
            amount: parseFloat(formData.get('amount')),
            sender: {
                Name: formData.get('sender_name'),
                Account: formData.get('sender_account'),
                IBAN: formData.get('sender_iban'),
                Bank: formData.get('sender_bank'),
                SWIFT: formData.get('sender_swift')
            },
            receiver: {
                Name: formData.get('receiver_name'),
                IBAN: formData.get('receiver_iban'),
                Bank: formData.get('receiver_bank'),
                SWIFT: formData.get('receiver_swift')
            }
        };
    }

    async sendRequest(payload) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 ثانية timeout
        
        try {
            const response = await fetch('/api/send_mt103', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    showLoading(show) {
        this.loadingDiv.style.display = show ? 'block' : 'none';
        this.submitBtn.disabled = show;
        
        if (show) {
            this.submitBtn.textContent = 'جاري الإرسال...';
        } else {
            this.submitBtn.textContent = 'إرسال التحويل';
        }
    }

    showResult(message, type = 'info') {
        this.resultDiv.textContent = message;
        this.resultDiv.className = `result ${type}`;
        this.resultDiv.style.display = 'block';
        
        // إخفاء النتيجة بعد 10 ثوانٍ
        setTimeout(() => {
            this.resultDiv.style.display = 'none';
        }, 10000);
    }

    saveToLocalStorage(data) {
        try {
            const history = JSON.parse(localStorage.getItem('mt103_history') || '[]');
            history.unshift({
                ...data,
                timestamp: new Date().toISOString()
            });
            
            // الاحتفاظ بآخر 10 عمليات فقط
            if (history.length > 10) {
                history.splice(10);
            }
            
            localStorage.setItem('mt103_history', JSON.stringify(history));
        } catch (error) {
            console.warn('Could not save to localStorage:', error);
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered successfully');
            } catch (error) {
                console.warn('Service Worker registration failed:', error);
            }
        }
    }
}

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    new MT103Form();
    
    // إضافة تحسينات إضافية للأداء
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
            // تحميل الموارد غير الحرجة في وقت الفراغ
            console.log('Loading non-critical resources...');
        });
    }
});

// تحسينات للأداء - Preload للموارد المهمة
const preloadLinks = [
    { rel: 'preload', href: '/static/css/styles.css', as: 'style' },
    { rel: 'preload', href: '/static/js/app.js', as: 'script' }
];

preloadLinks.forEach(link => {
    const linkElement = document.createElement('link');
    Object.assign(linkElement, link);
    document.head.appendChild(linkElement);
});