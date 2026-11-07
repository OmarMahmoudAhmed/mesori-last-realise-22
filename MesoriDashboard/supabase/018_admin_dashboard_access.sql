-- ============================================================
-- 018: وصول قراءة فقط للأدمن (لتطبيق Mesori Dashboard)
-- لا يعطي أي صلاحية كتابة، ولا يفتح الجداول للمستخدمين العاديين.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
-- ملاحظة: مفيش policy لـ admin_users للـ clients، والقراءة بتتم عن طريق الدالة دي بس.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- policies قراءة إضافية للأدمن (بتتجمع مع policies المستخدم العادي بـ OR)
DROP POLICY IF EXISTS "Admins read profiles" ON public.profiles;
CREATE POLICY "Admins read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins read progress" ON public.user_progress;
CREATE POLICY "Admins read progress" ON public.user_progress
  FOR SELECT TO authenticated USING (public.is_admin());

-- stages و levels عامة للقراءة أصلاً (Public read) فمحتاجتش policy جديدة.

-- بعد تنفيذ الملف: إضافة حساب الأدمن تلقائياً للإيميل المطلوب:
INSERT INTO public.admin_users (user_id)
SELECT id FROM auth.users WHERE email = 'omar.mahmoud.ahmed.01@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
