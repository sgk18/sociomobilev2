import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import { EventProvider } from "@/context/EventContext";
import { NotificationProvider } from "@/context/NotificationContext";
import type { FetchedEvent } from "@/context/EventContext";
import AppShell from "./AppShell";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const metadata: Metadata = {
  title: "SOCIO – Campus Events",
  description: "Discover, register and stay updated on campus events.",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/applogo.png", type: "image/png" }],
    apple: [{ url: "/applogo.png", type: "image/png" }],
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "SOCIO" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#154CB3",
};

async function fetchEvents(): Promise<FetchedEvent[]> {
  try {
    const res = await fetch(`${API_URL}/api/events`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.events ?? data ?? [];
  } catch {
    return [];
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const events = await fetchEvents();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..800;1,9..40,300..800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/applogo.png" type="image/png" />
        <link rel="shortcut icon" href="/applogo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/applogo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if('serviceWorker' in navigator){
                window.addEventListener('load', async () => {
                  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(registrations.map((registration) => registration.unregister()));
                    const keys = await caches.keys();
                    await Promise.all(keys.map((key) => caches.delete(key)));
                    return;
                  }
                  const registration = await navigator.serviceWorker.register('/sw.js');
                  if (registration.waiting) {
                    registration.waiting.postMessage('SKIP_WAITING');
                  }

                  navigator.serviceWorker.ready.then(() => {
                    if (navigator.serviceWorker.controller) {
                      navigator.serviceWorker.controller.postMessage('WARM_CACHE');
                    }
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body>
        <AuthProvider>
          <EventProvider initialEvents={events}>
            <NotificationProvider>
              <AppShell>{children}</AppShell>
            </NotificationProvider>
          </EventProvider>
        </AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: "var(--radius)",
              fontSize: "13px",
              fontWeight: 600,
              padding: "10px 16px",
            },
          }}
        />
      </body>
    </html>
  );
}
