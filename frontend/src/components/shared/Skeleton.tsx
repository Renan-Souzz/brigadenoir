import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
}

/**
 * Premium Skeleton Screen component for progressive loading.
 */
export default function Skeleton({ className = '', variant = 'rect' }: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 w-3/4 rounded-md',
    rect: 'h-32 w-full rounded-2xl',
    circle: 'h-12 w-12 rounded-full'
  };

  return (
    <div 
      className={`
        animate-pulse 
        bg-surface-container-highest/30 
        ${variantClasses[variant]} 
        ${className}
      `}
    />
  );
}

/**
 * Pre-defined skeleton for an Inventory / Task card
 */
export function CardSkeleton() {
  return (
    <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant/10 space-y-4">
      <div className="flex justify-between items-start">
        <Skeleton variant="text" className="w-1/2" />
        <Skeleton variant="circle" className="w-6 h-6" />
      </div>
      <Skeleton variant="rect" className="h-4 w-full" />
      <div className="flex justify-between items-center pt-2">
        <Skeleton variant="text" className="w-1/4" />
        <Skeleton variant="text" className="w-1/4 h-8 rounded-lg" />
      </div>
    </div>
  );
}
