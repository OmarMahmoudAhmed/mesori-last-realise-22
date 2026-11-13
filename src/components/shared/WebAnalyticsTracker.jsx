/*
 * WebAnalyticsTracker — بيشغّل تتبّع جلسات الويب لأي مستخدم مسجّل.
 * مكوّن مالوش شكل، ومعطّل تماماً على Capacitor (راجع webAnalytics.js).
 */
import { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { startWebSession, summarizeProgress } from '../../lib/webAnalytics';

export default function WebAnalyticsTracker() {
  const { session, currentPage, levelsData } = useApp();
  const userId = session?.user?.id;

  // نخلي القيم الأحدث في ref عشان الجلسة ما تتقطعش مع كل تغيير صفحة
  const stateRef = useRef({ page: null, progress: { furthestLevel: 0, furthestStage: 0, completed: 0 } });
  useEffect(() => {
    stateRef.current = { page: currentPage, progress: summarizeProgress(levelsData) };
  }, [currentPage, levelsData]);

  useEffect(() => {
    return startWebSession({ userId, getState: () => stateRef.current });
  }, [userId]);

  return null;
}
