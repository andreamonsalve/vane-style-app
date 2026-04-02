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
        console.log('Iniciando análisis de IA...');
        if (!import.meta.env.VITE_GEMINI_API_KEY) {
          throw new Error('API Key no configurada');
        }

        // 1. Análisis de Rostro
        console.log('Paso 1: Analizando rostro...');
        const faceResult = await analyzeFace(selfieBase64);
        console.log('Resultado de rostro:', faceResult);
        
        // Actualizamos store (no importa si desmontado, el store es global)
        setFaceDiagnosis(faceResult);
        
        // Guardado opcional en Supabase
        if (user) {
          // Guardar rostro
          supabase.from('face_diagnoses').insert({
            user_id: user.id,
            face_type: faceResult.faceType,
            features: faceResult.features,
            recommendations: faceResult.recommendations
          }).then(({ error }) => {
            if (error) console.warn('Error guardando rostro en DB:', error.message);
          });

          // Guardar objetivo de estilo en perfil
          if (useDiagnosisStore.getState().styleGoal) {
            supabase.from('profiles').upsert({
              id: user.id,
              style_goal: useDiagnosisStore.getState().styleGoal
            }).then(({ error }) => {
              if (error) console.warn('Error guardando estilo en perfil:', error.message);
            });
          }
        }

        // 2. Análisis de Color
        console.log('Paso 2: Analizando colorimetría...');
        setAnalyzing(true, 'color');
        const colorResult = await analyzeColor(selfieBase64);
        console.log('Resultado de color:', colorResult);
        
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
            if (error) console.warn('Error guardando color en DB:', error.message);
          });
        }

        // 3. Finalización
        setAnalyzing(false, 'done');
        console.log('Análisis finalizado con éxito');
        
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
      {/* Header with Back Button */}
      <div className="px-6 pt-6 pb-2 flex items-center">
        <button 
          onClick={() => navigate('/onboarding')}
          className="p-2 -ml-2 hover:bg-off-white transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5 text-black" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="relative w-32 h-32 rounded-full border border-light-gray flex items-center justify-center bg-off-white overflow-hidden mb-12">
          <div className="w-20 h-20 rounded-full bg-light-gray" />
          <div className="absolute left-4 right-4 h-[1px] bg-black opacity-30 animate-scan" />
        </div>

        <div className="text-center space-y-2 mb-12">
          <h1 className="font-display text-[28px] font-light text-black">
            {error ? 'Error en el análisis' : 'Analizando con IA'}
          </h1>
          <p className="font-sans text-[12px] text-dark-gray leading-relaxed">
            {error ? error : (
              <>Identificando tu tipo de rostro,<br/>facciones y estación de color.</>
            )}
          </p>
        </div>

        {error && (
          <div className="w-full max-w-[240px] mt-4">
            <Button fullWidth onClick={() => navigate('/onboarding')}>
              REINTENTAR
            </Button>
          </div>
        )}

        {!error && (
          <div className="w-full max-w-[240px] space-y-5">
          <div className="flex items-center gap-4">
            {analysisStep === 'color' || analysisStep === 'done' ? (
              <div className="w-4 h-4 rounded-full border border-success flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-success" />
              </div>
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse-dot ml-1.5 shrink-0" />
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
                <Check className="w-2.5 h-2.5 text-success" />
              </div>
            ) : analysisStep === 'color' ? (
              <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse-dot ml-1.5 shrink-0" />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-light-gray ml-1.5 shrink-0" />
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
                <Check className="w-2.5 h-2.5 text-success" />
              </div>
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-light-gray ml-1.5 shrink-0" />
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
