import { create } from 'zustand';
import type { FaceDiagnosis, ColorDiagnosis } from './geminiService';

interface DiagnosisState {
  // Image captured during onboarding
  selfieBase64: string | null;
  selfiePreviewUrl: string | null;
  
  // Quiz answers
  styleGoal: string | null;
  
  // AI results
  faceDiagnosis: FaceDiagnosis | null;
  colorDiagnosis: ColorDiagnosis | null;
  
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
  reset: () => void;
}

export const useDiagnosisStore = create<DiagnosisState>((set) => ({
  selfieBase64: null,
  selfiePreviewUrl: null,
  styleGoal: null,
  faceDiagnosis: null,
  colorDiagnosis: null,
  isAnalyzing: false,
  analysisStep: null,
  error: null,
  
  setSelfie: (base64, previewUrl) => set({ selfieBase64: base64, selfiePreviewUrl: previewUrl }),
  setStyleGoal: (goal) => set({ styleGoal: goal }),
  setFaceDiagnosis: (diagnosis) => set({ faceDiagnosis: diagnosis }),
  setColorDiagnosis: (diagnosis) => set({ colorDiagnosis: diagnosis }),
  setAnalyzing: (isAnalyzing, step = null) => set({ isAnalyzing, analysisStep: step }),
  setError: (error) => set({ error }),
  reset: () => set({
    selfieBase64: null,
    selfiePreviewUrl: null,
    styleGoal: null,
    faceDiagnosis: null,
    colorDiagnosis: null,
    isAnalyzing: false,
    analysisStep: null,
    error: null,
  }),
}));
