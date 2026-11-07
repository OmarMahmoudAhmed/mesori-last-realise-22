# Mesori Dashboard (Android / Kotlin)

داشبورد منفصل لمتابعة سلوك المستخدمين من Supabase، بيتبني كـ APK وينفتح على الموبايل.

## 1) تجهيز قاعدة البيانات (مرة واحدة)
1. Supabase Dashboard > Authentication > Users > Add user: اعمل حساب الأدمن (إيميل + باسورد، Auto Confirm).
2. نفّذ `supabase/018_admin_dashboard_access.sql` في SQL Editor.
3. نفّذ السطر الأخير في الملف (INSERT) بإيميلك.

## 2) المفتاح العام
Supabase > Project Settings > API Keys > انسخ الـ publishable key (أو anon key).
ضيفه في `~/.gradle/gradle.properties` (مش في الـ repo):

    SUPABASE_ANON_KEY=sb_publishable_xxxxx

المفتاح ده عام بطبيعته؛ الأمان الحقيقي من RLS وتسجيل دخول الأدمن. **ماتحطش service_role key في التطبيق أبداً.**

## 3) بناء الـ APK
- افتح مجلد `MesoriDashboard` في Android Studio (هيعمل Sync وينزّل Gradle تلقائياً).
- Build > Build Bundle(s) / APK(s) > Build APK(s).
- الملف هيكون في: `app/build/outputs/apk/debug/app-debug.apk`
- انقله للموبايل وثبّته (لازم تسمح بالتثبيت من مصادر غير Play).

## 4) الاستخدام
- اتصل بالحساب مرة، والـ refresh token بيتخزن مشفّر، فبعدها بيفتح على طول.
- تبويب "القمع": كام شخص وصل لكل مرحلة ونسبة اللي وقفوا.
- تبويب "المستخدمين": المرتّبين حسب الإكمال، ومكان توقفهم.
- تبويب "المتوقفين": اللي بدأوا ومرجعوش من 7 أيام.

## ملاحظات على البيانات
- `user_progress` بيسجّل المراحل المكتملة فقط. مش بيسجّل الإجابات ولا الوقت داخل المرحلة.
- `quiz_answers` موجود في الـ DB بس الـ app مابيكتبش فيه حالياً (0 صفوف). ده المفروض يتعمل في نسخة قادمة عشان تقدر تحلل الأسئلة الصعبة ووقت الإجابة.
- استبعد حسابات التست من `MainActivity.kt` (excludeUsernames).
