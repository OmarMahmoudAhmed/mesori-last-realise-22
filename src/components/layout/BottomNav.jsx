/*
 * =====================================================
 * BottomNav.jsx - شريط تنقل سفلي (أيقونات فقط)
 * =====================================================
 *
 * - خلفية رملية شفافة تندمج مع الصفحة بدون حد علوي.
 * - مؤشر أبيض منزلق بين الأيقونات بحركة سلسة.
 * - الخفوت: بعد 3 ثوانٍ بدون لمس أو تمرير يخفت الشريط إلى 35%،
 *   ويعود للوضوح الكامل فوراً عند أي تفاعل.
 * - صفحة الاختبار مستثناة من الخفوت حتى لا يتشتت المستخدم.
 * - يحترم إعداد "تقليل الحركة" في الجهاز.
 */

import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';

const IDLE_MS = 3000;
const DIMMED_OPACITY = 0.35;
const NO_DIM_PAGES = ['quiz'];

const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function BottomNav({ activePage = 'home' }) {
  const { navigateTo } = useApp();
  const [dimmed, setDimmed] = useState(false);

  /* مؤقت الخفوت: يُعاد ضبطه مع كل تفاعل، ويُعاد أيضاً عند تغيير الصفحة */
  useEffect(() => {
    let timer;
    const wake = () => {
      setDimmed(false);
      clearTimeout(timer);
      timer = setTimeout(() => setDimmed(true), IDLE_MS);
    };
    const events = ['pointerdown', 'touchstart', 'scroll', 'keydown'];

    wake();
    events.forEach((e) => window.addEventListener(e, wake, { passive: true, capture: true }));

    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, wake, true));
    };
  }, [activePage]);

  const navItems = [
    { id: 'profile', page: 'profile', iconClass: 'fi fi-rr-info', label: 'معلوماتي' },
    { id: 'home', page: 'home', iconClass: 'fi fi-rr-home', label: 'الرئيسية' },
    { id: 'leaderboard', page: 'leaderboard', iconClass: 'fi fi-rr-leaderboard', label: 'المتصدرين' },
  ];

  const activeIndex = Math.max(0, navItems.findIndex((item) => item.id === activePage));
  const shouldDim = dimmed && !NO_DIM_PAGES.includes(activePage);

  return (
    <nav
      dir="ltr"
      className="fixed bottom-0 z-50 w-full max-w-md md:max-w-none"
      style={{
        left: '50%',
        transform: 'translateX(-50%)',
        /* تدرّج رملي ناعم يندمج مع الصفحة من الأسفل، بدون حد صلب */
        background: 'linear-gradient(to top, rgba(244, 226, 188, 0.78) 0%, rgba(244, 226, 188, 0.45) 45%, rgba(244, 226, 188, 0) 100%)',
        opacity: shouldDim ? DIMMED_OPACITY : 1,
        transition: reduceMotion ? 'none' : 'opacity 500ms ease',
      }}
    >
      <div
        className="relative grid grid-cols-3 px-4 pt-2 pb-[56px]"
        style={{ paddingBottom: 'calc(0.5rem + max(env(safe-area-inset-bottom, 0px), var(--safe-area-inset-bottom, 0px), 48px))' }}
      >
        {/* المؤشر المنزلق: عرضه عمود واحد، ويتحرك بمقدار index * 100% */}
        <span
          aria-hidden="true"
          className="absolute top-2 left-4 h-14 flex items-center justify-center pointer-events-none"
          style={{
            width: 'calc((100% - 2rem) / 3)',
            transform: `translateX(${activeIndex * 100}%)`,
            transition: reduceMotion ? 'none' : 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <span
            className="w-14 h-14 rounded-full"
            style={{
              background: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(62, 39, 35, 0.14)',
            }}
          />
        </span>

        {navItems.map((item) => {
          const isActive = activePage === item.id;

          return (
            <div key={item.id} className="flex items-center justify-center">
              <button
                onClick={() => navigateTo(item.page)}
                className="relative z-10 flex items-center justify-center press-effect no-tap-highlight w-14 h-14"
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <i
                  className={item.iconClass}
                  aria-hidden="true"
                  style={{
                    fontSize: '24px',
                    color: isActive ? '#A87B23' : '#938261',
                    transition: reduceMotion
                      ? 'none'
                      : 'color 320ms ease, transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
                    transform: isActive ? 'scale(1.08)' : 'scale(1)',
                  }}
                />
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;
