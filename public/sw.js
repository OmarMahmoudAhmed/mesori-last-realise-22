/*
 * sw.js - Service Worker لميسوري (نسخة الويب فقط)
 * ===================================================
 * الغرض الوحيد: إن المتصفح يعتبر الموقع "قابل للتثبيت" (PWA)،
 * فلما المستخدم يضيفه للشاشة الرئيسية يفتح من غير شريط المتصفح.
 *
 * ملاحظة: مفيش كاش هنا عمداً، كل طلب بيروح للسيرفر مباشرة،
 * عشان أي تحديث للموقع يظهر فوراً ومايتعلقش بنسخة قديمة.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request));
});
