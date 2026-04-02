import { create } from 'zustand';
import type { FaceDiagnosis, ColorDiagnosis } from './geminiService';
import { supabase } from './supabaseClient';

interface DiagnosisState {
  // Image captured during onboarding
  selfieBase64: string | null;
  selfiePreviewUrl: string | null;
  
  // Quiz answers
  styleGoal: string | null;
  
  // AI results
  faceDiagnosis: FaceDiagnosis | null;
  colorDiagnosis: ColorDiagnosis | null;
  
  // Subscription status
  isPremium: boolean;
  trialExpiresAt: string | null;
  
  // Loading state
  isAnalyzing: boolean;
  analysisStep: 'face' | 'color' | 'done' | null;
  error: string | null;
  
  // Actions
  setSelfie: (base64: string, previewUrl: string) => void;
  setStyleGoal: (goal: string) => void;
  setFaceDiagnosis: (diagnosis: FaceDiagnosis) => void;
  setColorDiagnosis: (diagnosis: ColorDiagnosis) => void;
  setAnalyzing: (isAnalyzing: boolean, step?: 'face' | 'color' | 'done' | null) => void;
  setError: (error: string | null) => void;
  setPremium: (isPremium: boolean, expiresAt?: string | null) => void;
  loadDiagnosis: (userId: string) => Promise<void>;
  reset: () => void;
}

export const useDiagnosisStore = create<DiagnosisState>((set, get) => ({
  selfieBase64: null,
  selfiePreviewUrl: null,
  styleGoal: null,
  faceDiagnosis: null,
  colorDiagnosis: null,
  isPremium: false,
  trialExpiresAt: null,
  isAnalyzing: false,
  analysisStep: null,
  error: null,
  
  setSelfie: (base64, previewUrl) => set({ selfieBase64: base64, selfiePreviewUrl: previewUrl }),
  setStyleGoal: (goal) => set({ styleGoal: goal }),
  setFaceDiagnosis: (diagnosis) => set({ faceDiagnosis: diagnosis }),
  setColorDiagnosis: (diagnosis) => set({ colorDiagnosis: diagnosis }),
  setAnalyzing: (isAnalyzing, step = null) => set({ isAnalyzing, analysisStep: step }),
  setError: (error) => set({ error }),
  setPremium: (isPremium, expiresAt = null) => set({ isPremium, trialExpiresAt: expiresAt }),

  loadDiagnosis: async (userId: string) => {
    try {
      console.log('[Store] Iniciando carga de diagnóstico para:', userId);
      
      // 1. Cargar Rostro (independiente)
      const { data: faceData, error: faceError } = await supabase
        .from('face_diagnoses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (faceData) {
        console.log('[Store] Rostro encontrado:', faceData.face_type);
        set({ faceDiagnosis: {
          faceType: faceData.face_type,
          features: faceData.features,
          recommendations: faceData.recommendations
        }});
      } else if (faceError) {
        console.warn('[Store] Error al cargar rostro:', faceError.message);
      }

      // 2. Cargar Color (independiente)
      const { data: colorData, error: colorError } = await supabase
        .from('color_diagnoses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (colorData) {
        console.log('[Store] Color encontrado:', colorData.season);
        set({ colorDiagnosis: {
          season: colorData.season,
          subSeason: colorData.sub_season,
          undertone: colorData.undertone || 'No definido',
          palette: colorData.palette,
          avoidColors: colorData.avoid_colors,
          symbology: colorData.symbology
        }});
      } else if (colorError) {
        console.warn('[Store] Error al cargar color:', colorError.message);
      }
      
    } catch (err: any) {
      console.error('[Store] Error crítico en loadDiagnosis:', err.message);
    }
  },

  reset: () => set({
    selfieBase64: null,
    selfiePreviewUrl: null,
    styleGoal: null,
    faceDiagnosis: null,
    colorDiagnosis: null,
    isPremium: false,
    trialExpiresAt: null,
    isAnalyzing: false,
    analysisStep: null,
    error: null,
  }),
}));
