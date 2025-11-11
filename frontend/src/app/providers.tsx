'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ThemeProvider } from '@/lib/theme-context';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable all automatic refetching to conserve Browserless API units
            staleTime: Infinity, // Never consider data stale
            refetchOnWindowFocus: false, // Don't refetch when window gains focus
            refetchOnMount: false, // Don't refetch when component mounts
            refetchOnReconnect: false, // Don't refetch on network reconnect
            retry: 1, // Only retry once on failure
          },
        },
      })
  );

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
}
