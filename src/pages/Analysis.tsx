import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { cn } from '@/src/lib/utils';
import { useDiagnosisStore } from '@/src/lib/diagnosisStore';
import { analyzeFace, analyzeColor } from '@/src/lib/geminiService';
import { supabase } from '@/src/lib/supabaseClient';
import { useAuth } from '@/src/contexts/AuthContext';

export const Analysis = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    selfieBase64, 
    setFaceDiagnosis, 
    setColorDiagnosis, 
    isAnalyzing, 
    setAnalyzing, 
    analysisStep, 
    setError,
    error 
  } = useDiagnosisStore();

  const hasRun = React.useRef(false);

  useEffect(() => {
    let mounted = true;

    const runAnalysis = async () => {
      // Evitar doble ejecución en React 18 Strict Mode
      if (hasRun.current) return;
      if (!selfieBase64) {
        navigate('/onboarding');
        return;
      }

      hasRun.current = true;
      setError(null);
      setAnalyzing(true, 'face');

      try {
        if (!import.meta.env.VITE_GEMINI_API_KEY) {
          throw new Error('API Key no configurada');
        }

        // 1. Análisis de Rostro
        const faceResult = await analyzeFace(selfieBase64);
        
        // Actualizamos store (no importa si desmontado, el store es global)
        setFaceDiagnosis(faceResult);

        if (user) {
          supabase.from('face_diagnoses').insert({
            user_id: user.id,
            face_type: faceResult.faceType,
            features: faceResult.features,
            recommendations: faceResult.recommendations
          }).then(({ error }) => {
            if (error) console.warn('Error guardando rostro:', error.message);
          });

          if (useDiagnosisStore.getState().styleGoal) {
            supabase.from('profiles').upsert({
              id: user.id,
              style_goal: useDiagnosisStore.getState().styleGoal
            }).then(({ error }) => {
              if (error) console.warn('Error guardando estilo:', error.message);
            });
          }
        }

        // 2. Análisis de Color
        setAnalyzing(true, 'color');
        const colorResult = await analyzeColor(selfieBase64);
        setColorDiagnosis(colorResult);

        if (user) {
          supabase.from('color_diagnoses').insert({
            user_id: user.id,
            season: colorResult.season,
            sub_season: colorResult.subSeason,
            palette: colorResult.palette,
            avoid_colors: colorResult.avoidColors,
            symbology: colorResult.symbology
          }).then(({ error }) => {
            if (error) console.warn('Error guardando color:', error.message);
          });
        }

        // 3. Finalización
        setAnalyzing(false, 'done');
        
        // Navegación forzada a resultados
        setTimeout(() => {
          navigate('/results');
        }, 1000);

      } catch (err: any) {
        console.error('Análisis fallido:', err);
        hasRun.current = false;
        if (mounted) {
          setError(err.message || 'Error en la comunicación con la IA');
          setAnalyzing(false, null);
        }
      }
    };

    runAnalysis();

    return () => {
      mounted = false;
    };
  }, [selfieBase64, navigate, user]);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 pt-6 pb-2 flex items-center">
        <button
          onClick={() => navigate('/onboarding')}
          className="p-2 -ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-off-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          aria-label="Volver al onboarding"
        >
          <ArrowLeft className="w-5 h-5 text-black" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Scan animation — aria-hidden, purely decorative */}
        <div
          className="relative w-32 h-32 rounded-full border border-light-gray flex items-center justify-center bg-off-white overflow-hidden mb-12"
          aria-hidden="true"
        >
          <div className="w-20 h-20 rounded-full bg-light-gray" />
          <div className="absolute left-4 right-4 h-[1px] bg-black opacity-30 animate-scan motion-reduce:animate-none" />
        </div>

        <div className="text-center space-y-2 mb-12">
          <h1 className="font-display text-[28px] font-light text-black">
            {error ? 'Error en el análisis' : 'Analizando con IA'}
          </h1>
          <p className="font-sans text-[12px] text-dark-gray leading-relaxed">
            {error ? error : (
              <>Identificando tu tipo de rostro,<br />facciones y estación de color.</>
            )}
          </p>
        </div>

        {error && (
          <div className="w-full max-w-[240px] mt-4" role="alert">
            <Button fullWidth onClick={() => navigate('/onboarding')}>
              REINTENTAR
            </Button>
          </div>
        )}

        {!error && (
          <div
            className="w-full max-w-[240px] space-y-5"
            role="status"
            aria-live="polite"
            aria-label={
              analysisStep === 'done'
                ? 'Análisis completado'
                : analysisStep === 'color'
                ? 'Calculando colorimetría...'
                : 'Analizando rostro...'
            }
          >
            <div className="flex items-center gap-4">
              {analysisStep === 'color' || analysisStep === 'done' ? (
                <div className="w-4 h-4 rounded-full border border-success flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-success" aria-hidden="true" />
                </div>
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse-dot motion-reduce:animate-none ml-1.5 shrink-0" aria-hidden="true" />
              )}
              <span className={cn(
                "font-sans text-[12px] ml-1 transition-colors",
                (analysisStep === 'color' || analysisStep === 'done') ? "text-success" : "text-charcoal"
              )}>
                Analizando rostro y facciones...
              </span>
            </div>

            <div className="flex items-center gap-4">
              {analysisStep === 'done' ? (
                <div className="w-4 h-4 rounded-full border border-success flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-success" aria-hidden="true" />
                </div>
              ) : analysisStep === 'color' ? (
                <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse-dot motion-reduce:animate-none ml-1.5 shrink-0" aria-hidden="true" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-light-gray ml-1.5 shrink-0" aria-hidden="true" />
              )}
              <span className={cn(
                "font-sans text-[12px] ml-1 transition-colors",
                analysisStep === 'done' ? "text-success" :
                analysisStep === 'color' ? "text-charcoal" : "text-mid-gray"
              )}>
                Calculando estación de colorimetría...
              </span>
            </div>

            <div className="flex items-center gap-4">
              {analysisStep === 'done' ? (
                <div className="w-4 h-4 rounded-full border border-success flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-success" aria-hidden="true" />
                </div>
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-light-gray ml-1.5 shrink-0" aria-hidden="true" />
              )}
              <span className={cn(
                "font-sans text-[12px] ml-1 transition-colors",
                analysisStep === 'done' ? "text-success" : "text-mid-gray"
              )}>
                Generando reporte personalizado
              </span>
            </div>

            {analysisStep === 'done' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-4"
              >
                <Button
                  fullWidth
                  onClick={() => navigate('/results', { replace: true })}
                  className="bg-success hover:bg-success/90 border-success"
                >
                  VER RESULTADOS
                </Button>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
