"use client";

import LoadingScreen from "@/components/LoadingScreen";

/**
 * Root loading component for Next.js 15 App Router.
 * This will be shown during page transitions if the component isn't ready.
 */
export default function Loading() {
  return <LoadingScreen />;
}
