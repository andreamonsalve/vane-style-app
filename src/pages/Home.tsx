import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { Button } from '@/src/components/ui/Button';
import { PopupModal } from 'react-calendly';
import { useDiagnosisStore } from '@/src/lib/diagnosisStore';
import { supabase } from '@/src/lib/supabaseClient';
import { Sparkles, ShoppingBag, Layers, MessageCircle, Lock, Loader2 } from 'lucide-react';

// ─── Constantes ────────────────────────────────────────────────────────────────

const MONTHLY_SESSION_LIMIT = 3;

const SERVICES = [
  {
    id: 1,
    name: 'ESENCIA PERSONAL',
    price: 'CLP 700.000',
    description: 'Nuestra asesoría más completa. Descubre tu identidad visual profunda y alinéala con tus objetivos de vida.',
    image: '/images/esencia-personal-banner.png',
    calendlyUrl: 'https://calendly.com/vane-style/esencia-personal',
  },
  {
    id: 2,
    name: "MIX & MATCH 90'",
    price: 'CLP 400.000',
    description: 'Sesión intensiva para crear 20+ outfits con lo que ya tienes. Optimiza tu closet al máximo.',
    image: '/images/mix&match-banner.png',
    calendlyUrl: 'https://calendly.com/vane-style/mix-match',
  },
  {
    id: 3,
    name: 'RENOVACIÓN INTEGRAL',
    price: 'CLP 1.000.000',
    description: 'Cambio total de imagen, closet detox y personal shopping guiado por Vane.',
    image: '/images/renovacion-integral-banner.png',
    calendlyUrl: 'https://calendly.com/vane-style/renovacion',
  },
];

const DAILY_TIPS = [
  'Los colores que usas comunican. Descubre tu paleta y elige qué decir sin hablar.',
  'Un accesorio bien elegido puede transformar completamente un outfit básico.',
  'Viste para quien quieres ser, no solo para quien eres hoy.',
  'La coherencia entre tu imagen interior y exterior genera confianza real.',
  'Invertir en pocas prendas versátiles vence a tener muchas que no combinan.',
  'Tu color de temporada es tu aliado más poderoso. Úsalo cerca del rostro.',
  'La ropa que te hace sentir poderosa es la que mejor te queda.',
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const getTimeGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'BUENOS DÍAS';
  if (h < 19) return 'BUENAS TARDES';
  return 'BUENAS NOCHES';
};

const normalizeShape = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const getClosetSignedUrl = async (imageUrl: string): Promise<string> => {
  let path = imageUrl;
  const pub = '/storage/v1/object/public/closet-items/';
  const sig = '/storage/v1/object/sign/closet-items/';
  if (imageUrl.includes(pub)) path = imageUrl.split(pub)[1];
  else if (imageUrl.includes(sig)) path = imageUrl.split(sig)[1].split('?')[0];
  const { data } = await supabase.storage.from('closet-items').createSignedUrl(path, 3600);
  return data?.signedUrl || imageUrl;
};

// ─── Componentes auxiliares ────────────────────────────────────────────────────

/** Ilustración SVG minimalista del tipo de rostro */
const FaceShapeIllustration: React.FC<{ shape: string }> = ({ shape }) => {
  const n = normalizeShape(shape);

  const paths: Record<string, React.ReactNode> = {
    ovalado:    <ellipse cx="40" cy="46" rx="26" ry="36" />,
    oblongo:    <ellipse cx="40" cy="46" rx="20" ry="38" />,
    rectangular:<ellipse cx="40" cy="46" rx="20" ry="38" />,
    redondo:    <circle  cx="40" cy="46" r="30" />,
    cuadrado:   <path d="M14 16 L66 16 L70 24 L70 70 L66 78 L14 78 L10 70 L10 24 Z" />,
    corazon:    <path d="M40 74 C28 60 10 48 10 30 C10 16 20 10 30 12 C35 13 38 16 40 20 C42 16 45 13 50 12 C60 10 70 16 70 30 C70 48 52 60 40 74 Z" />,
    diamante:   <path d="M40 10 L66 40 L50 76 L30 76 L14 40 Z" />,
    triangulo:  <path d="M40 14 L62 22 L68 68 L12 68 L18 22 Z" />,
  };

  // fallback: ovalado
  const el = Object.entries(paths).find(([key]) => n.includes(key))?.[1] ?? paths.ovalado;

  return (
    <svg
      viewBox="0 0 80 90"
      className="w-14 h-16 mx-auto text-black"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {el}
    </svg>
  );
};

/** Cards de servicios compactas (usadas dentro del home) */
const ServiceCards: React.FC<{ onBook: (url: string) => void }> = ({ onBook }) => (
  <div className="space-y-3">
    {SERVICES.map((s, i) => (
      <motion.div
        key={s.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: i * 0.07 }}
        className="bg-off-white border border-light-gray overflow-hidden"
      >
        <div className="aspect-video overflow-hidden bg-light-gray">
          <img
            src={s.image}
            alt={s.name}
            className="w-full h-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <h3 className="overline-text text-[10px] text-black tracking-[0.15em]">{s.name}</h3>
            <p className="font-sans text-[11px] text-mid-gray">{s.price}</p>
            <p className="font-sans text-[12px] text-dark-gray leading-relaxed">{s.description}</p>
          </div>
          <Button fullWidth onClick={() => onBook(s.calendlyUrl)}>
            AGENDAR SESIÓN
          </Button>
        </div>
      </motion.div>
    ))}
  </div>
);

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface ClosetPreviewItem {
  id: string;
  name: string;
  category: string;
  image_url: string;
}

// ─── Componente principal ──────────────────────────────────────────────────────

export const Home = () => {
  const navigate  = useNavigate();
  const { user, loading } = useAuth();
  const { faceDiagnosis, colorDiagnosis, isPremium } = useDiagnosisStore();

  const [isOpen,      setIsOpen]      = useState(false);
  const [activeUrl,   setActiveUrl]   = useState('');
  const [rootElement, setRootElement] = useState<HTMLElement | null>(null);

  const [emotionalSessionsUsed, setEmotionalSessionsUsed] = useState(0);
  const [closetItems,  setClosetItems]  = useState<ClosetPreviewItem[]>([]);
  const [closetLoading, setClosetLoading] = useState(false);

  useEffect(() => {
    setRootElement(document.getElementById('root') || document.body);
  }, []);

  // Cuota mensual de sesiones emocionales (solo free)
  useEffect(() => {
    if (!user || isPremium) return;
    const load = async () => {
      try {
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { count } = await supabase
          .from('chat_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', monthStart);
        setEmotionalSessionsUsed(count ?? 0);
      } catch { /* silently fail */ }
    };
    load();
  }, [user, isPremium]);

  // Preview del closet: primeras 4 prendas
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setClosetLoading(true);
      try {
        const { data } = await supabase
          .from('closet_items')
          .select('id, name, category, image_url')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(4);

        if (!data || data.length === 0) return;

        const withUrls = await Promise.all(
          data.map(async (item) => ({
            ...item,
            image_url: await getClosetSignedUrl(item.image_url),
          }))
        );
        setClosetItems(withUrls);
      } catch { /* silently fail */ } finally {
        setClosetLoading(false);
      }
    };
    load();
  }, [user]);

  const openCalendly = (url: string) => { setActiveUrl(url); setIsOpen(true); };

  // ── Calculos compartidos ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" role="status" aria-label="Cargando">
        <div className="space-y-3 text-center">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" aria-hidden="true" />
          <p className="overline-text text-mid-gray">CARGANDO</p>
        </div>
      </div>
    );
  }

  // ── LANDING (sin sesión) ────────────────────────────────────────────────────
  if (!user) {
    return (
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex-1 w-full relative flex flex-col items-center justify-center overflow-hidden px-6"
      >
        <img src="/images/home-banner.png" alt="" role="presentation"
          className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

        <div
          className="relative z-10 flex flex-col items-center text-center space-y-10 w-full max-w-sm mt-12"
        >
          <img src="/images/logo_vane_hero.svg" alt="Vane Style" className="w-full max-w-[320px] h-auto mb-4" />
          <div className="space-y-4">
            <h1 className="font-display text-[28px] font-light text-white leading-tight">Viste con propósito.</h1>
            <p className="font-sans text-[13px] text-white/90 leading-relaxed max-w-[280px] mx-auto">
              Tu asesora de imagen personal. Diagnóstico con IA, closet inteligente, outfits con lo que ya tienes.
            </p>
          </div>
          <div className="w-full space-y-4 pt-4">
            <Button fullWidth onClick={() => navigate('/onboarding')} className="bg-white text-black hover:bg-light-gray">
              COMENZAR GRATIS
            </Button>
            <button
              onClick={() => navigate('/login')}
              className="btn border border-white/30 text-white w-full hover:bg-white/10 uppercase tracking-[0.1em]"
            >
              YA TENGO CUENTA
            </button>
          </div>
        </div>
      </motion.main>
    );
  }

  // ── Datos comunes para vistas autenticadas ──────────────────────────────────
  const diagnosisProgress = (faceDiagnosis ? 1 : 0) + (colorDiagnosis ? 1 : 0);
  const firstName  = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'tú';
  const greeting   = getTimeGreeting();
  const dailyTip   = DAILY_TIPS[new Date().getDay() % DAILY_TIPS.length];
  const quotaExhausted = emotionalSessionsUsed >= MONTHLY_SESSION_LIMIT;

  const getPersonalizedTip = () => {
    if (faceDiagnosis && colorDiagnosis)
      return `Como ${colorDiagnosis.season}, los tonos de tu paleta realzan tu presencia natural. Para tu rostro ${faceDiagnosis.faceType}, úsalos cerca del rostro para máximo impacto.`;
    if (faceDiagnosis)
      return `Para tu rostro ${faceDiagnosis.faceType}: los accesorios que equilibran tus proporciones potencian cualquier outfit.`;
    if (colorDiagnosis)
      return `Como ${colorDiagnosis.season}: los colores de tu paleta comunican tu esencia. Úsalos en las prendas más cercanas al rostro.`;
    return dailyTip;
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // ESTADO 1 — NUEVA USUARIA (sin diagnóstico)
  // ══════════════════════════════════════════════════════════════════════════════
  if (diagnosisProgress === 0) {
    return (
      <main className="pb-24">
        <section className="px-6 pt-6 space-y-4">

          {/* Saludo */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <p className="overline-text text-mid-gray text-[9px] tracking-[0.2em]">{greeting}</p>
            <h1 className="font-display text-[36px] font-light text-black leading-none capitalize">{firstName}</h1>
          </motion.div>

          {/* Hero: TU DIAGNÓSTICO */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}
            className="bg-off-white border border-light-gray p-5 space-y-4"
          >
            <div>
              <p className="overline-text text-[9px] text-mid-gray tracking-[0.2em] mb-1">TU DIAGNÓSTICO</p>
              <h2 className="font-display text-[22px] font-light text-black leading-tight">
                Descubre qué colores<br />te favorecen.
              </h2>
            </div>
            <div className="space-y-1">
              <div className="h-[2px] bg-light-gray w-full overflow-hidden">
                <div className="h-full bg-black" style={{ width: '0%' }} />
              </div>
              <p className="overline-text text-[8px] text-mid-gray">0 DE 3 COMPLETADO</p>
            </div>
            <Button fullWidth onClick={() => navigate('/onboarding')}>
              COMENZAR DIAGNÓSTICO
            </Button>
          </motion.div>

          {/* Diagnóstico Emocional (invitacional) */}
          <motion.button
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.14 }}
            onClick={() => navigate('/chat')}
            className="w-[calc(100%+48px)] -ml-6 px-6 text-left bg-[#CDBCDC] py-6 space-y-3 active:opacity-80 transition-opacity"
          >
            <div>
              <p className="overline-text text-[10px] text-black tracking-[0.15em] mb-1">DIAGNÓSTICO EMOCIONAL</p>
              <h2 className="font-display text-[20px] font-medium text-black leading-tight">Entiéndete mejor.</h2>
            </div>
            <p className="font-sans text-[12px] text-dark-gray leading-relaxed">
              Explora tu relación psicológica con la imagen a través de nuestro chatbot entrenado por Vane.
            </p>
            <div className="border border-black/40 py-2 text-center mt-2 flex justify-center items-center">
              <span className="font-sans text-[10px] font-bold tracking-[0.12em] text-black uppercase">
                INICIAR CHAT CON VANE
              </span>
            </div>
          </motion.button>

          {/* Accesos Rápidos */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
            <p className="overline-text text-[9px] text-mid-gray tracking-[0.2em] mb-3">ACCESOS RÁPIDOS</p>
            <div className="grid grid-cols-2 gap-[1px] bg-light-gray">
              {[
                { label: 'DIAGNÓSTICO',   icon: <Sparkles    size={18} strokeWidth={1} />, path: '/onboarding' },
                { label: 'CLOSET',        icon: <ShoppingBag size={18} strokeWidth={1} />, path: '/closet'     },
                { label: 'OUTFITS',       icon: <Layers      size={18} strokeWidth={1} />, path: '/outfits'    },
                { label: 'CHAT CON VANE', icon: <MessageCircle size={18} strokeWidth={1}/>, path: '/chat'      },
              ].map(({ label, icon, path }) => (
                <button
                  key={label}
                  onClick={() => navigate(path)}
                  className="bg-white py-5 flex flex-col items-center gap-2 active:bg-off-white transition-colors min-h-[72px]"
                >
                  <span className="text-black">{icon}</span>
                  <span className="font-sans text-[8px] tracking-[0.12em] uppercase text-black font-medium">{label}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Tip del Día */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.26 }}
            className="bg-off-white border border-light-gray p-5"
          >
            <p className="overline-text text-[9px] text-mid-gray tracking-[0.2em] mb-2">TIP DEL DÍA</p>
            <p className="font-sans text-[13px] text-dark-gray leading-relaxed">{dailyTip}</p>
          </motion.div>

          {/* Agendar con Vane — cards de servicios */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
            <p className="overline-text text-[9px] text-mid-gray tracking-[0.2em] mb-3">SESIONES CON VANE</p>
            <ServiceCards onBook={openCalendly} />
          </motion.div>

        </section>

        {rootElement && (
          <PopupModal url={activeUrl} onModalClose={() => setIsOpen(false)} open={isOpen} rootElement={rootElement} />
        )}
      </main>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ESTADO 2 — FREE ACTIVA (diagnóstico parcial, no premium)
  // ══════════════════════════════════════════════════════════════════════════════
  if (!isPremium) {
    return (
      <main className="pb-24">
        <section className="px-6 pt-6 space-y-4">

          {/* Saludo */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <p className="overline-text text-mid-gray text-[9px] tracking-[0.2em]">{greeting}</p>
            <h1 className="font-display text-[36px] font-light text-black leading-none capitalize">{firstName}</h1>
          </motion.div>

          {/* Diagnóstico visual: Rostro + Color */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
            <div className="grid grid-cols-2 gap-[1px] bg-light-gray">

              {/* Rostro */}
              <div className="bg-white p-4 flex flex-col items-center gap-2">
                <p className="overline-text text-[8px] text-mid-gray self-start">ROSTRO</p>
                {faceDiagnosis
                  ? <FaceShapeIllustration shape={faceDiagnosis.faceType} />
                  : <div className="w-14 h-16 bg-light-gray" />
                }
                <p className="font-display text-[15px] font-light text-black capitalize text-center leading-tight">
                  {faceDiagnosis?.faceType || '—'}
                </p>
              </div>

              {/* Color */}
              <div className="bg-white p-4 flex flex-col items-center gap-2">
                <p className="overline-text text-[8px] text-mid-gray self-start">COLOR</p>
                {colorDiagnosis?.palette && colorDiagnosis.palette.length > 0
                  ? (
                    <div className="flex gap-1.5 flex-wrap justify-center py-1">
                      {colorDiagnosis.palette.slice(0, 5).map((hex, i) => (
                        <div
                          key={i}
                          className="w-7 h-7 rounded-full border border-black/10 flex-shrink-0"
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      ))}
                    </div>
                  )
                  : <div className="flex gap-1.5 py-1">
                      {['#C17028', '#D4A356', '#8B5E3C'].map((c, i) => (
                        <div key={i} className="w-7 h-7 rounded-full border border-black/10" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                }
                <p className="font-display text-[15px] font-light text-black capitalize text-center leading-tight">
                  {colorDiagnosis?.season || '—'}
                </p>
              </div>
            </div>

            {/* Cuerpo — bloqueado */}
            <div className="bg-white border-t-0 border border-light-gray p-3 flex items-center justify-between opacity-50">
              <div className="flex items-center gap-2">
                <Lock size={11} strokeWidth={1.5} className="text-mid-gray" />
                <p className="overline-text text-[8px] text-mid-gray">CUERPO</p>
              </div>
              <p className="font-sans text-[10px] text-mid-gray">Pendiente — Pro</p>
            </div>
          </motion.div>

          {/* Nudge: completa diagnóstico */}
          {diagnosisProgress < 2 && (
            <motion.button
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.14 }}
              onClick={() => navigate('/onboarding')}
              className="w-full bg-off-white border border-light-gray p-4 flex items-center gap-3 active:opacity-70 transition-opacity"
            >
              <div className="flex-1 text-left">
                <p className="font-sans text-[12px] font-medium text-black">Completa tu diagnóstico</p>
                <p className="font-sans text-[11px] text-mid-gray mt-0.5">Tipo de cuerpo + recomendaciones</p>
              </div>
              <span className="font-sans text-[8px] tracking-[0.15em] uppercase text-mid-gray border border-light-gray px-2 py-1 flex-shrink-0">PRO</span>
            </motion.button>
          )}

          {/* Diagnóstico Emocional con cuota */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.18 }}
            className="w-[calc(100%+48px)] -ml-6 px-6 bg-[#CDBCDC] py-6 space-y-4"
          >
            <div>
              <p className="overline-text text-[10px] text-black tracking-[0.15em] mb-1">DIAGNÓSTICO EMOCIONAL</p>
              <p className="font-sans text-[12px] text-dark-gray leading-relaxed">
                Desbloquea autoconocimiento. {MONTHLY_SESSION_LIMIT} sesiones/mes en plan free.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                fullWidth
                disabled={quotaExhausted}
                onClick={() => !quotaExhausted && navigate('/chat')}
                className={quotaExhausted ? 'opacity-40' : ''}
              >
                INICIAR CHAT CON VANE
              </Button>
              <span className="font-sans text-[8px] font-bold tracking-[0.12em] uppercase text-black border border-black/30 px-3 py-3 rounded-md whitespace-nowrap flex-shrink-0">
                {emotionalSessionsUsed}/{MONTHLY_SESSION_LIMIT} USOS
              </span>
            </div>
            {quotaExhausted && (
              <button
                onClick={() => navigate('/paywall')}
                className="w-full font-sans text-[10px] tracking-[0.1em] uppercase text-black/70 underline underline-offset-2 text-center hover:text-black mt-1"
              >
                Actualiza a Premium →
              </button>
            )}
          </motion.div>

          {/* TU CLOSET — preview con prendas reales */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.24 }}
            className="bg-off-white border border-light-gray p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="overline-text text-[9px] text-mid-gray tracking-[0.2em]">TU CLOSET</p>
              <button
                onClick={() => navigate('/closet')}
                className="font-sans text-[9px] tracking-[0.08em] uppercase text-black font-medium"
              >
                Ver todo ›
              </button>
            </div>

            {closetLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-mid-gray" />
              </div>
            ) : closetItems.length === 0 ? (
              <div className="text-center py-4 space-y-2">
                <p className="font-sans text-[12px] text-mid-gray">Tu closet está vacío.</p>
                <button
                  onClick={() => navigate('/closet')}
                  className="font-sans text-[10px] tracking-[0.1em] uppercase text-black underline underline-offset-2"
                >
                  Agregar primera prenda
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-[1px] bg-light-gray">
                {closetItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => navigate('/closet')}
                    className="aspect-square overflow-hidden bg-off-white active:opacity-70 transition-opacity"
                  >
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Consejo del día */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}
            className="bg-off-white border border-light-gray p-5 space-y-2"
          >
            <p className="overline-text text-[9px] text-mid-gray tracking-[0.2em]">CONSEJO DEL DÍA</p>
            <p className="font-sans text-[12px] text-black leading-relaxed">{getPersonalizedTip()}</p>
          </motion.div>

          {/* Agendar con Vane — cards de servicios */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.34 }}>
            <p className="overline-text text-[9px] text-mid-gray tracking-[0.2em] mb-3">SESIONES CON VANE</p>
            <ServiceCards onBook={openCalendly} />
          </motion.div>

        </section>

        {rootElement && (
          <PopupModal url={activeUrl} onModalClose={() => setIsOpen(false)} open={isOpen} rootElement={rootElement} />
        )}
      </main>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ESTADO 3 — PREMIUM
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <main className="pb-24">
      {/* Resumen de diagnóstico */}
      <section className="px-6 pt-6 mb-8">
        <div className="bg-off-white border border-light-gray p-8 space-y-8">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="overline-text text-mid-gray tracking-[0.2em]">TU PERFIL</span>
              <h3 className="font-display text-[24px] font-light text-black">
                {greeting.charAt(0) + greeting.slice(1).toLowerCase()}, {firstName}
              </h3>
            </div>
            <span className="font-sans text-[8px] tracking-[0.15em] uppercase text-mid-gray border border-light-gray px-2 py-1">PREMIUM</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="overline-text text-[9px] text-mid-gray tracking-[0.15em]">ROSTRO</span>
              {faceDiagnosis && <FaceShapeIllustration shape={faceDiagnosis.faceType} />}
              <p className="font-display text-[18px] text-black capitalize">{faceDiagnosis?.faceType || '—'}</p>
            </div>
            <div className="space-y-2">
              <span className="overline-text text-[9px] text-mid-gray tracking-[0.15em]">COLOR</span>
              {colorDiagnosis?.palette && colorDiagnosis.palette.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {colorDiagnosis.palette.slice(0, 5).map((hex, i) => (
                    <div key={i} className="w-6 h-6 rounded-full border border-black/10" style={{ backgroundColor: hex }} />
                  ))}
                </div>
              )}
              <p className="font-display text-[18px] text-black capitalize">{colorDiagnosis?.season || '—'}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-light-gray">
            <Button variant="outline" fullWidth onClick={() => navigate('/diagnosis')} className="text-[11px] h-10">
              VER DETALLES COMPLETOS
            </Button>
          </div>
        </div>
      </section>

      <header className="px-6 mb-8">
        <span className="overline-text text-mid-gray mb-2 block">TU ASESORA</span>
        <h1 className="display-lg">VANE RONDÓN</h1>
        <p className="font-sans text-[14px] text-dark-gray leading-relaxed mt-4">
          10 años transformando la imagen de mujeres latinas. Elige el nivel de acompañamiento que necesitas.
        </p>
      </header>

      <section aria-label="Sesiones personalizadas" className="space-y-16">
        <div className="px-6">
          <span className="overline-text text-black border-b border-black pb-1 mb-8 inline-block">SESIONES PERSONALIZADAS</span>
        </div>
        {SERVICES.map((service, index) => (
          <motion.article
            key={service.id}
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: index * 0.08, ease: 'easeOut' }}
            className="space-y-6 flex flex-col items-center"
          >
            <div className="aspect-[16/9] w-full max-w-sm overflow-hidden bg-light-gray mx-auto">
              <img src={service.image} alt={service.name}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                referrerPolicy="no-referrer" loading="lazy"
              />
            </div>
            <div className="px-6 space-y-4 w-full">
              <div className="space-y-2">
                <h2 className="display-md">{service.name}</h2>
                <p className="caption-text text-black">{service.price}</p>
                <p className="font-sans text-[14px] text-dark-gray leading-relaxed">{service.description}</p>
              </div>
              <Button fullWidth onClick={() => openCalendly(service.calendlyUrl)} aria-label={`Agendar sesión — ${service.name}`}>
                AGENDAR SESIÓN
              </Button>
            </div>
          </motion.article>
        ))}
      </section>

      <section className="mt-20 px-6 py-16 bg-[#CDBCDC] text-center">
        <h3 className="display-lg mb-6 text-black">DIAGNÓSTICO EMOCIONAL</h3>
        <p className="font-sans text-[14px] text-dark-gray mb-8 max-w-sm mx-auto leading-relaxed">
          Explora tu relación psicológica con la imagen a través de nuestro chatbot entrenado por Vane.
        </p>
        <NavLink to="/chat">
          <Button variant="primary" className="w-full max-w-xs mx-auto">
            CHATEAR CON VANE AI
          </Button>
        </NavLink>
      </section>

      {rootElement && (
        <PopupModal url={activeUrl} onModalClose={() => setIsOpen(false)} open={isOpen} rootElement={rootElement} />
      )}
    </main>
  );
};
