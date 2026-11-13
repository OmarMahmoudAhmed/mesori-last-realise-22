/**
 * assetUrl — يحوّل مسار أصل من public/ لمسار صحيح حسب مكان النشر.
 *
 *  - Android (Capacitor) وبناء الجذر: BASE_URL = "/"  → "/assets/..."  (بدون أي تغيير)
 *  - نسخة iOS على mesori.app/ios/:  BASE_URL = "/ios/" → "/ios/assets/..."
 */
export const asset = (path) => import.meta.env.BASE_URL + String(path).replace(/^\/+/, '');
