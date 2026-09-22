import React, { useState } from 'react';
import { 
  Wrench, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';
import { AuthUser, verifyAdminCredentials, saveAuthSession } from '../utils/auth';
import { initAudioContext, playNotificationSound } from '../utils/notifications';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser) => void;
  shopName: string;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, shopName }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Lütfen kullanıcı adı ve şifrenizi giriniz.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const user = await verifyAdminCredentials(username, password);
      if (user) {
        // iOS Web Audio kilidini ilk kullanıcı dokunuşunda aç
        initAudioContext();
        try {
          playNotificationSound();
        } catch {}

        // Oturumu kaydet (Cookie & LocalStorage)
        saveAuthSession(user, rememberMe);

        setTimeout(() => {
          onLoginSuccess(user);
        }, 300);
      } else {
        setIsSubmitting(false);
        setError('Hatalı kullanıcı adı veya şifre! Lütfen bilgilerinizi kontrol ediniz.');
      }
    } catch {
      setIsSubmitting(false);
      setError('Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyiniz.');
    }
  };

  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '20px 16px',
        background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0b0f19 55%, #030712 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Arka plan ışık küreleri */}
      <div 
        style={{ 
          position: 'absolute', 
          width: '380px', 
          height: '380px', 
          borderRadius: '50%', 
          background: 'rgba(99, 102, 241, 0.15)', 
          filter: 'blur(90px)', 
          top: '-80px', 
          left: '5%' 
        }} 
      />
      <div 
        style={{ 
          position: 'absolute', 
          width: '320px', 
          height: '320px', 
          borderRadius: '50%', 
          background: 'rgba(16, 185, 129, 0.12)', 
          filter: 'blur(90px)', 
          bottom: '-60px', 
          right: '5%' 
        }} 
      />

      <div 
        style={{ 
          maxWidth: '440px', 
          width: '100%', 
          position: 'relative', 
          zIndex: 10 
        }}
      >
        {/* Logo & Üst Başlık */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div 
            style={{ 
              width: '68px', 
              height: '68px', 
              borderRadius: '20px', 
              background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)', 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 12px 30px rgba(99, 102, 241, 0.35)',
              marginBottom: '14px',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <Wrench size={34} color="#ffffff" />
          </div>

          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#ffffff', margin: '0 0 6px 0' }}>
            ServisPro
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0, fontWeight: 500 }}>
            {shopName || 'İzmirim Teknik Servis Yönetimi'}
          </p>
        </div>

        {/* Ana Giriş Kartı */}
        <div 
          className="card" 
          style={{ 
            background: 'rgba(15, 23, 42, 0.88)', 
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            padding: '26px 22px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '4px 12px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700, marginBottom: '8px' }}>
              <ShieldCheck size={14} />
              <span>GÜVENLİ YÖNETİCİ GİRİŞİ</span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 4px 0' }}>
              Sisteme Giriş Yapın
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
              Devam etmek için yetkili kullanıcı adı ve şifrenizi giriniz.
            </p>
          </div>

          {/* Hata Bildirimi */}
          {error && (
            <div 
              style={{ 
                background: 'rgba(239, 68, 68, 0.15)', 
                border: '1px solid rgba(239, 68, 68, 0.35)', 
                borderRadius: '12px', 
                padding: '12px 14px', 
                fontSize: '0.86rem', 
                color: '#fca5a5', 
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, color: '#ef4444' }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Kullanıcı Adı */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.84rem', fontWeight: 600, color: '#cbd5e1' }}>
                Kullanıcı Adı
              </label>
              <div style={{ position: 'relative' }}>
                <div 
                  style={{ 
                    position: 'absolute', 
                    left: '14px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: '#64748b',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <User size={18} />
                </div>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ 
                    height: '48px', 
                    paddingLeft: '44px', 
                    fontSize: '1rem', 
                    borderRadius: '12px',
                    background: 'rgba(30, 41, 59, 0.6)',
                    borderColor: 'rgba(255, 255, 255, 0.12)',
                    color: '#f8fafc'
                  }}
                  placeholder="örn: admin"
                  value={username}
                  onChange={e => {
                    setUsername(e.target.value);
                    if (error) setError('');
                  }}
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                />
              </div>
            </div>

            {/* Şifre */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.84rem', fontWeight: 600, color: '#cbd5e1' }}>
                Şifre
              </label>
              <div style={{ position: 'relative' }}>
                <div 
                  style={{ 
                    position: 'absolute', 
                    left: '14px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: '#64748b',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Lock size={18} />
                </div>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="form-control" 
                  style={{ 
                    height: '48px', 
                    paddingLeft: '44px', 
                    paddingRight: '44px',
                    fontSize: '1rem', 
                    borderRadius: '12px',
                    background: 'rgba(30, 41, 59, 0.6)',
                    borderColor: 'rgba(255, 255, 255, 0.12)',
                    color: '#f8fafc'
                  }}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Beni Hatırla */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.84rem', color: '#cbd5e1', userSelect: 'none' }}>
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#6366f1', cursor: 'pointer' }}
                />
                <span>Beni bu cihazda hatırla (1 yıl)</span>
              </label>
            </div>

            {/* Giriş Yap Butonu */}
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="btn btn-primary" 
              style={{ 
                width: '100%', 
                height: '50px', 
                fontSize: '1.02rem', 
                fontWeight: 800, 
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '6px'
              }}
            >
              {isSubmitting ? (
                <span>Giriş Yapılıyor...</span>
              ) : (
                <>
                  <span>Giriş Yap</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: '18px', textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '14px' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              🔒 Güvenli uçtan uca şifreli oturum
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
