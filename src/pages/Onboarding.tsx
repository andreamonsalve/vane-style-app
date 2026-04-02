import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Check, ArrowLeft, ShieldCheck, Upload } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { cn } from '@/src/lib/utils';
import { useDiagnosisStore } from '@/src/lib/diagnosisStore';

export const Onboarding = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState(1); // 1: Quiz, 2: Selfie
  const { styleGoal, setStyleGoal, setSelfie, selfiePreviewUrl } = useDiagnosisStore();

  const quizOptions = [
    { title: 'Profesional y seria', sub: 'Confiable pero algo rígida' },
    { title: 'Cercana y amigable', sub: 'Accesible pero poco impactante' },
    { title: 'Creativa y atrevida', sub: 'Única pero a veces excesiva' },
    { title: 'Discreta y reservada', sub: 'Elegante pero poco visible' },
  ];
  
  // Use index or current option
  const [selectedOption, setSelectedOption] = useState<number | null>(
    styleGoal ? quizOptions.findIndex(o => o.title === styleGoal) : null
  );

  const handleNext = () => {
    if (step === 1) {
      if (selectedOption !== null) {
        setStyleGoal(quizOptions[selectedOption].title);
      }
      setStep(2);
    } else {
      if (!selfiePreviewUrl) return; // Prevent next if no selfie
      navigate('/analysis');
    }
  };

  const handleBack = () => {
    if (step === 1) navigate('/');
    else setStep(1);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Fichero seleccionado:', e.target.files?.[0]);
    const file = e.target.files?.[0];
    if (!file) return;

    // Create object URL for preview
    const objectUrl = URL.createObjectURL(file);
    console.log('Preview URL creada:', objectUrl);
    
    // Resize/Compress and Read as base64 for API
    const reader = new FileReader();
    reader.onload = (event) => {
      console.log('FileReader completado');
      const img = new Image();
      img.onload = () => {
        console.log('Imagen cargada en memoria, dimensiones:', img.width, 'x', img.height);
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Get compressed base64
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        console.log('Base64 comprimido generado');
        setSelfie(compressedBase64, objectUrl);
        console.log('Estado de la selfie actualizado en el store');
      };
      img.onerror = (err) => console.error('Error cargando imagen en memoria:', err);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => console.error('Error en FileReader:', err);
    reader.readAsDataURL(file);
  };

  const triggerCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.setAttribute('capture', 'user');
      fileInputRef.current.click();
    }
  };

  const triggerGallery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Hidden file input */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={onFileChange} 
        className="hidden" 
      />

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

      {/* Progress Bar */}
      <div className="h-[1px] w-full bg-light-gray">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: step === 1 ? '33%' : '66%' }}
          className="h-full bg-black"
        />
      </div>

      <div className="flex-1 flex flex-col px-6 pt-12">
        {step === 1 ? (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="space-y-2">
              <span className="overline-text text-black tracking-[0.2em]">|01| PROPÓSITO</span>
              <h1 className="font-display text-[28px] font-light text-black leading-tight">
                ¿Qué imagen sientes que proyectas hoy?
              </h1>
              <p className="font-sans text-[11px] text-mid-gray">
                Sé honesta. No hay respuestas correctas.
              </p>
            </div>

            <div className="space-y-0 border-t border-light-gray">
              {quizOptions.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedOption(i)}
                  className={cn(
                    "w-full flex items-center gap-4 py-5 border-b border-light-gray transition-colors text-left",
                    selectedOption === i && "bg-off-white"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border border-mid-gray flex items-center justify-center shrink-0",
                    selectedOption === i && "border-black bg-black"
                  )}>
                    {selectedOption === i && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <div>
                    <p className="font-sans text-[13px] text-charcoal">{opt.title}</p>
                    <p className="font-sans text-[11px] text-mid-gray">{opt.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 text-center"
          >
            <div className="space-y-2">
              <span className="overline-text text-black tracking-[0.2em]">|02| DIAGNÓSTICO DE ROSTRO</span>
              <h1 className="font-display text-[24px] font-light text-black">Tómate una selfie</h1>
              <p className="font-sans text-[11px] text-mid-gray">
                Sin filtros. Buena iluminación. Cabello recogido.
              </p>
            </div>

            <div className="flex justify-center">
              <button 
                onClick={triggerCamera}
                className="w-48 h-48 rounded-full border border-mid-gray flex items-center justify-center relative overflow-hidden group hover:border-black transition-colors"
              >
                {selfiePreviewUrl ? (
                  <img src={selfiePreviewUrl} alt="Selfie preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-light-gray flex items-center justify-center group-hover:bg-off-white transition-colors">
                    <Camera className="w-8 h-8 text-mid-gray group-hover:text-black transition-colors" />
                  </div>
                )}
                
                {selfiePreviewUrl && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                )}
              </button>
            </div>

            <div className="flex justify-center gap-6">
              <span className="font-sans text-[10px] tracking-[0.15em] text-success uppercase">BUENA LUZ</span>
              <span className="font-sans text-[10px] tracking-[0.15em] text-success uppercase">ROSTRO CENTRADO</span>
            </div>

            <div className="flex items-start gap-3 px-4 py-4 bg-off-white/50 border border-light-gray/50">
              <ShieldCheck className="w-4 h-4 text-mid-gray shrink-0 mt-0.5" />
              <p className="font-sans text-[10px] text-mid-gray text-left leading-relaxed">
                <span className="text-black font-medium">Tu privacidad nos importa.</span> Sólo procesamos tu foto con IA y no se almacena para garantizar tu seguridad.
              </p>
            </div>
          </motion.div>
        )}

        <div className="mt-auto pb-12">
          {step === 1 ? (
            <Button 
              fullWidth 
              disabled={selectedOption === null}
              onClick={handleNext}
            >
              SIGUIENTE
            </Button>
          ) : (
            <div className="flex flex-col gap-3">
              {selfiePreviewUrl ? (
                <Button fullWidth onClick={handleNext}>ANALIZAR CON IA</Button>
              ) : (
                <>
                  <Button fullWidth onClick={triggerCamera}>
                    <Camera className="w-4 h-4 mr-2" /> TOMAR FOTO
                  </Button>
                  <Button variant="secondary" fullWidth onClick={triggerGallery}>
                    <Upload className="w-4 h-4 mr-2" /> SUBIR DE LA GALERÍA
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
