import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/src/lib/utils';

export const TabBar = () => {
  const navItems = [
    { label: 'INICIO', path: '/' },
    { label: 'DIAGNÓSTICO', path: '/diagnosis' },
    { label: 'CLOSET', path: '/closet' },
    { label: 'OUTFITS', path: '/outfits' },
  ];

  return (
    <nav aria-label="Navegación principal" className="fixed bottom-0 left-0 right-0 bg-white border-t border-light-gray z-50 px-4 pb-safe">
      <div className="flex justify-between items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            aria-label={item.label}
            className={({ isActive }) =>
              cn(
                "overline-text text-[10px] tracking-[0.08em] flex flex-col items-center justify-center relative",
                "min-w-[44px] min-h-[44px] px-2",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded-sm",
                isActive ? "text-black font-medium" : "text-mid-gray hover:text-charcoal transition-colors duration-150"
              )
            }
          >
            {({ isActive }) => (
              <>
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-1.5 w-1 h-1 bg-black rounded-full" aria-hidden="true" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
