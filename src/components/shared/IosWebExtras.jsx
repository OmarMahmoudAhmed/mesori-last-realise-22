/**
 * IosWebExtras — لمسات نسخة الويب على iPhone/iPad فقط (لا يظهر أي شيء على الأندرويد)
 *
 *  1) وهي مثبّتة على الشاشة الرئيسية (standalone): شريط الحالة شفاف (black-translucent)
 *     لتصل الواجهة لحافة الشاشة (edge-to-edge) زي نسخة الأندرويد. أيقونات شريط الحالة
 *     في هذا الوضع بيضاء دائماً، فبنرسم تدرّجاً بنياً خفيف خلفها عشان تفضل مقروءة
 *     فوق خلفية الرمل الفاتحة. الارتفاع = منطقة الأمان العلوية فقط.
 *  2) وهي مفتوحة في سفاري (غير مثبّتة): تلميح صغير قابل للإغلاق يشرح «إضافة إلى الشاشة
 *     الرئيسية». بيظهر في الصفحة الرئيسية بس، في كل مرة يفتح فيها المستخدم التطبيق
 *     (كل تحميل للصفحة)، ولو المستخدم قفله بزر «تمام» ما بيرجعش إلا لما يفتح التطبيق من جديد.
 */
import React, { useEffect, useState } from 'react';
import { isIOSWeb, isStandalone } from '../../lib/platform';
import { useApp } from '../../context/AppContext';

/* الكارت يظهر في الصفحة الرئيسية بس */
const SHOWN_PAGE = 'home';

/* مدة الانتظار قبل ما يظهر الكارت (عشان ما يبانش فجأة مع أول تحميل) */
const SHOW_DELAY_MS = 2500;

/* أيقونة «إضافة إلى الشاشة الرئيسية» (SVG Repo). الألوان بتتبع currentColor عشان تاخد لون الكارت */
function HomeAddIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path opacity="0.5" d="M2 12.2039C2 9.91549 2 8.77128 2.5192 7.82274C3.0384 6.87421 3.98695 6.28551 5.88403 5.10813L7.88403 3.86687C9.88939 2.62229 10.8921 2 12 2C13.1079 2 14.1106 2.62229 16.116 3.86687L18.116 5.10812C20.0131 6.28551 20.9616 6.87421 21.4808 7.82274C22 8.77128 22 9.91549 22 12.2039V13.725C22 17.6258 22 19.5763 20.8284 20.7881C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.7881C2 19.5763 2 17.6258 2 13.725V12.2039Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 14L12 14M12 14L9 14M12 14L12 11M12 14L12 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function IosWebExtras() {
  const { currentPage } = useApp();
  const onHome = currentPage === SHOWN_PAGE;
  const ios = isIOSWeb();
  const standalone = ios && isStandalone();
  const [armed, setArmed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [entered, setEntered] = useState(false);

  /* مؤقّت واحد لكل تحميل للتطبيق */
  useEffect(() => {
    if (!ios || standalone) return undefined;
    const t = setTimeout(() => setArmed(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [ios, standalone]);

  const showHint = armed && !dismissed && onHome;

  /* ظهور ناعم: الكارت بيتركّب الأول بشفافية صفر، وبعد فريم نرفع الشفافية */
  useEffect(() => {
    if (!showHint) {
      setEntered(false);
      return undefined;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [showHint]);

  if (!ios) return null;

  /* اختفاء ناعم قبل ما الكارت يتشال فعلاً */
  const dismiss = () => {
    setEntered(false);
    setTimeout(() => setDismissed(true), 400);
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

      {showHint && (
        <div
          role="dialog"
          aria-label="تثبيت ميسوري على الشاشة الرئيسية"
          dir="rtl"
          style={{
            position: 'fixed', left: 12, right: 12, zIndex: 9998,
            opacity: entered ? 1 : 0,
            transform: entered ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 400ms ease, transform 400ms ease',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
            /* زجاجي خفيف: خلفية نصف شفافة مع ضبابية خفيفة، والنص يفضل واضح */
            background: 'rgba(253,243,227,0.78)',
            backdropFilter: 'blur(14px) saturate(160%)',
            WebkitBackdropFilter: 'blur(14px) saturate(160%)',
            color: '#3D2B1F', border: '1px solid rgba(255,255,255,0.45)',
            borderRadius: 18, padding: '14px 16px', boxShadow: '0 8px 28px rgba(26,15,2,0.22)',
            fontFamily: "'Cairo', sans-serif", lineHeight: 1.7,
          }}
        >
          <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>ثبّت ميسوري على الآيفون</p>
          <p style={{ fontSize: 13.5 }}>
            اضغط زر التثبيت <span style={{ display: 'inline-flex', verticalAlign: 'middle', color: '#805D1B' }}><HomeAddIcon /></span>
            {' '}في أسفل أو أعلى المتصفح، ثم اختر «إضافة إلى الشاشة الرئيسية» ليفتح التطبيق بملء الشاشة.
          </p>
          <button
            type="button"
            onClick={dismiss}
            style={{
              marginTop: 10, padding: '8px 18px', minHeight: 44, borderRadius: 999, border: 0, cursor: 'pointer',
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
