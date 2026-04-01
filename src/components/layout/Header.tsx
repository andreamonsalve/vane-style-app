import React, { useState } from 'react';
import { User } from 'lucide-react';
import { ProfileMenu } from './ProfileMenu';

export const Header = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-light-gray z-40 px-6 h-16">
        <div className="flex justify-between items-center h-full max-w-lg mx-auto">
          {/* Logo */}
          <img 
            src="/images/logo_vane_header.svg" 
            alt="Vane Style" 
            className="h-6 w-auto"
          />
          
          {/* Profile Button */}
          <button 
            onClick={() => setIsProfileOpen(true)}
            className="p-2 -mr-2 text-charcoal hover:text-black transition-colors"
          >
            <User size={22} strokeWidth={1.5} />
          </button>
        </div>
      </header>
      
      {/* Profile Sidebar / Drawer */}
      <ProfileMenu 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />
    </>
  );
};
