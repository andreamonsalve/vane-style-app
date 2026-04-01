import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/src/components/ui/Button';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

type AuthMode = 'welcome' | 'login' | 'signup';

export const Login = () => {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<AuthMode>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message === 'Invalid login credentials' 
            ? 'Email o contraseña incorrectos' 
            : error.message);
        } else {
          navigate('/');
        }
      } else if (mode === 'signup') {
        if (!fullName.trim()) {
          setError('Ingresa tu nombre completo');
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, fullName);
        if (error) {
          setError(error.message);
        } else {
          setSuccessMessage('¡Cuenta creada! Revisa tu email para confirmar.');
        }
      }
    } catch (err) {
      setError('Error inesperado. Intenta de nuevo.');
    }

    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setError('');
    const { error } = await signInWithGoogle();
    if (error) setError(error.message);
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Hero Image */}
      <section className="relative h-[45vh] min-h-[300px] overflow-hidden">
        <img
          src="/images/registro-banner.png"
          alt="Login Banner Vane Style"
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-white" />

      </section>

      {/* Auth Section */}
      <section className="flex-1 px-6 pt-6 pb-8 flex flex-col">
        <AnimatePresence mode="wait">
          {mode === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <h2 className="font-display text-[28px] font-light text-black leading-tight">
                  Viste con<br />propósito.
                </h2>
                <p className="font-sans text-[13px] text-dark-gray leading-relaxed max-w-[280px]">
                  Tu asesora de imagen personal. Diagnóstico con IA, closet inteligente, outfits con lo que ya tienes.
                </p>
              </div>

              <div className="space-y-3 mt-8">
                <Button fullWidth onClick={() => setMode('signup')}>
                  CREAR CUENTA
                </Button>
                <Button fullWidth variant="secondary" onClick={() => setMode('login')}>
                  INICIAR SESIÓN
                </Button>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-light-gray" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-4 font-sans text-[11px] text-mid-gray tracking-[0.1em] uppercase">
                      O CONTINÚA CON
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 py-3 border border-light-gray hover:border-black transition-colors duration-200"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="font-sans text-[11px] text-charcoal tracking-[0.1em] uppercase">
                    Google
                  </span>
                </button>
              </div>
            </motion.div>
          )}

          {(mode === 'login' || mode === 'signup') && (
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col"
            >
              {/* Back button */}
              <button
                onClick={() => { setMode('welcome'); setError(''); setSuccessMessage(''); }}
                className="flex items-center gap-2 mb-6 text-charcoal"
              >
                <ArrowLeft size={16} strokeWidth={1.5} />
                <span className="font-sans text-[11px] tracking-[0.1em] uppercase">Volver</span>
              </button>

              <h2 className="font-display text-[28px] font-light text-black leading-tight mb-6">
                {mode === 'login' ? 'Bienvenida\nde vuelta.' : 'Crea tu\ncuenta.'}
              </h2>

              <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  {mode === 'signup' && (
                    <div>
                      <label className="overline-text text-dark-gray block mb-2">
                        NOMBRE COMPLETO
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full border-b border-light-gray py-3 font-sans text-[14px] text-black focus:border-black focus:outline-none transition-colors bg-transparent"
                        placeholder="María García"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="overline-text text-dark-gray block mb-2">
                      EMAIL
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border-b border-light-gray py-3 font-sans text-[14px] text-black focus:border-black focus:outline-none transition-colors bg-transparent"
                      placeholder="tu@email.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="overline-text text-dark-gray block mb-2">
                      CONTRASEÑA
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border-b border-light-gray py-3 font-sans text-[14px] text-black focus:border-black focus:outline-none transition-colors bg-transparent pr-10"
                        placeholder="Mínimo 6 caracteres"
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-mid-gray hover:text-black transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                      </button>
                    </div>
                  </div>

                  {/* Error message */}
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="font-sans text-[12px] text-error"
                    >
                      {error}
                    </motion.p>
                  )}

                  {/* Success message */}
                  {successMessage && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="font-sans text-[12px] text-success"
                    >
                      {successMessage}
                    </motion.p>
                  )}
                </div>

                <div className="space-y-4 mt-8">
                  <Button fullWidth type="submit" disabled={loading}>
                    {loading 
                      ? 'PROCESANDO...' 
                      : mode === 'login' ? 'INICIAR SESIÓN' : 'CREAR CUENTA'
                    }
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setMode(mode === 'login' ? 'signup' : 'login');
                        setError('');
                        setSuccessMessage('');
                      }}
                      className="font-sans text-[11px] text-mid-gray tracking-[0.1em] uppercase underline underline-offset-4"
                    >
                      {mode === 'login' ? '¿NO TIENES CUENTA? REGÍSTRATE' : '¿YA TIENES CUENTA? INICIA SESIÓN'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
};
