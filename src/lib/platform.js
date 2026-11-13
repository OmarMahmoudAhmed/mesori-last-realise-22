/**
 * platform — كشف المنصة لنسخة الويب على iPhone/iPad
 *
 * نسخة الويب (PWA) هي البديل لأجهزة iOS لأن التطبيق غير منشور على App Store.
 * الدوال هنا آمنة على الأندرويد (Capacitor) وعلى المتصفحات العادية.
 */
import { Capacitor } from '@capacitor/core';

/** داخل تطبيق Capacitor الأصلي (Android)؟ */
export const isNative = () => Capacitor.isNativePlatform();

/** جهاز iOS/iPadOS (iPad الحديث بيعرّف نفسه كـ Mac لكن عنده شاشة لمس) */
export const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

/** مفتوح كتطبيق مثبّت على الشاشة الرئيسية (بدون شريط سفاري)؟ */
export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.navigator.standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches === true);

/** نسخة الويب على iPhone/iPad (مش التطبيق الأصلي) */
export const isIOSWeb = () => !isNative() && isIOS();
