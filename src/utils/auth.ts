// Kullanıcı Giriş & Cookie Yönetimi (iPhone ve PC için Kalıcı Oturum)

export type UserRole = 'technician' | 'office';

export interface AuthUser {
  role: UserRole;
  name: string;
  loggedInAt: string;
}

const COOKIE_NAME = 'servispro_auth_session';
const STORAGE_KEY = 'servispro_auth_user';

// Cookie okuma
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      try {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      } catch {
        return c.substring(nameEQ.length, c.length);
      }
    }
  }
  return null;
}

// Cookie yazma (365 gün kalıcı - 1 yıl boyunca tekrar sormaz)
export function setCookie(name: string, value: string, days: number = 365) {
  if (typeof document === 'undefined') return;
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = '; expires=' + date.toUTCString();
  const maxAge = '; max-age=' + (days * 24 * 60 * 60);
  // SameSite=Lax ve secure desteği
  const isSecure = typeof window !== 'undefined' && window.isSecureContext ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}${expires}${maxAge}; path=/${isSecure}; SameSite=Lax`;
}

// Cookie silme
export function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; max-age=0; SameSite=Lax`;
}

// Mevcut Aktif Oturumu Oku (Önce Cookie, sonra PWA fallback LocalStorage)
export function getAuthSession(): AuthUser | null {
  try {
    // 1. Cookie kontrolü
    const cookieVal = getCookie(COOKIE_NAME);
    if (cookieVal) {
      const parsed = JSON.parse(cookieVal);
      if (parsed && parsed.role) {
        return parsed;
      }
    }

    // 2. LocalStorage kontrolü (iOS PWA standalone yedekleme)
    if (typeof localStorage !== 'undefined') {
      const storageVal = localStorage.getItem(STORAGE_KEY);
      if (storageVal) {
        const parsed = JSON.parse(storageVal);
        if (parsed && parsed.role) {
          // Cookie kaybolduysa cookie'yi geri tazele
          setCookie(COOKIE_NAME, storageVal, 365);
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('Oturum bilgisi okunamadı:', e);
  }
  return null;
}

// Oturumu Kaydet (Usta veya Ofis)
export function saveAuthSession(user: AuthUser, rememberMe: boolean = true) {
  try {
    const serialized = JSON.stringify(user);
    const days = rememberMe ? 365 : 1; // 1 yıl kalıcı
    
    // Cookie yaz
    setCookie(COOKIE_NAME, serialized, days);

    // iOS PWA kapanıp açılsa bile hatırlaması için LocalStorage'a da yaz
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, serialized);
    }
  } catch (e) {
    console.error('Oturum kaydedilemedi:', e);
  }
}

// Oturumu Kapat (Çıkış Yap)
export function clearAuthSession() {
  deleteCookie(COOKIE_NAME);
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}
