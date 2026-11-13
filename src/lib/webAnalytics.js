/*
 * =====================================================
 * webAnalytics.js — تتبّع جلسات نسخة الويب فقط
 * =====================================================
 * بيسجّل: نوع الجهاز العام (iPhone / iPad / Android / ديسكتوب)،
 * مدة النشاط الفعلي (بس لما الصفحة تكون ظاهرة)، أعلى مرحلة وصلها،
 * وعدد المراحل المكتملة. بيتكتب في schema منفصل (analytics) عن طريق
 * دالة track_web_session (migration 018).
 *
 * - مش بيشتغل على Capacitor (الأندرويد) خالص.
 * - مش بيستخدم cookies ولا localStorage ولا أي إذن من المتصفح.
 * - مش بيخزّن User-Agent كامل، بس تصنيف عام للجهاز.
 * =====================================================
 */
import { supabase } from './supabaseClient';
import { isNative } from './platform';

const HEARTBEAT_MS = 30_000;
const MAX_DELTA_SECONDS = 60; // أي فترة أطول من كده (تابّ خامل/نوم الجهاز) مش بتتحسب

export function detectDeviceClass() {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (/iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ipad';
  if (/iPhone|iPod/.test(ua)) return 'iphone';
  if (/Android/.test(ua)) return 'android';
  if (/Mobile/.test(ua)) return 'mobile_other';
  return 'desktop';
}

function newSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/* أعلى مرحلة مكتملة (بترتيب المستويات) + عدد المراحل المكتملة */
export function summarizeProgress(levels = []) {
  let furthestLevel = 0;
  let furthestStage = 0;
  let completed = 0;
  for (const level of levels) {
    for (const stage of level.stages || []) {
      if (stage.isCompleted) {
        completed += 1;
        furthestLevel = level.id;
        furthestStage = stage.id;
      }
    }
  }
  return { furthestLevel, furthestStage, completed };
}

/*
 * يبدأ جلسة تتبّع لمستخدم مسجّل. بيرجع دالة تنظيف بتوقف التتبّع
 * وبتبعت آخر نبضة. getState بيرجع { page, progress } بأحدث القيم.
 */
export function startWebSession({ userId, getState }) {
  if (isNative() || !userId) return () => {};

  const sessionId = newSessionId();
  const deviceClass = detectDeviceClass();
  let visible = typeof document === 'undefined' || document.visibilityState === 'visible';
  let lastTick = Date.now();
  let pendingSeconds = 0;

  const accumulate = () => {
    const now = Date.now();
    if (visible) pendingSeconds += Math.min((now - lastTick) / 1000, MAX_DELTA_SECONDS);
    lastTick = now;
  };

  const flush = () => {
    const seconds = Math.round(pendingSeconds);
    pendingSeconds = 0;
    const { page, progress } = getState();
    supabase.rpc('track_web_session', {
      p_session: sessionId,
      p_device: deviceClass,
      p_active_seconds: seconds,
      p_furthest_level: progress.furthestLevel,
      p_furthest_stage: progress.furthestStage,
      p_completed_stages: progress.completed,
      p_page: page || null,
    }).then(({ error }) => {
      if (error && import.meta.env?.DEV) console.debug('web analytics:', error.message);
    });
  };

  const onVisibility = () => {
    accumulate();
    visible = document.visibilityState === 'visible';
    flush();
  };

  // أول نبضة بتسجّل بداية الجلسة حتى لو المستخدم قفل بسرعة
  flush();
  const interval = setInterval(() => {
    accumulate();
    flush();
  }, HEARTBEAT_MS);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    clearInterval(interval);
    document.removeEventListener('visibilitychange', onVisibility);
    accumulate();
    flush();
  };
}
