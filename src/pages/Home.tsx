import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { Button } from '@/src/components/ui/Button';
import { PopupModal } from 'react-calendly';
import { useDiagnosisStore } from '@/src/lib/diagnosisStore';

const SERVICES = [
  {
    id: 1,
    name: 'ESENCIA PERSONAL',
    price: 'CLP 700.000',
    description: 'Nuestra asesoría más completa. Descubre tu identidad visual profunda y alinéala con tus objetivos de vida.',
    image: '/images/esencia-personal-banner.png',
    calendlyUrl: 'https://calendly.com/vane-style/esencia-personal'
  },
  {
    id: 2,
    name: 'MIX & MATCH 90\'',
    price: 'CLP 400.000',
    description: 'Sesión intensiva para crear 20+ outfits con lo que ya tienes. Optimiza tu closet al máximo.',
    image: '/images/mix&match-banner.png',
    calendlyUrl: 'https://calendly.com/vane-style/mix-match'
  },
  {
    id: 3,
    name: 'RENOVACIÓN INTEGRAL',
    price: 'CLP 1.000.000',
    description: 'Cambio total de imagen, closet detox y personal shopping guiado por Vane.',
    image: '/images/renovacion-integral-banner.png',
    calendlyUrl: 'https://calendly.com/vane-style/renovacion'
  },
];

export const Home = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeUrl, setActiveUrl] = useState('');
  const [rootElement, setRootElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setRootElement(document.getElementById('root') || document.body);
  }, []);

  const openCalendly = (url: string) => {
    setActiveUrl(url);
    setIsOpen(true);
  };

  const { faceDiagnosis, colorDiagnosis } = useDiagnosisStore();

  if (loading) {
    return <div className="h-screen flex items-center justify-center">Cargando...</div>;
  }

  // Si no hay usuario, mostrar Landing Page clásica a pantalla completa
  if (!user) {
    return (
      <div className="h-screen w-full relative flex flex-col items-center justify-center overflow-hidden px-6">
        {/* Background Image & Overlay */}
        <img 
          src="/images/home-banner.png" 
          alt="Home Banner Vane Style"
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/40" /> 

        {/* Contenido Centrado */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center text-center space-y-10 w-full max-w-sm mt-12"
        >
          {/* Logo / Título Principal */}
          <img 
            src="/images/logo_vane_hero.svg" 
            alt="Vane Style" 
            className="w-full max-w-[320px] h-auto mb-4"
          />

          {/* Textos Secundarios */}
          <div className="space-y-4">
            <h2 className="font-display text-[28px] font-light text-white leading-tight">
              Viste con propósito.
            </h2>
            <p className="font-sans text-[13px] text-white/90 leading-relaxed max-w-[280px] mx-auto">
              Tu asesora de imagen personal. Diagnóstico con IA, closet inteligente, outfits con lo que ya tienes.
            </p>
          </div>

          {/* Botones de Acción */}
          <div className="w-full space-y-4 pt-4">
            <Button 
              fullWidth 
              onClick={() => navigate('/onboarding')}
              className="bg-white text-black hover:bg-light-gray"
            >
              COMENZAR GRATIS
            </Button>
            
            <button
              onClick={() => navigate('/login')}
              className="w-full font-sans text-[11px] text-white/80 tracking-[0.1em] uppercase hover:text-white transition-colors py-2 border border-white/30 hover:bg-white/10"
            >
              YA TENGO CUENTA
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Si está logueado, mostrar servicios ("VANE") y el acceso al onboarding
  return (
    <div className="pb-24">
      <header className="px-6 pt-6 mb-8">
        <span className="overline-text text-mid-gray mb-2 block">TU ASESORA</span>
        <h1 className="display-lg">VANE RONDÓN</h1>
        <p className="body text-dark-gray mt-4">
          10 años transformando la imagen de mujeres latinas. Descubre tu estilo o elige el nivel de acompañamiento que necesitas.
        </p>
      </header>

      {/* Sección Dinámica: Diagnóstico o Resumen */}
      <section className="px-6 mb-16">
        {(!faceDiagnosis && !colorDiagnosis) ? (
          <div className="bg-black text-white p-8 text-center space-y-6">
            <div className="space-y-2">
              <h3 className="font-display text-[24px] font-light leading-tight">Tu viaje de<br/>estilo comienza aquí</h3>
              <p className="font-sans text-[13px] text-mid-gray">Realiza tu diagnóstico inicial para que nuestra IA pueda conocerte y armar tu clóset ideal.</p>
            </div>
            <Button 
              onClick={() => navigate('/onboarding')}
              className="w-full bg-white text-black hover:bg-light-gray border-white"
            >
              HACER DIAGNÓSTICO AHORA
            </Button>
          </div>
        ) : (
          <div className="bg-off-white border border-light-gray p-8 space-y-8">
            <div className="space-y-1">
              <span className="overline-text text-mid-gray tracking-[0.2em]">TU PERFIL ACTUAL</span>
              <h3 className="font-display text-[24px] font-light text-black">Resumen de Diagnóstico</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="overline-text text-[9px] text-mid-gray tracking-[0.15em]">ROSTRO</span>
                <p className="font-display text-[18px] text-black capitalize">
                  {faceDiagnosis?.faceType || '...'}
                </p>
              </div>
              <div className="space-y-2">
                <span className="overline-text text-[9px] text-mid-gray tracking-[0.15em]">COLOR</span>
                <p className="font-display text-[18px] text-black capitalize">
                  {colorDiagnosis?.season || '...'}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-light-gray">
              <Button 
                variant="outline"
                fullWidth 
                onClick={() => navigate('/results')}
                className="text-[11px] h-10"
              >
                VER DETALLES COMPLETOS
              </Button>
            </div>
          </div>
        )}
      </section>

      <div className="space-y-16">
        <div className="px-6">
          <span className="overline-text text-black border-b border-black pb-1 mb-8 inline-block">SESIONES PERSONALIZADAS</span>
        </div>
        {SERVICES.map((service) => (
          <div key={service.id} className="space-y-6 flex flex-col items-center">
            <div className="aspect-[16/9] w-full max-w-sm overflow-hidden bg-light-gray mx-auto">
              <img 
                src={service.image} 
                alt={service.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="px-6 space-y-4 w-full">
              <div className="space-y-2">
                <h2 className="display-md">{service.name}</h2>
                <p className="caption-text text-black">{service.price}</p>
                <p className="body text-dark-gray">{service.description}</p>
              </div>
              <Button fullWidth onClick={() => openCalendly(service.calendlyUrl)}>
                AGENDAR SESIÓN
              </Button>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-20 px-6 py-16 bg-black text-white text-center">
        <h3 className="display-lg mb-6">DIAGNÓSTICO EMOCIONAL</h3>
        <p className="body text-mid-gray mb-8 max-w-sm mx-auto">
          Explora tu relación psicológica con la imagen a través de nuestro chatbot entrenado por Vane.
        </p>
        <NavLink to="/chat">
          <Button className="bg-white text-black hover:bg-light-gray w-full max-w-xs mx-auto">
            CHATEAR CON VANE AI
          </Button>
        </NavLink>
      </section>

      {rootElement && (
        <PopupModal
          url={activeUrl}
          onModalClose={() => setIsOpen(false)}
          open={isOpen}
          rootElement={rootElement}
        />
      )}
    </div>
  );
};
