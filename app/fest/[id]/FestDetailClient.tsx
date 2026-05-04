"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useEvents, type Fest, type FetchedEvent } from "@/context/EventContext";
import EventCard from "@/components/EventCard";
import {
  ArrowLeftIcon as ArrowLeft,
} from "@/components/icons";
import { PWA_API_URL } from "@/lib/apiConfig";

export default function FestDetailClient({ festId }: { festId: string }) {
  const router = useRouter();
  const { allEvents, isLoading: ctxLoading } = useEvents();

  const [fest, setFest] = useState<Fest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!festId) {
      setLoading(false);
      return;
    }

    // Fests are not globally in context, so we fetch directly
    fetch(`${PWA_API_URL}/fests/${festId}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setFest(d))
      .catch(() => setError("Fest not found"))
      .finally(() => setLoading(false));
  }, [festId, allEvents]);

  if (loading || ctxLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !fest) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
        <p className="font-bold text-lg">{error || "Fest not found"}</p>
        <Link href="/fests" className="btn btn-primary btn-sm">
          Back to fests
        </Link>
      </div>
    );
  }

  const festEvents = allEvents.filter((e) => e.fest === festId);

  return (
    <div className="pwa-page pb-24 pt-[calc(var(--nav-height)+var(--safe-top)+16px)]">
      <div className="px-4 mb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)]"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <div className="relative aspect-[16/9] mx-4 rounded-2xl overflow-hidden shadow-lg">
        <Image
          src={fest.banner_url || "https://placehold.co/800x450/011F7B/ffffff?text=Fest"}
          alt={fest.fest_title}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h1 className="text-2xl font-black text-white">{fest.fest_title}</h1>
        </div>
      </div>

      <div className="px-4 mt-6">
        <div className="card p-5">
          <h2 className="text-lg font-bold mb-2">About the Fest</h2>
          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
            {fest.description || "No description available."}
          </p>
        </div>
      </div>

      <div className="px-4 mt-8">
        <h2 className="text-xl font-black mb-4 px-1">Events in this Fest</h2>
        {festEvents.length > 0 ? (
          <div className="space-y-4">
            {festEvents.map((event) => (
              <EventCard key={event.event_id} event={event} />
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center text-[var(--color-text-muted)]">
            No events found for this fest yet.
          </div>
        )}
      </div>
    </div>
  );
}
