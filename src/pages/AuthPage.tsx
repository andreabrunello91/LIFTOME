import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

type Screen = 'splash' | 'login' | 'register' | 'otp';
type RegStep = 1 | 2 | 3;
type LoginTab = 'email' | 'phone';

interface AuthPageProps {
  onAuthenticated: () => void;
}

export default function AuthPage({ onAuthenticated }: AuthPageProps) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [screen, setScreen] = useState<Screen>('splash');
  const [loginTab, setLoginTab] = useState<LoginTab>('email');
  const [regStep, setRegStep]   = useState<RegStep>(1);
  const [role, setRole]         = useState<'both' | 'helper'>('both');
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');

  // Form state
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]       = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone]     = useState('');
  const [address, setAddress] = useState('');
  const [otp, setOtp]         = useState(['','','','','','']);

  async function handleLogin() {
    setLoading(true); setError('');
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) { setError('Email o password errata'); return; }
    onAuthenticated();
  }

  async function handleRegister() {
    if (regStep < 3) { setRegStep((regStep + 1) as RegStep); return; }
    setLoading(true); setError('');
    const { error } = await signUp(email, password, {
      name, surname, role,
      initials: `${name[0] ?? ''}${surname[0] ?? ''}`.toUpperCase(),
      radius_km: 2,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onAuthenticated();
  }

  async function handleGoogle() {
    setLoading(true);
    await signInWithGoogle();
    setLoading(false);
  }

  // OTP input handling
  function handleOtp(idx: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[idx] = val; setOtp(next);
    if (val && idx < 5) {
      document.getElementById(`otp-${idx + 1}`)?.focus();
    }
  }

  /* ── SPLASH ───────────────────────────────────────────────────── */
  if (screen === 'splash') return (
    <div className="min-h-screen flex flex-col bg-[--dark] px-6 py-12" style={{ paddingTop: 'calc(48px + var(--safe-top))' }}>
      {/* Logo */}
      <div className="flex flex-col items-center gap-2 mb-auto animate-fade-up">
        <div className="w-16 h-16 bg-[--or] rounded-[20px] flex items-center justify-center text-white text-2xl font-black shadow-[var(--shadow-or)]">
          Li
        </div>
        <h1 className="text-[28px] font-black text-white tracking-tight">
          Lift<span className="text-[--or]">ome</span>
        </h1>
        <p className="text-[15px] text-white/50 text-center leading-relaxed">
          Il tuo vicino ti aiuta<br/>in soli 10 minuti
        </p>
      </div>

      {/* Categories pills */}
      <div className="flex flex-wrap gap-2 justify-center my-8 animate-fade-up delay-100">
        {['🛒 Spesa','🐕 Cane','📦 Consegne','🏠 Traslochi','👶 Babysitting','⏳ Code'].map(c => (
          <span key={c} className="px-3 py-1.5 rounded-full text-[13px] font-semibold text-white/70 border border-white/10 bg-white/5">
            {c}
          </span>
        ))}
      </div>

      {/* Promise */}
      <div className="flex items-center justify-center gap-2 mb-8 animate-fade-up delay-200">
        <div className="px-4 py-2 rounded-full border border-[--or]/30 bg-[--or]/15 text-[13px] font-bold text-[--or-light]">
          ⚡ Aiuto garantito entro 10 minuti
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3 animate-fade-up delay-300" style={{ paddingBottom: 'calc(24px + var(--safe-bottom))' }}>
        <Button size="lg" fullWidth onClick={() => setScreen('register')}>Inizia gratis</Button>
        <Button size="lg" variant="secondary" fullWidth
          className="!bg-white/10 !text-white !border-white/15"
          onClick={() => setScreen('login')}>
          Ho già un account
        </Button>
        <p className="text-center text-[11px] text-white/25 leading-relaxed">
          Registrandoti accetti i{' '}
          <span className="text-white/40 underline">Termini di servizio</span>{' '}
          e la{' '}
          <span className="text-white/40 underline">Privacy Policy</span>
        </p>
      </div>
    </div>
  );

  /* ── LOGIN ────────────────────────────────────────────────────── */
  if (screen === 'login') return (
    <div className="min-h-screen bg-white flex flex-col" style={{ paddingTop: 'var(--safe-top)' }}>
      <div className="px-5 pt-12 pb-5">
        <button className="flex items-center gap-1.5 text-[14px] text-[--muted] bg-transparent border-none cursor-pointer mb-6"
          onClick={() => setScreen('splash')}>
          ← Indietro
        </button>
        <h1 className="text-[26px] font-black text-[--dark] tracking-tight mb-1.5">Bentornato 👋</h1>
        <p className="text-[14px] text-[--muted]">Accedi al tuo account Liftome</p>
      </div>

      <div className="px-5 flex-1">
        {/* Tab */}
        <div className="flex bg-[--bg] rounded-[12px] p-1 mb-5">
          {(['email','phone'] as LoginTab[]).map(t => (
            <button key={t}
              className={cn('flex-1 py-2.5 rounded-[9px] text-[14px] font-semibold border-none cursor-pointer transition-all',
                loginTab === t ? 'bg-white text-[--dark] shadow-sm' : 'bg-transparent text-[--muted]')}
              onClick={() => setLoginTab(t)}>
              {t === 'email' ? 'Email' : 'Telefono'}
            </button>
          ))}
        </div>

        {loginTab === 'email' ? (
          <div className="flex flex-col gap-4">
            <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="tua@email.it" />
            <InputField label="Password" type={showPw ? 'text' : 'password'} value={password} onChange={setPassword}
              placeholder="••••••••"
              right={<button onClick={() => setShowPw(v => !v)} className="text-[--muted] text-sm bg-transparent border-none cursor-pointer">{showPw ? '🙈' : '👁'}</button>} />
            <button className="text-right text-[13px] font-bold text-[--or] bg-transparent border-none cursor-pointer -mt-2 self-end">
              Password dimenticata?
            </button>
          </div>
        ) : (
          <InputField label="Numero di telefono" type="tel" value={phone} onChange={setPhone} placeholder="+39 333 000 0000" />
        )}

        {error && <p className="text-[13px] text-[--red] mt-3">{error}</p>}

        <Button size="lg" fullWidth loading={loading} onClick={handleLogin} className="mt-5">Accedi</Button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-[--bd]" />
          <span className="text-[12px] text-[--muted] font-medium">oppure</span>
          <div className="flex-1 h-px bg-[--bd]" />
        </div>

        <button className="w-full py-3 flex items-center justify-center gap-2.5 border border-[--bd] rounded-[12px] text-[14px] font-semibold text-[--dark] bg-white cursor-pointer active:bg-[--bg]"
          onClick={handleGoogle}>
          <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#4285F4] via-[#EA4335] to-[#34A853] flex-shrink-0" />
          Continua con Google
        </button>

        <p className="text-center text-[14px] text-[--muted] mt-6">
          Nuovo su Liftome?{' '}
          <button className="text-[--or] font-bold bg-transparent border-none cursor-pointer" onClick={() => setScreen('register')}>
            Registrati
          </button>
        </p>
      </div>
    </div>
  );

  /* ── REGISTER ─────────────────────────────────────────────────── */
  if (screen === 'register') return (
    <div className="min-h-screen bg-white flex flex-col" style={{ paddingTop: 'var(--safe-top)' }}>
      <div className="px-5 pt-12 pb-4">
        <button className="flex items-center gap-1.5 text-[14px] text-[--muted] bg-transparent border-none cursor-pointer mb-5"
          onClick={() => regStep === 1 ? setScreen('splash') : setRegStep((regStep - 1) as RegStep)}>
          ← Indietro
        </button>

        {/* Progress dots */}
        <div className="flex items-center gap-2 mb-5">
          {[1,2,3].map(i => (
            <div key={i} className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: i === regStep ? 24 : 6, background: i <= regStep ? 'var(--or)' : 'var(--bd)' }} />
          ))}
        </div>

        <h1 className="text-[26px] font-black text-[--dark] tracking-tight mb-1">
          {regStep === 1 ? 'Crea il tuo account' : regStep === 2 ? 'Quasi ci sei!' : 'Verifica il telefono'}
        </h1>
        <p className="text-[14px] text-[--muted]">
          {regStep === 1 ? 'Inizia a ricevere o offrire aiuto' : regStep === 2 ? 'Aggiungi gli ultimi dettagli' : 'Codice inviato via SMS'}
        </p>
      </div>

      <div className="px-5 flex-1 flex flex-col">
        {regStep === 1 && (
          <div className="flex flex-col gap-4">
            {/* Role picker */}
            <div>
              <label className="block text-[12px] font-semibold text-[--muted] uppercase tracking-wide mb-2">Sei qui per…</label>
              <div className="grid grid-cols-2 gap-2">
                {([['both','🤝','Entrambi','Chiedi e offri aiuto'],['helper','💪','Helper','Guadagna aiutando']] as const).map(([r, emoji, label, sub]) => (
                  <div key={r}
                    className={cn('border-2 rounded-[14px] p-3.5 cursor-pointer transition-all flex items-center gap-2.5', role === r ? 'border-[--or] bg-[--or-bg]' : 'border-[--bd] bg-[--bg]')}
                    onClick={() => setRole(r)}>
                    <span className="text-2xl">{emoji}</span>
                    <div>
                      <div className="text-[13px] font-bold text-[--dark]">{label}</div>
                      <div className="text-[11px] text-[--muted]">{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <InputField label="Nome" value={name} onChange={setName} placeholder="Mario" />
              <InputField label="Cognome" value={surname} onChange={setSurname} placeholder="Rossi" />
            </div>
            <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="tua@email.it" />
          </div>
        )}

        {regStep === 2 && (
          <div className="flex flex-col gap-4">
            <InputField label="Numero di telefono" type="tel" value={phone} onChange={setPhone} placeholder="+39 333 000 0000" />
            <InputField label="Password" type={showPw ? 'text' : 'password'} value={password} onChange={setPassword}
              placeholder="Min. 8 caratteri"
              right={<button onClick={() => setShowPw(v => !v)} className="text-[--muted] text-sm bg-transparent border-none cursor-pointer">{showPw ? '🙈' : '👁'}</button>} />
            <InputField label="Indirizzo (zona)" value={address} onChange={setAddress} placeholder="Via Roma, Milano" />
            <div className="flex items-center gap-2 p-3 bg-[--green-bg] rounded-[12px]">
              <span className="text-[--green] text-base">🛡</span>
              <p className="text-[12px] text-[--green-dark] leading-snug">
                Il tuo indirizzo esatto non viene mai condiviso.
              </p>
            </div>
          </div>
        )}

        {regStep === 3 && (
          <div className="flex flex-col items-center">
            <p className="text-[14px] text-[--muted] leading-relaxed mb-6 text-center">
              Abbiamo inviato un codice a 6 cifre al tuo numero. Inseriscilo qui sotto.
            </p>
            <div className="flex gap-2.5 mb-4">
              {otp.map((v, i) => (
                <input key={i} id={`otp-${i}`}
                  className="w-12 h-14 text-center text-xl font-bold border-2 rounded-[12px] outline-none transition-colors"
                  style={{ borderColor: v ? 'var(--or)' : 'var(--bd)', background: v ? 'var(--or-bg)' : 'var(--bg)', color: 'var(--dark)' }}
                  maxLength={1} inputMode="numeric" value={v}
                  onChange={e => handleOtp(i, e.target.value)}
                  onKeyDown={e => e.key === 'Backspace' && !v && i > 0 && document.getElementById(`otp-${i-1}`)?.focus()} />
              ))}
            </div>
            <p className="text-[13px] text-[--muted] mb-1">Codice valido per <strong>04:59</strong></p>
            <button className="text-[13px] font-bold text-[--or] bg-transparent border-none cursor-pointer">Non hai ricevuto il codice? Reinvia</button>
          </div>
        )}

        {error && <p className="text-[13px] text-[--red] mt-3">{error}</p>}

        <div className="mt-auto pb-8 pt-6">
          <Button size="lg" fullWidth loading={loading} onClick={handleRegister}>
            {regStep < 3 ? 'Continua' : 'Verifica e accedi'}
          </Button>
          <p className="text-center text-[14px] text-[--muted] mt-4">
            Hai già un account?{' '}
            <button className="text-[--or] font-bold bg-transparent border-none cursor-pointer" onClick={() => setScreen('login')}>
              Accedi
            </button>
          </p>
        </div>
      </div>
    </div>
  );

  return null;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

interface InputFieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  right?: React.ReactNode;
}

function InputField({ label, type = 'text', value, onChange, placeholder, right }: InputFieldProps) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-[--muted] uppercase tracking-wide mb-2">{label}</label>
      <div className="relative">
        <input
          type={type} value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          className="w-full px-4 py-3.5 rounded-[12px] border border-[--bd] bg-[--bg] text-[15px] font-semibold text-[--dark] outline-none transition-colors placeholder:text-[#C0BDB6] placeholder:font-normal"
          style={{ paddingRight: right ? 44 : undefined }}
          onFocus={e => e.target.style.borderColor = 'var(--or)'}
          onBlur={e  => e.target.style.borderColor = 'var(--bd)'}
        />
        {right && <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
    </div>
  );
}
