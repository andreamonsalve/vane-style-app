import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Check, ArrowLeft } from 'lucide-react';
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
    setError 
  } = useDiagnosisStore();

  useEffect(() => {
    let mounted = true;

    const runAnalysis = async () => {
      if (!selfieBase64) {
        navigate('/onboarding');
        return;
      }

      if (isAnalyzing) return;
      setAnalyzing(true, 'face');
      setError(null);

      try {
        // 1. Face Analysis
        const faceResult = await analyzeFace(selfieBase64);
        if (!mounted) return;
        setFaceDiagnosis(faceResult);
        
        if (user) {
          await supabase.from('face_diagnoses').insert({
            user_id: user.id,
            face_type: faceResult.faceType,
            features: faceResult.features,
            recommendations: faceResult.recommendations
          });
        }

        // 2. Color Analysis
        setAnalyzing(true, 'color');
        const colorResult = await analyzeColor(selfieBase64);
        if (!mounted) return;
        setColorDiagnosis(colorResult);

        if (user) {
          await supabase.from('color_diagnoses').insert({
            user_id: user.id,
            season: colorResult.season,
            sub_season: colorResult.subSeason,
            palette: colorResult.palette,
            avoid_colors: colorResult.avoidColors,
            symbology: colorResult.symbology
          });
        }

        // 3. Mark as done and redirect
        setAnalyzing(false, 'done');
        setTimeout(() => {
          if (mounted) navigate('/results');
        }, 1500);

      } catch (err) {
        console.error('Analysis error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Error analyzing photo');
          setAnalyzing(false, null);
          navigate('/onboarding');
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
          <h1 className="font-display text-[28px] font-light text-black">Analizando con IA</h1>
          <p className="font-sans text-[12px] text-dark-gray leading-relaxed">
            Identificando tu tipo de rostro,<br/>facciones y estación de color.
          </p>
        </div>

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
        </div>
      </div>
    </div>
  );
};
