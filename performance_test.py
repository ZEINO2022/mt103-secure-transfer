#!/usr/bin/env python3
"""
Script لاختبار أداء تطبيق MT103
"""

import requests
import time
import json
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
import argparse
import sys

class PerformanceTester:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.results = {
            'page_load': [],
            'api_calls': [],
            'errors': []
        }
    
    def test_page_load(self, iterations=10):
        """اختبار تحميل الصفحة الرئيسية"""
        print(f"🔍 اختبار تحميل الصفحة ({iterations} مرة)...")
        
        for i in range(iterations):
            try:
                start_time = time.time()
                response = requests.get(f"{self.base_url}/", timeout=10)
                end_time = time.time()
                
                if response.status_code == 200:
                    load_time = (end_time - start_time) * 1000  # تحويل إلى مللي ثانية
                    self.results['page_load'].append(load_time)
                    print(f"  ✅ الطلب {i+1}: {load_time:.2f}ms")
                else:
                    print(f"  ❌ الطلب {i+1}: خطأ {response.status_code}")
                    
            except Exception as e:
                print(f"  ❌ الطلب {i+1}: {str(e)}")
                self.results['errors'].append(str(e))
    
    def test_api_call(self, iterations=10):
        """اختبار استدعاءات API"""
        print(f"🔍 اختبار API ({iterations} مرة)...")
        
        # بيانات اختبارية
        test_data = {
            "protocol": "101.1",
            "server": "SBI-3.10.0693.5.2-e19",
            "currency": "EUR",
            "amount": 1000.00,
            "sender": {
                "Name": "Test Sender",
                "Account": "123456789",
                "IBAN": "SA0380000000608010167519",
                "Bank": "Test Bank",
                "SWIFT": "SABBSARI"
            },
            "receiver": {
                "Name": "Test Receiver",
                "IBAN": "DE89370400440532013000",
                "Bank": "Test Bank DE",
                "SWIFT": "COBADEFF"
            }
        }
        
        for i in range(iterations):
            try:
                start_time = time.time()
                response = requests.post(
                    f"{self.base_url}/api/send_mt103",
                    json=test_data,
                    headers={'Content-Type': 'application/json'},
                    timeout=30
                )
                end_time = time.time()
                
                if response.status_code == 200:
                    api_time = (end_time - start_time) * 1000
                    self.results['api_calls'].append(api_time)
                    print(f"  ✅ API {i+1}: {api_time:.2f}ms")
                else:
                    print(f"  ❌ API {i+1}: خطأ {response.status_code}")
                    
            except Exception as e:
                print(f"  ❌ API {i+1}: {str(e)}")
                self.results['errors'].append(str(e))
    
    def test_concurrent_load(self, concurrent_users=10, requests_per_user=5):
        """اختبار التحميل المتزامن"""
        print(f"🔍 اختبار التحميل المتزامن ({concurrent_users} مستخدم × {requests_per_user} طلب)...")
        
        def make_request(user_id, request_id):
            try:
                start_time = time.time()
                response = requests.get(f"{self.base_url}/", timeout=10)
                end_time = time.time()
                
                if response.status_code == 200:
                    load_time = (end_time - start_time) * 1000
                    return ('success', load_time)
                else:
                    return ('error', f"HTTP {response.status_code}")
                    
            except Exception as e:
                return ('error', str(e))
        
        all_results = []
        
        with ThreadPoolExecutor(max_workers=concurrent_users) as executor:
            futures = []
            
            for user in range(concurrent_users):
                for req in range(requests_per_user):
                    future = executor.submit(make_request, user, req)
                    futures.append(future)
            
            for future in as_completed(futures):
                result = future.result()
                if result[0] == 'success':
                    all_results.append(result[1])
                else:
                    self.results['errors'].append(result[1])
        
        self.results['page_load'].extend(all_results)
        print(f"  ✅ تم إكمال {len(all_results)} طلب بنجاح")
    
    def test_health_endpoint(self):
        """اختبار نقطة فحص الصحة"""
        print("🔍 اختبار نقطة فحص الصحة...")
        
        try:
            start_time = time.time()
            response = requests.get(f"{self.base_url}/health", timeout=5)
            end_time = time.time()
            
            if response.status_code == 200:
                health_time = (end_time - start_time) * 1000
                print(f"  ✅ نقطة الصحة: {health_time:.2f}ms")
                return health_time
            else:
                print(f"  ❌ نقطة الصحة: خطأ {response.status_code}")
                return None
                
        except Exception as e:
            print(f"  ❌ نقطة الصحة: {str(e)}")
            return None
    
    def generate_report(self):
        """إنشاء تقرير الأداء"""
        print("\n" + "="*60)
        print("📊 تقرير الأداء")
        print("="*60)
        
        # إحصائيات تحميل الصفحة
        if self.results['page_load']:
            page_load_stats = {
                'count': len(self.results['page_load']),
                'min': min(self.results['page_load']),
                'max': max(self.results['page_load']),
                'mean': statistics.mean(self.results['page_load']),
                'median': statistics.median(self.results['page_load']),
                'std': statistics.stdev(self.results['page_load']) if len(self.results['page_load']) > 1 else 0
            }
            
            print(f"\n📄 تحميل الصفحة:")
            print(f"  العدد: {page_load_stats['count']}")
            print(f"  الأسرع: {page_load_stats['min']:.2f}ms")
            print(f"  الأبطأ: {page_load_stats['max']:.2f}ms")
            print(f"  المتوسط: {page_load_stats['mean']:.2f}ms")
            print(f"  الوسيط: {page_load_stats['median']:.2f}ms")
            print(f"  الانحراف المعياري: {page_load_stats['std']:.2f}ms")
        
        # إحصائيات API
        if self.results['api_calls']:
            api_stats = {
                'count': len(self.results['api_calls']),
                'min': min(self.results['api_calls']),
                'max': max(self.results['api_calls']),
                'mean': statistics.mean(self.results['api_calls']),
                'median': statistics.median(self.results['api_calls']),
                'std': statistics.stdev(self.results['api_calls']) if len(self.results['api_calls']) > 1 else 0
            }
            
            print(f"\n🔌 استدعاءات API:")
            print(f"  العدد: {api_stats['count']}")
            print(f"  الأسرع: {api_stats['min']:.2f}ms")
            print(f"  الأبطأ: {api_stats['max']:.2f}ms")
            print(f"  المتوسط: {api_stats['mean']:.2f}ms")
            print(f"  الوسيط: {api_stats['median']:.2f}ms")
            print(f"  الانحراف المعياري: {api_stats['std']:.2f}ms")
        
        # الأخطاء
        if self.results['errors']:
            print(f"\n❌ الأخطاء ({len(self.results['errors'])}):")
            for error in set(self.results['errors']):
                count = self.results['errors'].count(error)
                print(f"  {error}: {count} مرة")
        
        # تقييم الأداء
        print(f"\n🎯 تقييم الأداء:")
        
        if self.results['page_load']:
            avg_page_load = statistics.mean(self.results['page_load'])
            if avg_page_load < 500:
                print(f"  ✅ تحميل الصفحة: ممتاز ({avg_page_load:.2f}ms)")
            elif avg_page_load < 1000:
                print(f"  ⚠️  تحميل الصفحة: جيد ({avg_page_load:.2f}ms)")
            else:
                print(f"  ❌ تحميل الصفحة: بطيء ({avg_page_load:.2f}ms)")
        
        if self.results['api_calls']:
            avg_api_call = statistics.mean(self.results['api_calls'])
            if avg_api_call < 200:
                print(f"  ✅ API: ممتاز ({avg_api_call:.2f}ms)")
            elif avg_api_call < 500:
                print(f"  ⚠️  API: جيد ({avg_api_call:.2f}ms)")
            else:
                print(f"  ❌ API: بطيء ({avg_api_call:.2f}ms)")
        
        # توصيات
        print(f"\n💡 توصيات:")
        if self.results['page_load'] and statistics.mean(self.results['page_load']) > 1000:
            print("  - تحسين تحميل الصفحة باستخدام Service Worker")
            print("  - تفعيل ضغط Gzip")
            print("  - تحسين CSS/JS")
        
        if self.results['api_calls'] and statistics.mean(self.results['api_calls']) > 500:
            print("  - تحسين استعلامات قاعدة البيانات")
            print("  - إضافة Redis للتخزين المؤقت")
            print("  - تحسين خوارزميات المعالجة")
        
        if self.results['errors']:
            print("  - مراجعة سجلات الأخطاء")
            print("  - تحسين معالجة الاستثناءات")

def main():
    parser = argparse.ArgumentParser(description='اختبار أداء تطبيق MT103')
    parser.add_argument('--url', default='http://localhost:5000', help='رابط التطبيق')
    parser.add_argument('--page-loads', type=int, default=10, help='عدد اختبارات تحميل الصفحة')
    parser.add_argument('--api-calls', type=int, default=10, help='عدد اختبارات API')
    parser.add_argument('--concurrent-users', type=int, default=5, help='عدد المستخدمين المتزامنين')
    parser.add_argument('--requests-per-user', type=int, default=3, help='عدد الطلبات لكل مستخدم')
    
    args = parser.parse_args()
    
    print("🚀 بدء اختبار الأداء...")
    print(f"📍 الرابط: {args.url}")
    
    tester = PerformanceTester(args.url)
    
    # اختبار نقطة الصحة
    tester.test_health_endpoint()
    
    # اختبار تحميل الصفحة
    tester.test_page_load(args.page_loads)
    
    # اختبار API
    tester.test_api_call(args.api_calls)
    
    # اختبار التحميل المتزامن
    tester.test_concurrent_load(args.concurrent_users, args.requests_per_user)
    
    # إنشاء التقرير
    tester.generate_report()

if __name__ == "__main__":
    main()