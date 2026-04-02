import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/src/components/ui/Button';
import { useDiagnosisStore } from '@/src/lib/diagnosisStore';
import { useAuth } from '@/src/contexts/AuthContext';
import { Lock, ArrowLeft } from 'lucide-react';

export const Results = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'rostro' | 'color' | 'summary'>('rostro');
  
  const { faceDiagnosis, colorDiagnosis, styleGoal, isPremium, loadDiagnosis } = useDiagnosisStore();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      if (user && (!faceDiagnosis || !colorDiagnosis)) {
        await loadDiagnosis(user.id);
      }
      setLoading(false);
    };
    fetchData();
  }, [user, faceDiagnosis, colorDiagnosis, loadDiagnosis]);

  const handleBack = () => {
    if (view === 'summary') setView('color');
    else if (view === 'color') setView('rostro');
    else navigate('/');
  };

  const renderRostro = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-12"
    >
      <div className="text-center space-y-2">
        <span className="overline-text text-mid-gray tracking-[0.2em]">TIPO DE ROSTRO</span>
        <h1 className="font-display text-[48px] font-light text-black leading-none capitalize">
          {faceDiagnosis?.faceType || 'Desconocido'}
        </h1>
      </div>

      <div className="border-t border-light-gray pt-6 space-y-4">
        <span className="overline-text text-black tracking-[0.15em]">RECOMENDACIONES</span>
        <div className="space-y-3">
          {faceDiagnosis?.recommendations.map((rec, i) => (
            <p key={i} className="font-sans text-[12px] text-dark-gray leading-relaxed flex gap-2">
              <span className="text-black">•</span> {rec}
            </p>
          ))}
          {!faceDiagnosis && (
            <p className="font-sans text-[12px] text-dark-gray leading-relaxed">
              No hay recomendaciones disponibles en este momento.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative bg-off-white p-5 overflow-hidden">
          {!isPremium && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
              <Lock className="w-5 h-5 text-black mb-2" />
              <span className="overline-text text-black tracking-[0.2em]">PREMIUM</span>
            </div>
          )}
          <span className="overline-text text-black/40 block mb-1">CORTES DE CABELLO</span>
          <p className="font-sans text-[12px] text-dark-gray">
            {isPremium ? "Tus cortes ideales basados en tu rostro oblongo: Bob con volumen lateral, flequillo cortina o capas largas." : "Según tu rostro y la imagen circular..."}
          </p>
        </div>

        <div className="relative bg-off-white p-5 overflow-hidden">
          {!isPremium && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
              <Lock className="w-5 h-5 text-black mb-2" />
              <span className="overline-text text-black tracking-[0.2em]">PREMIUM</span>
            </div>
          )}
          <span className="overline-text text-black/40 block mb-1">ACCESORIOS + LENTES</span>
          <p className="font-sans text-[12px] text-dark-gray">
            {isPremium ? "Lentes recomendados: De formas redondeadas o cuadradas con bordes suaves para equilibrar la verticalidad." : "Formas ideales para tu tipo de rostro..."}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {!isPremium && <Button fullWidth onClick={() => navigate('/paywall')}>DESBLOQUEAR PREMIUM</Button>}
        <div className="text-center">
          <button 
            onClick={() => setView('color')}
            className="font-sans text-[11px] text-mid-gray tracking-[0.1em] uppercase underline underline-offset-4"
          >
            Continuar con color
          </button>
        </div>
      </div>
    </motion.div>
  );

  const renderColor = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-12"
    >
      <div className="text-center space-y-2">
        <span className="overline-text text-mid-gray tracking-[0.2em]">ESTACIÓN DE COLOR</span>
        <h1 className="font-display text-[42px] font-light text-black leading-none capitalize">
          {colorDiagnosis?.season || 'Desconocida'}
        </h1>
        <p className="font-sans text-[11px] text-mid-gray tracking-[0.05em] capitalize">
          {colorDiagnosis?.subSeason || ''} · Subtono {colorDiagnosis?.undertone || ''}
        </p>
      </div>

      <div className="border-t border-light-gray pt-6 space-y-6">
        <div className="space-y-4">
          <span className="overline-text text-black tracking-[0.15em]">TE FAVORECEN</span>
          <div className="flex flex-wrap gap-3">
            {(colorDiagnosis?.palette || ['#C17028', '#D4A356', '#8B5E3C', '#BC4B32', '#D67D4A', '#6B7C3F']).map(c => (
              <div key={c} className="w-8 h-8 rounded-full border border-black/5" style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <span className="overline-text text-black tracking-[0.15em]">EVITAR</span>
          <div className="flex flex-wrap gap-3">
            {(colorDiagnosis?.avoidColors || ['#6082B6', '#8E7CC3', '#FF69B4']).map(c => (
              <div key={c} className="w-8 h-8 rounded-full border border-black/5 opacity-40" style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </div>

      <div className="relative bg-off-white p-5 overflow-hidden">
        {!isPremium && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
            <Lock className="w-5 h-5 text-black mb-2" />
            <span className="overline-text text-black tracking-[0.2em]">PREMIUM</span>
          </div>
        )}
        <span className="overline-text text-black/40 block mb-1">SIMBOLOGÍA DEL COLOR</span>
        <p className="font-sans text-[12px] text-dark-gray">{colorDiagnosis?.symbology || 'Descubre la psicología de tus colores ideales...'}</p>
      </div>

      <div className="space-y-4">
        {!isPremium && <Button fullWidth onClick={() => navigate('/paywall')}>VER DIAGNÓSTICO COMPLETO</Button>}
        <div className="text-center">
          <button 
            onClick={() => setView('summary')}
            className="font-sans text-[11px] text-mid-gray tracking-[0.1em] uppercase underline underline-offset-4"
          >
            Siguiente: Resumen de Perfil
          </button>
        </div>
      </div>
    </motion.div>
  );

  const renderSummary = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-12"
    >
      <div className="space-y-2">
        <span className="overline-text text-mid-gray tracking-[0.2em]">TU PERFIL</span>
        <h1 className="font-display text-[28px] font-light text-black">Tu diagnóstico de imagen</h1>
      </div>

      <div className="flex gap-[1px] bg-light-gray border border-light-gray">
        <div className="flex-1 bg-off-white py-6 px-2 text-center space-y-2">
          <span className="overline-text text-[9px] text-mid-gray tracking-[0.15em]">ROSTRO</span>
          <p className="font-display text-[16px] text-black capitalize">{faceDiagnosis?.faceType || 'Ovalado'}</p>
        </div>
        <div className="flex-1 bg-off-white py-6 px-2 text-center space-y-2">
          <span className="overline-text text-[9px] text-mid-gray tracking-[0.15em]">COLOR</span>
          <div className="flex gap-1 justify-center">
            {(colorDiagnosis?.palette || ['#C17028', '#D4A356', '#8B5E3C']).slice(0, 3).map((c, i) => (
              <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
            ))}
          </div>
          <p className="font-display text-[16px] text-black capitalize">{colorDiagnosis?.season?.split(' ')[0] || 'Otoño'}</p>
        </div>
        <div className="flex-1 bg-off-white py-6 px-2 text-center space-y-2 relative overflow-hidden">
          {!isPremium && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center">
              <Lock className="w-3 h-3 text-black" />
            </div>
          )}
          <span className="overline-text text-[9px] text-mid-gray tracking-[0.15em]">CUERPO</span>
          <p className="font-sans text-[11px] text-black uppercase">{isPremium ? "Reloj de Arena" : "Pendiente"}</p>
        </div>
      </div>

      <div className="border-b border-light-gray pb-6">
        <span className="overline-text text-black tracking-[0.15em] block mb-2">TU OBJETIVO</span>
        <p className="font-sans text-[13px] text-dark-gray leading-relaxed">
          {styleGoal || 'Proyectar mayor autoridad profesional sin perder calidez.'}
        </p>
      </div>

      {!isPremium && (
        <div className="space-y-4">
          <span className="overline-text text-black tracking-[0.15em] block">DESBLOQUEA CON PREMIUM</span>
          <ul className="space-y-3">
            {['Diagnóstico de tipo de cuerpo', 'Simbología y propósito', 'Mix & match con IA', 'Comunidad + swap'].map(f => (
              <li key={f} className="flex items-center gap-3">
                <div className="w-1 h-1 bg-black rounded-full" />
                <span className="font-sans text-[13px] text-dark-gray">{f}</span>
              </li>
            ))}
          </ul>
          <Button 
            fullWidth 
            className="bg-black text-white hover:bg-charcoal"
            onClick={() => navigate('/paywall')}
          >
            DESBLOQUEAR TODO
          </Button>
        </div>
      )}

      {isPremium && (
        <div className="p-6 bg-black text-white text-center space-y-4">
          <h3 className="overline-text text-[12px] tracking-[0.2em]">SISTEMA COMPLETO DESBLOQUEADO</h3>
          <p className="font-sans text-[11px] text-mid-gray">Ya tienes acceso a todas las herramientas de Vane para transformar tu imagen.</p>
          <Button 
            variant="outline" 
            fullWidth 
            onClick={() => navigate('/')}
            className="border-white text-white hover:bg-white hover:text-black"
          >
            IR AL INICIO
          </Button>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Back Button */}
      <div className="px-6 pt-6 pb-2 flex items-center">
        <button 
          onClick={handleBack}
          className="p-2 -ml-2 hover:bg-off-white transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5 text-black" />
        </button>
      </div>

      <div className="px-6 pt-4 pb-24">
        {loading && (!faceDiagnosis || !colorDiagnosis) ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <div className="w-10 h-10 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <p className="font-sans text-[12px] text-mid-gray animate-pulse">Sincronizando diagnóstico...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {view === 'rostro' && renderRostro()}
            {view === 'color' && renderColor()}
            {view === 'summary' && renderSummary()}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
