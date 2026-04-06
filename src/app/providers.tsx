"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        dedupingInterval: 5000,
        errorRetryCount: 3,
        shouldRetryOnError: (err: unknown) => {
          const status = (err as { status?: number })?.status;
          if (status && status >= 400 && status < 500) return false;
          return true;
        },
      }}
    >
      <SessionProvider>{children}</SessionProvider>
    </SWRConfig>
  );
}
