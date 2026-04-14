import { type ReactNode } from 'react';

// Static map — prevents Tailwind from purging dynamically constructed class names.
const MAX_WIDTH_CLASSES = {
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
} as const;

type MaxWidth = keyof typeof MAX_WIDTH_CLASSES;

interface PageLayoutProps {
  children: ReactNode;
  /** Max-width constraint applied to the content container */
  maxWidth?: MaxWidth;
  /** Additional Tailwind classes appended to the wrapper */
  className?: string;
}

/**
 * Consistent page-level wrapper that provides uniform horizontal padding,
 * vertical spacing, bottom padding for the mobile nav, and an optional
 * max-width constraint across all views.
 */
export default function PageLayout({
  children,
  maxWidth = '7xl',
  className = '',
}: PageLayoutProps) {
  const maxWidthClass = MAX_WIDTH_CLASSES[maxWidth];

  return (
    <div
      className={`px-4 py-6 md:p-10 pb-28 md:pb-10 ${maxWidthClass} mx-auto min-h-screen ${className}`}
    >
      {children}
    </div>
  );
}
