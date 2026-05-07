import React, { ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'error' | 'error-solid';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

/**
 * Manually defined props to ensure absolute compatibility with TypeScript 
 * and avoid inheritance issues with differing React/Tailwind environments.
 */
interface ButtonProps {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: any;
  disabled?: boolean;
  key?: string | number;
  [key: string]: any;
}

/**
 * Unified Button component with Brigade Noir styling.
 * Premium glassmorphism design with subtle borders and smooth transitions.
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  className = '',
  loading = false,
  type = 'button',
  onClick,
  disabled = false,
  ...rest
}: ButtonProps) {
  // Config cores baseadas no variant
  const variants = {
    primary: {
      wrapper: 'shadow-[0_0_15px_-5px_rgba(0,180,216,0.4)] hover:shadow-[0_0_25px_-5px_rgba(0,180,216,0.6)]',
      gradient: 'from-primary via-secondary to-primary',
      inner: 'bg-surface-container-highest',
      text: 'text-primary'
    },
    secondary: {
      wrapper: 'shadow-[0_0_15px_-5px_rgba(var(--secondary),0.4)] hover:shadow-[0_0_25px_-5px_rgba(var(--secondary),0.6)]',
      gradient: 'from-secondary via-primary to-secondary',
      inner: 'bg-surface-container-highest',
      text: 'text-secondary'
    },
    outline: {
      wrapper: 'shadow-none hover:shadow-[0_0_15px_-5px_rgba(0,180,216,0.2)]',
      gradient: 'from-outline-variant/30 to-outline-variant/30 group-hover:from-primary/30 group-hover:to-primary/30',
      inner: 'bg-surface-container',
      text: 'text-on-surface'
    },
    ghost: {
      wrapper: 'shadow-none hover:shadow-[0_0_15px_-5px_rgba(0,180,216,0.1)]',
      gradient: 'from-transparent to-transparent group-hover:from-primary/10 group-hover:to-primary/10',
      inner: 'bg-transparent group-hover:bg-surface-container-highest/50',
      text: 'text-on-surface-variant group-hover:text-primary'
    },
    error: {
      wrapper: 'shadow-[0_0_15px_-5px_rgba(239,68,68,0.4)] hover:shadow-[0_0_25px_-5px_rgba(239,68,68,0.6)]',
      gradient: 'from-red-500 via-red-400 to-red-500',
      inner: 'bg-surface-container-highest',
      text: 'text-red-400'
    },
    'error-solid': {
      wrapper: 'shadow-[0_10px_20px_-5px_rgba(239,68,68,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(239,68,68,0.5)]',
      gradient: 'from-red-600 to-red-500',
      inner: 'bg-red-600 group-hover:bg-red-500',
      text: 'text-white'
    }
  };

  const v = variants[variant] || variants.primary;

  const sizeStyles = {
    sm: 'px-4 py-2 text-[9px]',
    md: 'px-6 py-3 text-[10px]',
    lg: 'px-8 py-4 text-xs',
    xl: 'px-10 py-5 text-sm',
    icon: 'p-2.5 rounded-xl',
  };

  return (
    <button 
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`relative overflow-hidden p-[1px] rounded-2xl active:scale-95 transition-all duration-300 group ${v.wrapper} ${disabled || loading ? 'opacity-50 pointer-events-none' : ''} ${className}`}
      {...rest}
    >
      {/* Animated Gradient Border */}
      <span className={`absolute inset-0 bg-gradient-to-br ${v.gradient} opacity-100 blur-[1px] group-hover:scale-110 transition-transform duration-500`}></span>
      
      {/* Inner Button Surface */}
      <div className={`relative flex items-center justify-center gap-2.5 rounded-2xl font-black uppercase tracking-widest ${v.inner} ${v.text} ${sizeStyles[size]} h-full w-full group-hover:brightness-125 transition-all duration-300`}>
        {loading && (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
        )}
        {!loading && icon && iconPosition === 'left' && icon}
        {children}
        {!loading && icon && iconPosition === 'right' && icon}
      </div>
    </button>
  );
}
