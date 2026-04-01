import React from 'react';
import { motion } from 'motion/react';
import { Button } from '@/src/components/ui/Button';

const OUTFITS = [
  {
    id: 1,
    title: 'PODER Y AUTORIDAD',
    purpose: 'Ideal para reuniones de directorio o presentaciones clave.',
    image: '/images/poder-autoridad-banner.png',
    items: ['Blazer Negro', 'Camisa Blanca', 'Pantalón Sastre'],
  },
  {
    id: 2,
    title: 'CERCANÍA Y CREATIVIDAD',
    purpose: 'Para eventos de networking o sesiones creativas.',
    image: '/images/cercania-creatividad-banner.png',
    items: ['Vestido Midi', 'Botines Cuero', 'Accesorios Dorados'],
  },
];

export const Outfits = () => {
  return (
    <div className="pb-24">
      <header className="px-6 pt-12 mb-12">
        <span className="overline-text text-mid-gray mb-2 block">ESTRENA SIN GASTAR</span>
        <h1 className="display-lg">TUS OUTFITS</h1>
        <p className="body text-dark-gray mt-4">
          Combinaciones inteligentes basadas en tu closet, tu diagnóstico y tu propósito de hoy.
        </p>
      </header>

      <div className="space-y-24">
        {OUTFITS.map((outfit) => (
          <motion.div 
            key={outfit.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="aspect-[2/3] w-full overflow-hidden">
              <img 
                src={outfit.image} 
                alt={outfit.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="px-6 space-y-4">
              <div className="space-y-2">
                <span className="overline-text text-black border border-black px-2 py-0.5 inline-block">PROPÓSITO</span>
                <h2 className="display-md">{outfit.title}</h2>
                <p className="body text-dark-gray italic">{outfit.purpose}</p>
              </div>
              
              <div className="pt-4 border-t border-light-gray">
                <span className="overline-text text-mid-gray block mb-4">PRENDAS UTILIZADAS</span>
                <div className="flex flex-wrap gap-2">
                  {outfit.items.map((item) => (
                    <span key={item} className="caption-text bg-off-white px-3 py-1.5">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <Button className="flex-1">USAR HOY</Button>
                <Button variant="secondary" className="flex-1">GUARDAR</Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-24 px-6 text-center">
        <h3 className="display-md mb-4">¿QUIERES MÁS OPCIONES?</h3>
        <p className="body text-dark-gray mb-8">
          Sube más prendas a tu closet para que la IA pueda generar combinaciones infinitas.
        </p>
        <Button variant="text">IR AL CLOSET &gt;</Button>
      </div>
    </div>
  );
};
