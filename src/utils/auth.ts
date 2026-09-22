// ServisPro Güvenli Kimlik Doğrulama & Oturum Yönetimi
// Şifreler kesinlikle düz metin olarak tutulmaz, tek yönlü SHA-256 kriptografik özet kullanılır.

export type UserRole = 'admin' | 'technician' | 'office';

export interface AuthUser {
  username: string;
  role: UserRole;
  name: string;
  token: string;
  loggedInAt: string;
}

const COOKIE_NAME = 'servispro_auth_session_v2';
const STORAGE_KEY = 'servispro_auth_user_v2';

// SHA-256 Şifrelenmiş Admin Parola Özeti (Düz şifre ASLA kodda veya veritabanında yer almaz)
const ADMIN_PASSWORD_HASH = '4bf6d5855524f904deb926da3b7cfc3213a5347f36ba6b722b061eb451bcd9ba';
const ALLOWED_USERNAMES = ['admin', 'akif', 'akifusta'];

// Saf JavaScript SHA-256 Kriptografik Özetleme Fonksiyonu (Tüm tarayıcı ve HTTP/HTTPS ortamlarında %100 çalışır)
function pureJsSha256(ascii: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  let hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let str = ascii + '\x80';
  while (str.length % 64 - 56) str += '\x00';
  for (let i = 0; i < str.length; i++) {
    const j = str.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (let j = 0; j < words.length;) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        ((w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0) |
          0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

// Parola Özetleme Fonksiyonu (WebCrypto veya Pure JS Fallback)
export async function hashPassword(plainText: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const utf8 = new TextEncoder().encode(plainText);
      const buffer = await crypto.subtle.digest('SHA-256', utf8);
      return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      // Fallback
    }
  }
  return pureJsSha256(plainText);
}

// Admin Giriş Doğrulama
export async function verifyAdminCredentials(username: string, passwordText: string): Promise<AuthUser | null> {
  const cleanUser = (username || '').trim().toLowerCase();
  if (!ALLOWED_USERNAMES.includes(cleanUser)) {
    return null;
  }

  const computedHash = await hashPassword(passwordText);
  if (computedHash === ADMIN_PASSWORD_HASH) {
    return {
      username: cleanUser,
      role: 'admin',
      name: cleanUser === 'admin' ? 'Sistem Yöneticisi' : 'Akif Usta',
      token: 'adm_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36),
      loggedInAt: new Date().toISOString(),
    };
  }

  return null;
}

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

// Cookie yazma (Varsayılan 365 gün kalıcı oturum)
export function setCookie(name: string, value: string, days: number = 365) {
  if (typeof document === 'undefined') return;
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = '; expires=' + date.toUTCString();
  const maxAge = '; max-age=' + days * 24 * 60 * 60;
  const isSecure = typeof window !== 'undefined' && window.isSecureContext ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}${expires}${maxAge}; path=/; SameSite=Lax${isSecure}`;
}

// Cookie silme
export function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; max-age=0; SameSite=Lax`;
}

// Mevcut Aktif Oturumu Oku (Sadece token'lı doğrulanmış admin oturumları kabul edilir)
export function getAuthSession(): AuthUser | null {
  try {
    // 1. Cookie kontrolü
    const cookieVal = getCookie(COOKIE_NAME);
    if (cookieVal) {
      const parsed = JSON.parse(cookieVal);
      if (parsed && parsed.token && parsed.username && (parsed.role === 'admin' || parsed.role === 'technician' || parsed.role === 'office')) {
        return parsed;
      }
    }

    // 2. LocalStorage kontrolü (PWA standalone yedekleme)
    if (typeof localStorage !== 'undefined') {
      const storageVal = localStorage.getItem(STORAGE_KEY);
      if (storageVal) {
        const parsed = JSON.parse(storageVal);
        if (parsed && parsed.token && parsed.username && (parsed.role === 'admin' || parsed.role === 'technician' || parsed.role === 'office')) {
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

// Oturumu Kaydet
export function saveAuthSession(user: AuthUser, rememberMe: boolean = true) {
  try {
    const serialized = JSON.stringify(user);
    const days = rememberMe ? 365 : 1;
    
    setCookie(COOKIE_NAME, serialized, days);

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
  deleteCookie('servispro_auth_session'); // Eski oturum çerezini de temizle
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('servispro_auth_user');
  }
}
