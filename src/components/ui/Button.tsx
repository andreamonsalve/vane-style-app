import React from 'react';
import { cn } from '@/src/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', fullWidth = false, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center transition-colors duration-200 overline-text py-3.5 px-6 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-40 disabled:pointer-events-none";

    const variants = {
      primary: "border border-black bg-white text-black hover:bg-black hover:text-white",
      secondary: "border border-mid-gray bg-white text-dark-gray hover:border-black hover:text-black",
      outline: "border border-black bg-transparent text-black hover:bg-black hover:text-white",
      text: "border-none bg-transparent text-black underline underline-offset-4 p-0 hover:text-dark-gray"
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          fullWidth && "w-full",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
