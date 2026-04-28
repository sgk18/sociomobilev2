"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useEvents, type Fest, type FetchedEvent } from "@/context/EventContext";
import EventCard from "@/components/EventCard";
import {
  ArrowLeftIcon as ArrowLeft,
  CalendarIcon as CalendarDays,
  MapPinIcon as MapPin,
  TagIcon as Tag,
  GlobeIcon as Globe,
  Loader2Icon as Loader2,
  AlertCircleIcon as AlertCircle,
  SearchIcon as Search,
} from "@/components/icons";
import { Button } from "@/components/Button";
import { formatDateRange } from "@/lib/dateUtils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function FestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const festId = params?.id ? String(params.id) : null;
  const { allEvents, isLoading: ctxLoading } = useEvents();

  const [fest, setFest] = useState<Fest | null>(null);
  const [events, setEvents] = useState<FetchedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!festId) {
      setError("Invalid fest");
      setLoading(false);
      return;
    }

    fetch(`/api/pwa/fests/${festId}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        const f = d.fest || d.data || d;
        if (!f || typeof f !== "object") throw new Error("Invalid fest data");

        // Normalize aliases for template usage
        f.name = f.name || f.fest_title;
        f.start_date = f.start_date || f.opening_date;
        f.end_date = f.end_date || f.closing_date;
        f.image_url = f.image_url || f.fest_image_url;
        f.department = f.department || f.organizing_dept;
        f.banner_url = f.banner_url || f.fest_image_url;
        setFest(f);

        // Events for this fest: match by slugifying event.fest
        const festSlug = String(f.slug || f.fest_id || "").toLowerCase();
        const festEvents = allEvents.filter((e) => {
          if (!e.fest) return false;
          const eventFestSlug = String(e.fest)
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");
          return eventFestSlug === festSlug;
        });
        if (festEvents.length > 0) {
          setEvents(festEvents);
        } else if (f.events || d.events) {
          setEvents(f.events || d.events);
        }
      })
      .catch(() => setError("Fest not found"))
      .finally(() => setLoading(false));
  }, [festId, allEvents, ctxLoading]);

  const filtered = search.trim()
    ? events.filter(
        (e) =>
          e.title?.toLowerCase().includes(search.toLowerCase()) ||
          e.category?.toLowerCase().includes(search.toLowerCase())
      )
    : events;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (error || !fest) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
        <AlertCircle size={40} className="text-red-400" />
        <p className="font-bold text-lg">{error || "Not found"}</p>
        <Link href="/fests" className="block mt-2">
          <Button variant="primary" size="sm">
            Back to Fests
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pwa-page pt-[calc(var(--nav-height)+var(--safe-top)+16px)]">


      {/* Banner */}
      <div className="relative aspect-[2/1] mx-4 rounded-2xl overflow-hidden bg-gray-100">
        <Image
          src={
            fest.banner_url ||
            fest.image_url ||
            "https://placehold.co/800x400/e2e8f0/94a3b8?text=Fest"
          }
          alt={fest.name || "Fest"}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h1 className="text-xl font-extrabold text-white drop-shadow-lg">
            {fest.name}
          </h1>
          {fest.department && (
            <p className="text-xs text-white/80">{fest.department}</p>
          )}
        </div>
      </div>

      {/* Info pills */}
      <div className="px-4 mt-3 flex flex-wrap gap-2">
        {(fest.start_date || fest.end_date) && (
          <div className="chip bg-blue-50 text-blue-700">
            <CalendarDays size={12} />
            {formatDateRange(fest.start_date, fest.end_date)}
          </div>
        )}
        {fest.venue && (
          <div className="chip bg-orange-50 text-orange-700">
            <MapPin size={12} /> {fest.venue}
          </div>
        )}
        {fest.category && (
          <div className="chip bg-gray-100 text-gray-700">
            <Tag size={12} /> {fest.category}
          </div>
        )}
      </div>

      {/* Description */}
      {fest.description && (
        <div className="px-4 mt-4">
          <div className="card p-4">
            <p className="text-sm text-[var(--color-text-muted)] whitespace-pre-wrap leading-relaxed">
              {fest.description}
            </p>
          </div>
        </div>
      )}

      {/* Events */}
      <div className="px-4 mt-4">
        <h2 className="font-bold text-base mb-2">
          Events{events.length > 0 && ` (${events.length})`}
        </h2>

        {events.length > 3 && (
          <div className="relative mb-3">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              className="input pl-9 text-sm"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {filtered.length > 0 ? (
          <div className="grid gap-3">
            {filtered.map((ev) => (
              <EventCard key={ev.event_id} event={ev} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
            {search ? "No matching events" : "No events yet"}
          </p>
        )}
      </div>
    </div>
  );
}
