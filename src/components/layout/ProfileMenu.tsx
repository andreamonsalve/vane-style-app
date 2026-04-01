import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/src/contexts/AuthContext';
import { 
  X, UserCircle, Key, FileText, Shield, 
  HelpCircle, LogOut, Trash2, CreditCard
} from 'lucide-react';

interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileMenu = ({ isOpen, onClose }: ProfileMenuProps) => {
  const { user, signOut } = useAuth();
  
  const handleLogout = async () => {
    try {
      await signOut();
      onClose();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm("¿Estás segura de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.")) {
      alert("Para eliminar tu cuenta, por favor contacta a soporte o implementa el flujo de eliminación en tu proveedor de Auth.");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-[85%] max-w-[400px] bg-white z-[70] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-light-gray">
              <span className="overline-text text-black">TU PERFIL</span>
              <button onClick={onClose} className="text-mid-gray hover:text-black">
                <X size={20} />
              </button>
            </div>
            
            {/* Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
              
              {/* User Info */}
              <div className="flex flex-col items-center text-center space-y-3">
                <UserCircle size={64} strokeWidth={1} className="text-mid-gray bg-off-white rounded-full p-2" />
                <div>
                  <h3 className="font-display text-[18px] text-black">
                    {user?.user_metadata?.full_name || 'Usuaria de Vane Style'}
                  </h3>
                  <p className="font-sans text-[13px] text-dark-gray">
                    {user?.email}
                  </p>
                </div>
              </div>
              
              {/* Subscription Details */}
              <div className="bg-light-gray p-4 space-y-3 border border-off-white">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard size={16} className="text-black" />
                  <span className="overline-text text-black">SUSCRIPCIÓN ACTUAL</span>
                </div>
                <div className="space-y-2 font-sans text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-dark-gray">Plan</span>
                    <span className="text-black font-medium">Básico (Gratis)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-gray">Costo</span>
                    <span className="text-black font-medium">$0 / mes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-gray">Vigencia</span>
                    <span className="text-black font-medium">Ilimitado</span>
                  </div>
                </div>
                <button className="w-full mt-3 border border-black py-2 text-[10px] tracking-[0.1em] uppercase hover:bg-black hover:text-white transition-colors">
                  MEJORAR PLAN
                </button>
              </div>

              {/* Menu Links */}
              <div className="space-y-4">
                <button className="w-full text-left flex items-center gap-3 py-2 text-[13px] font-sans text-charcoal hover:text-black group">
                  <Key size={18} strokeWidth={1.5} className="group-hover:text-black" />
                  Cambiar contraseña
                </button>
                <button className="w-full text-left flex items-center gap-3 py-2 text-[13px] font-sans text-charcoal hover:text-black group">
                  <FileText size={18} strokeWidth={1.5} className="group-hover:text-black" />
                  Condiciones de uso
                </button>
                <button className="w-full text-left flex items-center gap-3 py-2 text-[13px] font-sans text-charcoal hover:text-black group">
                  <Shield size={18} strokeWidth={1.5} className="group-hover:text-black" />
                  Políticas de privacidad
                </button>
                <button className="w-full text-left flex items-center gap-3 py-2 text-[13px] font-sans text-charcoal hover:text-black group">
                  <HelpCircle size={18} strokeWidth={1.5} className="group-hover:text-black" />
                  Ayuda / Soporte
                </button>
              </div>

            </div>

            {/* Sticky Bottom Actions */}
            <div className="p-6 border-t border-light-gray space-y-4 bg-white pb-safe">
              <button 
                onClick={handleLogout}
                className="w-full text-left flex items-center gap-3 py-2 text-[13px] font-sans text-charcoal hover:text-black"
              >
                <LogOut size={18} strokeWidth={1.5} />
                Cerrar Sesión
              </button>
              <button 
                onClick={handleDeleteAccount}
                className="w-full text-left flex items-center gap-3 py-2 text-[13px] font-sans text-error hover:text-red-700"
              >
                <Trash2 size={18} strokeWidth={1.5} />
                Eliminar cuenta
              </button>
            </div>
            
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
