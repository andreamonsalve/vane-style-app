import React from 'react';
import { cn } from '@/src/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'vane';
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', fullWidth = false, ...props }, ref) => {
    const baseStyles = "btn";

    const variants = {
      primary: "btn-primary",
      secondary: "btn-secondary",
      outline: "btn-secondary", // Secondary in v3 is outline
      text: "btn-text",
      vane: "btn-vane" // Adding vane option
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant as keyof typeof variants] || variants.primary,
          fullWidth && "btn-full",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
