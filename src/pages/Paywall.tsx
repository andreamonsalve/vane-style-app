import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { X, Check } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';

export const Paywall = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white px-6 pt-8 pb-12 flex flex-col">
      <div className="flex justify-end">
        <button onClick={() => navigate('/')} className="p-2">
          <X className="w-6 h-6 text-mid-gray" />
        </button>
      </div>

      <div className="text-center space-y-3 mt-4 mb-12">
        <h1 className="font-display text-[36px] font-light text-black leading-none">
          Viste con<br/>propósito.
        </h1>
        <p className="font-sans text-[12px] text-dark-gray max-w-[240px] mx-auto leading-relaxed">
          Acceso completo. Diagnóstico + closet + outfits + comunidad.
        </p>
      </div>

      <div className="flex gap-[1px] bg-light-gray border border-light-gray mb-12">
        <div className="flex-1 bg-white p-6 text-center space-y-2">
          <span className="overline-text text-[9px] text-mid-gray tracking-[0.15em]">MENSUAL</span>
          <p className="font-display text-[32px] text-black leading-none">$9.99</p>
          <p className="font-sans text-[11px] text-mid-gray">/mes</p>
        </div>
        <div className="flex-1 bg-white p-6 text-center space-y-2 relative border border-black">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white px-3 py-1 overline-text text-[8px] tracking-[0.2em] whitespace-nowrap">
            AHORRA 33%
          </div>
          <span className="overline-text text-[9px] text-mid-gray tracking-[0.15em] mt-2 block">ANUAL</span>
          <p className="font-display text-[32px] text-black leading-none">$6.66</p>
          <p className="font-sans text-[11px] text-mid-gray">/mes</p>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        {[
          'Diagnóstico completo + simbología',
          'Closet virtual ilimitado',
          'Outfits con propósito + IA',
          'Comunidad + swap entre usuarias',
          'Mensaje diario de Vane'
        ].map(f => (
          <div key={f} className="flex items-center gap-4 py-3 border-b border-light-gray last:border-0">
            <div className="w-4 h-4 rounded-full border border-success flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-success" />
            </div>
            <span className="font-sans text-[13px] text-charcoal">{f}</span>
          </div>
        ))}
      </div>

      <div className="mt-12 space-y-4">
        <Button 
          fullWidth 
          className="bg-black text-white border-black hover:bg-charcoal"
          onClick={() => navigate('/')}
        >
          PRUEBA 7 DÍAS GRATIS
        </Button>
        <p className="font-sans text-[10px] text-mid-gray text-center tracking-[0.05em]">
          Sin cargos hasta que termine la prueba
        </p>
      </div>
    </div>
  );
};
