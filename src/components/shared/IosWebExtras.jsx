/**
 * IosWebExtras — لمسات نسخة الويب على iPhone/iPad فقط (لا يظهر أي شيء على الأندرويد)
 *
 *  1) وهي مثبّتة على الشاشة الرئيسية (standalone): شريط الحالة شفاف (black-translucent)
 *     لتصل الواجهة لحافة الشاشة (edge-to-edge) زي نسخة الأندرويد. أيقونات شريط الحالة
 *     في هذا الوضع بيضاء دائماً، فبنرسم تدرّجاً بنياً خفيفاً خلفها عشان تفضل مقروءة
 *     فوق خلفية الرمل الفاتحة. الارتفاع = منطقة الأمان العلوية فقط.
 *  2) وهي مفتوحة في سفاري (غير مثبّتة): تلميح صغير قابل للإغلاق يشرح «إضافة إلى الشاشة
 *     الرئيسية». لو أُغلق ما بيظهرش تاني لمدة 14 يوم.
 */
import React, { useEffect, useState } from 'react';
import { isIOSWeb, isStandalone } from '../../lib/platform';
import { useApp } from '../../context/AppContext';

/* صفحات الامتحان: الكارت ما يظهرش فوقها عشان ما يغطيش زر المتابعة */
const HIDDEN_PAGES = ['quiz', 'vs-match'];

const DISMISS_KEY = 'mesori_ios_hint_dismissed_at';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

function recentlyDismissed() {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(t) && t > 0 && Date.now() - t < SNOOZE_MS;
  } catch {
    return false;
  }
}

function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}

export default function IosWebExtras() {
  const { currentPage } = useApp();
  const hiddenHere = HIDDEN_PAGES.includes(currentPage);
  const ios = isIOSWeb();
  const standalone = ios && isStandalone();
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!ios || standalone || recentlyDismissed()) return undefined;
    const t = setTimeout(() => setShowHint(true), 2500);
    return () => clearTimeout(t);
  }, [ios, standalone]);

  if (!ios) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* التخزين غير متاح */ }
    setShowHint(false);
  };

  return (
    <>
      {standalone && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, pointerEvents: 'none', zIndex: 9999,
            height: 'calc(env(safe-area-inset-top, 0px) + 6px)',
            background: 'linear-gradient(to bottom, rgba(26,15,2,0.78), rgba(26,15,2,0))',
          }}
        />
      )}

      {showHint && !hiddenHere && (
        <div
          role="dialog"
          aria-label="تثبيت ميسوري على الشاشة الرئيسية"
          dir="rtl"
          style={{
            position: 'fixed', left: 12, right: 12, zIndex: 9998,
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
            background: '#FDF3E3', color: '#3D2B1F', border: '1px solid rgba(128,93,27,0.45)',
            borderRadius: 18, padding: '14px 16px', boxShadow: '0 12px 32px rgba(26,15,2,0.35)',
            fontFamily: "'Cairo', sans-serif", lineHeight: 1.7,
          }}
        >
          <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>ثبّت ميسوري على الآيفون</p>
          <p style={{ fontSize: 13.5 }}>
            اضغط زر المشاركة <span style={{ display: 'inline-flex', verticalAlign: 'middle', color: '#805D1B' }}><ShareIcon /></span>
            {' '}في أسفل أو أعلى المتصفح، ثم اختر «إضافة إلى الشاشة الرئيسية» ليفتح التطبيق بملء الشاشة.
          </p>
          <button
            type="button"
            onClick={dismiss}
            style={{
              marginTop: 10, padding: '8px 18px', borderRadius: 999, border: 0, cursor: 'pointer',
              background: 'linear-gradient(to bottom,#D4AA45,#C8922A)', color: '#1A0F02',
              fontWeight: 800, fontSize: 14, fontFamily: 'inherit',
            }}
          >
            تمام
          </button>
        </div>
      )}
    </>
  );
}
