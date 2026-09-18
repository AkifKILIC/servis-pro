import React, { useState } from 'react';
import { 
  Wrench, 
  Monitor, 
  Smartphone, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  ArrowRight,
  Lock,
  Radio,
  UserCheck
} from 'lucide-react';
import { AuthUser, UserRole, saveAuthSession } from '../utils/auth';
import { initAudioContext, playNotificationSound } from '../utils/notifications';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser) => void;
  shopName: string;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, shopName }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('technician');
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = (roleToLogin: UserRole = selectedRole) => {
    setIsSubmitting(true);
    
    // Web Audio kilidini kullanıcı dokunuşuyla aç (iPhone zil çalabilmesi için)
    initAudioContext();
    if (roleToLogin === 'technician') {
      try {
        playNotificationSound();
      } catch {}
    }

    const authUser: AuthUser = {
      role: roleToLogin,
      name: roleToLogin === 'technician' ? 'Saha Ustası' : 'Ofis Sekreteri',
      loggedInAt: new Date().toISOString(),
    };

    // 1 yıl boyunca hatırla (Cookies & LocalStorage)
    saveAuthSession(authUser, rememberMe);

    setTimeout(() => {
      onLoginSuccess(authUser);
    }, 400);
  };

  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '24px 16px',
        background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #090d16 60%, #030712 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Arka plan parlak efektleri */}
      <div 
        style={{ 
          position: 'absolute', 
          width: '350px', 
          height: '350px', 
          borderRadius: '50%', 
          background: 'rgba(99, 102, 241, 0.12)', 
          filter: 'blur(80px)', 
          top: '-50px', 
          left: '10%' 
        }} 
      />
      <div 
        style={{ 
          position: 'absolute', 
          width: '300px', 
          height: '300px', 
          borderRadius: '50%', 
          background: 'rgba(244, 63, 94, 0.1)', 
          filter: 'blur(90px)', 
          bottom: '0', 
          right: '10%' 
        }} 
      />

      <div 
        style={{ 
          maxWidth: '460px', 
          width: '100%', 
          position: 'relative', 
          zIndex: 10 
        }}
      >
        {/* Logo & Başlık */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
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
              marginBottom: '16px',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <Wrench size={34} color="#ffffff" />
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#ffffff', marginBottom: '6px' }}>
            ServisPro
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
            {shopName || 'Beyaz Eşya Teknik Servis Yönetimi'}
          </p>
        </div>

        {/* Ana Giriş Kartı */}
        <div 
          className="card" 
          style={{ 
            background: 'rgba(15, 23, 42, 0.85)', 
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
              Hızlı Giriş Yapın
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
              Telefondan 1 kez girdiğinizde <strong>1 yıl boyunca</strong> tekrar şifre sormaz.
            </p>
          </div>

          {/* 1. SEÇENEK: SAHA USTASI GİRİŞİ (VURGULANMIŞ) */}
          <div 
            onClick={() => {
              setSelectedRole('technician');
            }}
            style={{ 
              borderRadius: '16px',
              padding: '16px',
              cursor: 'pointer',
              marginBottom: '14px',
              transition: 'all 0.2s ease',
              background: selectedRole === 'technician' 
                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(59, 130, 246, 0.12) 100%)' 
                : 'rgba(30, 41, 59, 0.4)',
              border: selectedRole === 'technician' 
                ? '2px solid #6366f1' 
                : '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: selectedRole === 'technician' ? '0 8px 24px rgba(99, 102, 241, 0.25)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div 
                style={{ 
                  width: '44px', 
                  height: '44px', 
                  borderRadius: '12px', 
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#fff' 
                }}
              >
                <Smartphone size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong style={{ fontSize: '0.96rem', color: '#f8fafc' }}>Saha Ustası (Tek Usta)</strong>
                  <span style={{ fontSize: '0.68rem', background: '#10b981', color: '#fff', padding: '2px 6px', borderRadius: '8px', fontWeight: 700 }}>
                    iPhone / Mobil
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '2px 0 0' }}>
                  İş emirleri, müşteri adresi, navigasyon & anlık zil
                </p>
              </div>
            </div>

            <div 
              style={{ 
                width: '22px', 
                height: '22px', 
                borderRadius: '50%', 
                border: selectedRole === 'technician' ? '6px solid #6366f1' : '2px solid #64748b',
                background: '#fff' 
              }} 
            />
          </div>

          {/* 2. SEÇENEK: OFİS / YÖNETİM GİRİŞİ */}
          <div 
            onClick={() => {
              setSelectedRole('office');
            }}
            style={{ 
              borderRadius: '16px',
              padding: '16px',
              cursor: 'pointer',
              marginBottom: '20px',
              transition: 'all 0.2s ease',
              background: selectedRole === 'office' 
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(5, 150, 105, 0.1) 100%)' 
                : 'rgba(30, 41, 59, 0.4)',
              border: selectedRole === 'office' 
                ? '2px solid #10b981' 
                : '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: selectedRole === 'office' ? '0 8px 24px rgba(16, 185, 129, 0.2)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div 
                style={{ 
                  width: '44px', 
                  height: '44px', 
                  borderRadius: '12px', 
                  background: 'linear-gradient(135deg, #10b981, #059669)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#fff' 
                }}
              >
                <Monitor size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong style={{ fontSize: '0.96rem', color: '#f8fafc' }}>Ofis / Masaüstü Yönetim</strong>
                  <span style={{ fontSize: '0.68rem', background: '#3b82f6', color: '#fff', padding: '2px 6px', borderRadius: '8px', fontWeight: 700 }}>
                    PC / Bilgisayar
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '2px 0 0' }}>
                  Telefon kayıtları, parça stoğu, kasa ve fiş yazdırma
                </p>
              </div>
            </div>

            <div 
              style={{ 
                width: '22px', 
                height: '22px', 
                borderRadius: '50%', 
                border: selectedRole === 'office' ? '6px solid #10b981' : '2px solid #64748b',
                background: '#fff' 
              }} 
            />
          </div>

          {/* Beni Hatırla (Cookies) Kutusu */}
          <label 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              marginBottom: '22px', 
              cursor: 'pointer',
              fontSize: '0.84rem',
              color: '#cbd5e1',
              userSelect: 'none',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <input 
              type="checkbox" 
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#6366f1', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} color="#10b981" />
              <span><strong>Beni Hatırla:</strong> Bu cihazda 1 yıl boyunca oturumu açık tut (Cookies)</span>
            </div>
          </label>

          {/* Giriş Butonu */}
          <button 
            type="button"
            className="btn btn-primary"
            style={{ 
              width: '100%', 
              padding: '14px', 
              fontSize: '1rem', 
              fontWeight: 700, 
              background: selectedRole === 'technician' 
                ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' 
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              boxShadow: selectedRole === 'technician'
                ? '0 8px 24px rgba(99, 102, 241, 0.4)'
                : '0 8px 24px rgba(16, 185, 129, 0.35)',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
            onClick={() => handleLogin()}
            disabled={isSubmitting}
          >
            {selectedRole === 'technician' ? (
              <>
                <Smartphone size={20} />
                <span>{isSubmitting ? 'Usta Ekranı Açılıyor...' : 'Usta Olarak Giriş Yap'}</span>
                <ArrowRight size={18} />
              </>
            ) : (
              <>
                <Monitor size={20} />
                <span>{isSubmitting ? 'Ofis Açılıyor...' : 'Ofis Sistemi Olarak Giriş Yap'}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>

        {/* Bilgilendirme Alt Notu */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.78rem', color: '#64748b' }}>
          <p>
            💡 Usta iPhone'dan bir kere giriş yaptığında çerez (cookie) kaydedilir ve her açılışta doğrudan iş ekranına bağlanır.
          </p>
        </div>
      </div>
    </div>
  );
};
