import { asset } from './assetUrl';
/*
 * =====================================================
 * sounds.js - نظام تأثيرات صوتية خفيف للتطبيق
 * =====================================================
 * أصوات أساسية بس — بدون أي مكتبة خارجية، Audio API العادية في
 * المتصفح كفاية لتأثيرات بهذا الحجم، وشغالة كمان جوه Capacitor
 * WebView من غير أي plugin إضافي.
 *
 * بيحترم مفتاح الصوت الموجود بالفعل في الإعدادات (isSoundOn من
 * AppContext) — مسجّل عبر setSoundEnabled() من App.jsx.
 *
 * لو ملف صوت لسه مش موجود في public/sounds/، بيتجاهل بهدوء تماماً
 * (من غير أي error يظهر للمستخدم) — ده متعمّد عشان تقدر تضيف
 * الملفات واحد واحد من غير ما حاجة تتكسر لحد ما تخلص كلهم.
 *
 * الدليل الكامل لأسماء الملفات المطلوبة ومواصفاتها: SOUND_GUIDE.md
 * (في جذر المشروع) — ده الملف الوحيد اللي المفروض تحتاج تتعامل معاه.
 * =====================================================
 */

const SOUND_FILES = {
  click:   asset('/sounds/Click.mp3'),
  correct: asset('/sounds/Correct.mp3'),
  wrong:   asset('/sounds/Wrong.mp3'),
  win:     asset('/sounds/Win.mp3'),
  loss:    asset('/sounds/Loss.mp3'),
  draw:    asset('/sounds/Draw.mp3'),
};

// مستويات صوت افتراضية — النقرة أخفت لأنها بتتكرر كتير، لحظات
// النتيجة (فوز/خسارة/تعادل) أعلى شوية لأنها نادرة ومهمة
const VOLUME = {
  click:   0.35,
  correct: 0.5,
  wrong:   0.5,
  win:     0.6,
  loss:    0.55,
  draw:    0.55,
};

import { isIOS, isNative } from './platform';

let soundEnabled = true;

/* بينادى عليها App.jsx كل ما isSoundOn يتغيّر من الإعدادات */
export function setSoundEnabled(enabled) {
  soundEnabled = enabled;
}

/*
 * iPhone/iPad (نسخة الويب): Safari بيتجاهل audio.volume (الصوت دايماً 100%)، فالنقرة
 * اللي مفروض تكون 35% بتطلع عالية. الحل: Web Audio API مع GainNode، وبنفك تشفير الملفات
 * مسبقاً عشان التشغيل يبقى فوري. السياق بيتفعّل عند أول لمسة (شرط iOS).
 * على الأندرويد (Capacitor) والمتصفحات الأخرى: نفس السلوك القديم بدون أي تغيير.
 */
const useWebAudio = () =>
  !isNative() && isIOS() && typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);

let audioCtx = null;
const buffers = {};
const loading = {};

function getCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
  }
  return audioCtx;
}

function loadBuffer(key) {
  if (buffers[key]) return Promise.resolve(buffers[key]);
  if (loading[key]) return loading[key];
  loading[key] = fetch(SOUND_FILES[key])
    .then((r) => { if (!r.ok) throw new Error('missing'); return r.arrayBuffer(); })
    .then((ab) => new Promise((res, rej) => getCtx().decodeAudioData(ab, res, rej)))
    .then((b) => { buffers[key] = b; return b; })
    .catch(() => { loading[key] = null; return null; }); // ملف ناقص/فشل: نتجاهل بهدوء
  return loading[key];
}

const UNLOCK_EVENTS = ['touchend', 'pointerdown', 'click', 'keydown'];
function unlock() {
  try {
    const c = getCtx();
    if (c.state === 'suspended') c.resume();
    Object.keys(SOUND_FILES).forEach((k) => { void loadBuffer(k); });
    if (c.state === 'running') UNLOCK_EVENTS.forEach((e) => window.removeEventListener(e, unlock));
  } catch { /* تجاهل */ }
}
if (useWebAudio()) UNLOCK_EVENTS.forEach((e) => window.addEventListener(e, unlock, { passive: true }));

function playWebAudio(key) {
  try {
    const c = getCtx();
    if (c.state === 'suspended') c.resume();
    const buf = buffers[key];
    if (!buf) { void loadBuffer(key); return; }
    const src = c.createBufferSource();
    src.buffer = buf;
    const gain = c.createGain();
    gain.gain.value = VOLUME[key] ?? 0.5;
    src.connect(gain);
    gain.connect(c.destination);
    src.start(0);
  } catch { /* تجاهل بهدوء */ }
}

// تحميل مسبق (cache) — عنصر Audio واحد لكل صوت، بيتعمله clone عند
// كل تشغيل عشان يسمح بتشغيل متكرر/متداخل (زي نقرات سريعة متتالية)
// من غير ما صوت يقطع اللي قبله
const cache = {};

function getBaseAudio(key) {
  if (!cache[key]) {
    const audio = new Audio(SOUND_FILES[key]);
    audio.preload = 'auto';
    cache[key] = audio;
  }
  return cache[key];
}

export function playSound(key) {
  if (!soundEnabled) return;
  if (!SOUND_FILES[key]) return;

  if (useWebAudio()) {
    playWebAudio(key);
    return;
  }

  try {
    const node = getBaseAudio(key).cloneNode();
    node.volume = VOLUME[key] ?? 0.5;
    node.play().catch(() => {
      /* تجاهل بهدوء: الملف لسه مش مضاف، أو المتصفح رفض التشغيل
         التلقائي قبل أول تفاعل حقيقي من المستخدم — الحالتين طبيعيتين */
    });
  } catch {
    /* تجاهل بهدوء لأي سبب تاني غير متوقع */
  }
}
