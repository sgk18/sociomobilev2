"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Clock, Users, Heart } from "lucide-react";
import type { FetchedEvent } from "@/context/EventContext";
import { formatDateShort, formatTime, getDaysUntil, isDeadlinePassed } from "@/lib/dateUtils";

export default function EventCard({ event, compact }: { event: FetchedEvent; compact?: boolean }) {
  const daysLeft = getDaysUntil(event.registration_deadline);
  const closed = isDeadlinePassed(event.registration_deadline);
  const isFree = !event.registration_fee || event.registration_fee === 0;

  // Compact variant for profile registrations
  if (compact) {
    return (
      <Link href={`/event/${event.event_id}`} className="flex gap-3 items-center p-3 bg-white rounded-[var(--radius)] shadow-[var(--shadow-xs)] animate-fade-up group">
        <div className="relative w-16 h-16 rounded-[var(--radius-sm)] overflow-hidden shrink-0 bg-gray-100">
          {(event.banner_url || event.event_image_url) ? (
            <Image src={(event.banner_url || event.event_image_url)!} alt={event.title} fill className="object-cover" sizes="64px" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)] to-[#1a6bdb] flex items-center justify-center">
              <span className="text-white font-bold text-sm">{event.title.charAt(0)}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-extrabold leading-tight line-clamp-1">{event.title}</h4>
          <p className="text-[11px] font-medium text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
            <Clock size={10} /> {formatDateShort(event.event_date)}
            {event.event_time && ` · ${formatTime(event.event_time)}`}
          </p>
          {event.venue && (
            <p className="text-[11px] text-[var(--color-text-light)] mt-0.5 flex items-center gap-1 truncate">
              <MapPin size={10} /> {event.venue}
            </p>
          )}
        </div>
        <div className="shrink-0">
          {closed ? (
            <span className="tag tag-closed">Closed</span>
          ) : isFree ? (
            <span className="tag tag-free">Free</span>
          ) : (
            <span className="tag tag-paid">₹{event.registration_fee}</span>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/event/${event.event_id}`} className="card block animate-fade-up group">
      {/* Banner */}
      <div className="relative aspect-[16/9] bg-gray-100 overflow-hidden">
        {event.event_image_url || event.banner_url ? (
          <Image
            src={(event.banner_url || event.event_image_url)!}
            alt={event.title}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
            sizes="(max-width:480px) 100vw, 50vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center">
            <span className="text-white/50 text-4xl font-black">
              {event.title.charAt(0)}
            </span>
          </div>
        )}

        {/* Top badges */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5 flex-wrap">
          {isFree ? (
            <span className="tag tag-free">FREE</span>
          ) : (
            <span className="tag tag-paid">₹{event.registration_fee}</span>
          )}
          {event.category && (
            <span className="tag bg-white/90 text-[var(--color-secondary)]">
              {event.category}
            </span>
          )}
        </div>

        {/* Urgency strip */}
        {!closed && daysLeft !== null && daysLeft <= 3 && daysLeft >= 0 && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 py-2.5">
            <span className="text-[11px] font-bold text-white flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse-soft" />
              {daysLeft === 0 ? "Last day to register!" : `${daysLeft} day${daysLeft > 1 ? "s" : ""} left`}
            </span>
          </div>
        )}
        {closed && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2.5">
            <span className="text-[11px] font-bold text-red-300">Registration closed</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3">
        <h3 className="text-[15px] font-extrabold leading-snug line-clamp-1">{event.title}</h3>
        <p className="mt-0.5 text-[12px] font-medium text-[var(--color-text-muted)] line-clamp-1">
          {event.organizing_dept || event.fest || event.category || "Campus Event"}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-[var(--color-text-light)]">
          <span className="flex items-center gap-1">
            <Clock size={11} className="text-[var(--color-primary)]" />
            {formatDateShort(event.event_date)}
            {event.event_time && ` · ${formatTime(event.event_time)}`}
          </span>
          {event.venue && (
            <span className="flex items-center gap-1 truncate max-w-[140px]">
              <MapPin size={11} className="text-[var(--color-primary)]" /> {event.venue}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2">
          {event.fest && (
            <span className="chip bg-[var(--color-primary-light)] text-[var(--color-primary)] text-[10px] font-bold">
              {event.fest}
            </span>
          )}
          {event.participants_per_team > 1 && (
            <span className="flex items-center gap-1 text-[11px] text-[var(--color-text-light)]">
              <Users size={11} /> Team of {event.participants_per_team}
            </span>
          )}
          {event.total_participants != null && event.total_participants > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-[var(--color-text-light)] ml-auto">
              <Heart size={11} /> {event.total_participants}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
