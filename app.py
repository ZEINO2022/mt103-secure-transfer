from flask import Flask, render_template, request, jsonify
from flask_compress import Compress
from flask_caching import Cache
import json
import time
import logging
from functools import wraps

# إعداد Flask مع تحسينات الأداء
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['COMPRESS_MIMETYPES'] = [
    'text/html', 'text/css', 'text/xml', 'application/json', 'application/javascript'
]
app.config['COMPRESS_LEVEL'] = 6
app.config['COMPRESS_MIN_SIZE'] = 500

# إعداد الضغط
Compress(app)

# إعداد التخزين المؤقت
cache = Cache(config={
    'CACHE_TYPE': 'simple',
    'CACHE_DEFAULT_TIMEOUT': 300
})
cache.init_app(app)

# إعداد التسجيل
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def performance_monitor(f):
    """مزخرف لمراقبة أداء الدوال"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = time.time()
        result = f(*args, **kwargs)
        end_time = time.time()
        logger.info(f"{f.__name__} took {end_time - start_time:.4f} seconds")
        return result
    return decorated_function

@app.route('/')
@cache.cached(timeout=300)  # تخزين مؤقت لمدة 5 دقائق
@performance_monitor
def index():
    """الصفحة الرئيسية مع تحسينات الأداء"""
    return render_template('form.html')

@app.route('/api/send_mt103', methods=['POST'])
@performance_monitor
def send_mt103():
    """API endpoint للتحويلات مع تحسينات الأداء"""
    try:
        # التحقق من صحة البيانات
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON data'}), 400
        
        # التحقق من الحقول المطلوبة
        required_fields = ['amount', 'sender', 'receiver']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # محاكاة معالجة التحويل
        time.sleep(0.1)  # محاكاة وقت المعالجة
        
        # إنشاء استجابة محسنة
        response = {
            'status': 'success',
            'transaction_id': f'TXN_{int(time.time())}',
            'timestamp': time.time(),
            'data': data
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error processing MT103: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/health')
@cache.cached(timeout=60)
def health_check():
    """نقطة فحص الصحة مع تخزين مؤقت"""
    return jsonify({'status': 'healthy', 'timestamp': time.time()})

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000, threaded=True)