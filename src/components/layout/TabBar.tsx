import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/src/lib/utils';

export const TabBar = () => {
  const navItems = [
    { label: 'HOME', path: '/' },
    { label: 'DIAGNÓSTICO', path: '/diagnosis' },
    { label: 'CLOSET', path: '/closet' },
    { label: 'OUTFITS', path: '/outfits' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-light-gray z-50 px-4 pb-safe">
      <div className="flex justify-between items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "overline-text text-[10px] tracking-[0.08em] flex flex-col items-center justify-center h-full relative",
                isActive ? "text-black font-medium" : "text-mid-gray"
              )
            }
          >
            {({ isActive }) => (
              <>
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-2 w-1 h-1 bg-black rounded-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
