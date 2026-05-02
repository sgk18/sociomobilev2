"use client";

import { useEffect } from "react";
import { RefreshCcwIcon, AlertTriangleIcon } from "@/components/icons";

/**
 * Global error boundary to catch runtime crashes, including ChunkLoadErrors.
 * ChunkLoadErrors happen when Next.js tries to load a code-split script that
 * is missing on the server (e.g. after a redeploy).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Check if it's a ChunkLoadError
    const isChunkError =
      error.name === "ChunkLoadError" ||
      error.message.includes("Loading chunk") ||
      error.message.includes("Failed to fetch dynamically imported module");

    if (isChunkError) {
      // For ChunkLoadErrors, a simple reload is the only way to recover
      // and get the latest asset hashes from the server.
      window.location.reload();
    }

    console.error("Uncaught Runtime Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] p-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600">
        <AlertTriangleIcon size={40} />
      </div>
      
      <h2 className="text-[24px] font-black tracking-tight text-[var(--color-text)]">
        Something went wrong
      </h2>
      
      <p className="mt-2 max-w-[280px] text-[14px] leading-relaxed text-[var(--color-text-muted)]">
        The application encountered an unexpected error. This usually happens after an update.
      </p>

      <div className="mt-8 flex w-full max-w-[240px] flex-col gap-3">
        <button
          onClick={() => reset()}
          className="btn btn-primary flex w-full items-center justify-center gap-2"
        >
          Try again
        </button>
        
        <button
          onClick={() => window.location.reload()}
          className="btn btn-ghost flex w-full items-center justify-center gap-2"
        >
          <RefreshCcwIcon size={16} />
          Force Refresh
        </button>
      </div>

      <div className="mt-12 text-[10px] font-medium uppercase tracking-widest text-[var(--color-text-light)]">
        Error Digest: {error.digest || "N/A"}
      </div>
    </div>
  );
}
