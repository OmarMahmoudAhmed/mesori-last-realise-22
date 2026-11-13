# نسخة iOS الويب — `ios.mesori.app`

## المبدأ
نفس الكود المصدري لتطبيق الأندرويد، منشور كموقع ويب منفصل على Cloudflare Pages تحت `ios.mesori.app`. كل التغييرات مقيّدة بـ iOS والويب، فنسخة Play ما تتأثرش إلا لما تبني AAB جديد.

## الملفات في مستودع `mesori-last-realise-22` (ضعها فوق نفس المسارات)
**تُستبدل:** `index.html` · `public/manifest.webmanifest` · `src/App.jsx` · `src/lib/sounds.js` · `src/lib/googleAuth.js` · `src/pages/ProfilePage.jsx` · `src/pages/LoginPage.jsx` · `src/context/AppContext.jsx` · `src/data/levels.js` · `src/components/home/LevelCard.jsx` · `src/components/auth/GoldenButton.jsx` · `src/components/shared/BadgeIcon.jsx`
**جديدة:** `src/lib/assetUrl.js` · `src/lib/platform.js` · `src/components/shared/IosWebExtras.jsx` · `public/_redirects` · `public/_headers` · `public/assets/icons/*.png` · `public/assets/splash/*.png`

**احذف:** `public/dashboard.html` (لوحة تحليلات داخلية). مش مستخدمة في الكود، ومتنشرش على موقع عام. استخدم `git rm public/dashboard.html`.

## إعداد مشروع Cloudflare Pages
| الإعداد | القيمة |
|---|---|
| Repository | `mesori-last-realise-22` |
| Production branch | الفرع اللي فيه التعديلات |
| Build command | `npm ci && npm run build` |
| Build output directory | `dist` |
| متغير بيئة `NODE_VERSION` | `22` |
| Custom domain | `ios.mesori.app` |

**متغيرات البيئة** (لازم تتضاف قبل أول build، وبعد أي تغيير فيها اعمل redeploy):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_WEB_CLIENT_ID`
- `VITE_DEVELOPER_PORTFOLIO_URL` = `https://mesori.app/developer-portfolio/`

القيم بتتدمج في الكود وقت البناء، فلو غيّرتها لازم redeploy.

`public/_redirects` بيوجّه كل المسارات لـ `index.html`، و`public/_headers` بيضيف نفس الهيدرز اللي كانت في `vercel.json`.

## إعدادات خارج Cloudflare
**Supabase** ← Authentication ← URL Configuration ← Redirect URLs: أضف `https://ios.mesori.app/**`. من غيرها الرجوع من تسجيل الدخول بجوجل والبريد هيترفض.

**Google Cloud Console:** المطلوب في **Authorized redirect URIs** هو رابط callback بتاع Supabase (`https://<project-ref>.supabase.co/auth/v1/callback`). مش محتاج تضيف دومين `ios.mesori.app` في Authorized JavaScript origins. لو الرابط موجود أصلاً مفيش حاجة تتغير.

## ملاحظات على الميزات
| الميزة | على iPhone | الحالة |
|---|---|---|
| Edge-to-edge | `viewport-fit=cover` + شريط حالة شفاف + `env(safe-area-inset-*)` + تدرّج علوي | يحتاج تأكيد على جهاز حقيقي |
| الأيقونة وشاشة البداية | `apple-touch-icon` + أيقونات manifest + 11 صورة startup | يعمل على iPhone، مش iPad |
| ملء الشاشة | `apple-mobile-web-app-capable` + manifest `standalone` | يعمل بعد الإضافة للشاشة الرئيسية |
| الرجوع بالسحب من الحافة | حارس تاريخ + `popstate` | يحتاج تجربة بعد تسجيل الدخول |
| الأصوات | Web Audio API مع التحكم في المستوى | يعمل. مفتاح الصامت بيكتم الصوت |
| البريد وكلمة المرور | ويب خالص | يعمل |
| الدخول بجوجل | OAuth عن طريق Supabase | يحتاج Redirect URL وتجربة على جهاز حقيقي. داخل التطبيق المثبّت iOS بيعزل التخزين عن Safari، فالبريد هو البديل المضمون |
| التحديات 1 ضد 1 | WebSocket عبر Supabase | تصل الدعوات والتطبيق مفتوح بس |
| الإعلانات | الكود بيتخطاها على الويب | غير متاحة |
| إشعارات التذكير | Local Notifications أصلية بس | غير متاحة (تحتاج Web Push) |
| العمل بدون إنترنت | لا يوجد Service Worker | غير مدعوم |

## اختبار على iPhone حقيقي قبل الاعتماد
1. الأيقونة وشاشة البداية وشريط الحالة والـ notch.
2. الدخول بجوجل داخل التطبيق المثبّت.
3. الرجوع بالسحب من الحافة بعد الدخول.
4. الأصوات، مع التأكد إن الآيفون مش على الوضع الصامت.
5. لوحة المفاتيح عند الكتابة.
