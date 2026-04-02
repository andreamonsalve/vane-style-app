import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { useDiagnosisStore } from '../lib/diagnosisStore';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  activateTrial: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const loadDiagnosis = useDiagnosisStore(state => state.loadDiagnosis);
  const setPremium = useDiagnosisStore(state => state.setPremium);

  useEffect(() => {
    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setSession(session);
        setUser(currentUser);
        
        // Liberar el estado de carga INMEDIATAMENTE si ya sabemos si hay usuario o no
        // No esperar a que el perfil o diagnóstico carguen para mostrar la app
        setLoading(false);

        if (currentUser) {
          console.log('[Auth] Usuario detectado, iniciando carga asíncrona de datos...');
          
          // Lanzamos estas tareas SIN el await para no bloquear el hilo principal
          loadDiagnosis(currentUser.id).catch(err => 
            console.warn('[Auth] Error asíncrono cargando diagnóstico:', err)
          );
          
          // Cargar perfil de forma independiente
          supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle()
            .then(({ data: profile, error: profileError }) => {
              if (profileError) {
                console.warn('[Auth] Error asíncrono al buscar perfil:', profileError.message);
                return;
              }

              if (profile) {
                console.log('[Auth] Perfil recuperado con éxito');
                const isPremium = profile.subscription_tier === 'premium' || 
                                 (profile.trial_ends_at && new Date(profile.trial_ends_at) > new Date());
                setPremium(!!isPremium, profile.trial_ends_at);
                
                if (profile.style_goal) {
                  useDiagnosisStore.getState().setStyleGoal(profile.style_goal);
                }
              }
            });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadDiagnosis, setPremium]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    
    if (data.user) {
      // Crear perfil inicial
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        subscription_tier: 'free'
      });
    }
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    useDiagnosisStore.getState().reset();
  };

  const activateTrial = async () => {
    if (!user) return;
    
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);
    
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      subscription_tier: 'premium',
      trial_ends_at: trialEndsAt.toISOString()
    });
    
    if (!error) {
      setPremium(true, trialEndsAt.toISOString());
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut, activateTrial }}>
      {children}
    </AuthContext.Provider>
  );
};
