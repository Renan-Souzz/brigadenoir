import { type ReactNode } from 'react';

type StatCardVariant = 'border-left' | 'bento' | 'flat' | 'inline';

interface StatCardProps {
  label: string;
  value: string | number;
  /** Optional icon to display */
  icon?: ReactNode;
  /** Optional dot or border color (e.g. 'bg-primary', 'border-secondary') */
  color?: string;
  /** Optional text color for the value */
  textColor?: string;
  /** Visual style variant */
  variant?: StatCardVariant;
  /** Additional Tailwind classes */
  className?: string;
  /** Whether the card should pulse (emergency/success status) */
  pulsing?: boolean;
  /** Optional click handler */
  onClick?: () => void;
}

/**
 * Unified StatCard component for displaying metrics and statuses.
 * Replaces StatItem, StatCard (local), SummaryItem, StatBox, and StatusBento.
 */
export default function StatCard({
  label,
  value,
  icon,
  color = 'text-primary',
  textColor = 'text-on-surface',
  variant = 'flat',
  className = '',
  pulsing = false,
  onClick,
}: StatCardProps) {
  // Styles baseados no sistema de design 'Noir'
  const glassEffect = "backdrop-blur-xl border border-outline-variant/10 shadow-lg";
  const hoverEffect = "hover:scale-[1.02] hover:bg-surface-container-highest/20 hover:border-primary/20 transition-all duration-500";
  const pulseClass = pulsing ? (color.includes('error') ? 'animate-pulse shadow-[0_0_20px_rgba(var(--md-sys-color-error-rgb),0.3)]' : 'animate-pulse-subtle shadow-[0_0_15px_rgba(var(--md-sys-color-primary-rgb),0.2)]') : '';
  
  if (variant === 'bento') {
    return (
      <div 
        onClick={onClick}
        className={`
        relative overflow-hidden
        bg-surface-container-low/40 ${glassEffect} ${hoverEffect}
        p-6 rounded-3xl flex flex-col justify-between aspect-square 
        ${onClick ? 'cursor-pointer active:scale-95' : ''}
        ${className}
      `}>
        {/* Glow de Fundo Sutil */}
        <div className={`absolute -top-10 -right-10 w-32 h-32 blur-[80px] opacity-20 rounded-full ${color.replace('text-', 'bg-')}`} />
        
        <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-surface-container-highest/50 mb-4 ${color}`}>
          {icon}
        </div>
        
        <div className="relative z-10">
          <p className={`text-4xl font-black tracking-tighter leading-none mb-2 ${textColor}`}>{value}</p>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant/70 leading-relaxed">
            {label}
          </p>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div 
        onClick={onClick}
        className={`flex flex-col ${className} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity active:scale-95' : ''}`}
      >
        <p className="text-[9px] uppercase tracking-[0.2em] font-black text-on-surface-variant/60 mb-1.5">{label}</p>
        <div className="flex items-center gap-2">
          {color && color.startsWith('bg-') && (
            <span className={`w-1.5 h-1.5 rounded-full ${color} shadow-[0_0_8px_rgba(0,0,0,0.3)]`}></span>
          )}
          <span className={`text-xs font-black tracking-tight ${textColor}`}>{value}</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className={`
      relative overflow-hidden
      bg-surface-container-low/60 ${glassEffect} ${hoverEffect}
      p-5 rounded-3xl flex flex-col justify-center min-h-[100px]
      ${variant === 'border-left' ? `border-l-4 ${color.replace('text-', 'border-')}` : ''}
      ${pulseClass}
      ${onClick ? 'cursor-pointer active:scale-95' : ''}
      ${className}
    `}>
      {/* Glow de Fundo sutil para cards flats */}
      <div className={`absolute top-0 right-0 w-20 h-20 blur-[50px] opacity-10 rounded-full ${color.replace('text-', 'bg-')}`} />
      
      <div className="flex items-center gap-3 mb-1.5">
        {icon && <div className={`${color} opacity-80 shrink-0 scale-90`}>{icon}</div>}
        <span className="text-[9px] font-black text-on-surface-variant/60 tracking-[0.15em] uppercase truncate">{label}</span>
      </div>
      <div className={`text-2xl font-black tracking-tighter ${textColor}`}>{value}</div>
    </div>
  );
}
