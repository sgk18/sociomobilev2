"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import LoadingScreen from "@/components/LoadingScreen";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUserData } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const next = searchParams.get("next") || "/auth";
      
      if (!code) {
        // If no code, maybe it's a hash-based callback or already handled
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await refreshUserData();
          router.replace(next);
        } else {
          router.replace("/auth");
        }
        return;
      }

      try {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;

        if (data.session) {
          await refreshUserData();
          
          // Check if we have a returnTo path in sessionStorage
          const returnTo = sessionStorage.getItem("returnTo");
          if (returnTo) {
            sessionStorage.removeItem("returnTo");
            router.replace(returnTo);
          } else {
            router.replace("/");
          }
        } else {
          router.replace("/auth");
        }
      } catch (err: any) {
        console.error("Auth callback error:", err);
        setError(err.message || "Authentication failed");
        setTimeout(() => router.replace("/auth"), 3000);
      }
    };

    void handleCallback();
  }, [router, searchParams, refreshUserData]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Failed</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <p className="text-sm text-gray-400">Redirecting to login...</p>
      </div>
    );
  }

  return <LoadingScreen />;
}
