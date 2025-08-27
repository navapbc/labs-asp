'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes/dist/types';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Extract theme-related props to prevent SSR mismatches
  const { enableSystem, defaultTheme, ...otherProps } = props;

  console.log('ThemeProvider initialized with props:', {
    enableSystem,
    defaultTheme,
    ...otherProps,
  });

  return (
    <NextThemesProvider
      {...otherProps}
      // Force client-side theme detection to prevent hydration mismatches
      enableSystem={false}
      defaultTheme="light"
      attribute="class"
      disableTransitionOnChange
      storageKey="theme"
    >
      {children}
    </NextThemesProvider>
  );
}
