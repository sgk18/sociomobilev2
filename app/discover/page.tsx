"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useEvents } from "@/context/EventContext";
import EventCard from "@/components/EventCard";
import Skeleton from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { Search, X, Filter, ArrowRight, CalendarDays, MapPin, Sparkles } from "lucide-react";
import { formatDateShort, isDeadlinePassed } from "@/lib/dateUtils";
import type { Fest } from "@/context/EventContext";

const ITEMS_PER_PAGE = 10;
const QUICK_CATEGORY_LIMIT = 6;
const GRID_CATEGORY_LIMIT = 4;

export default function DiscoverPage() {
  const { allEvents, isLoading } = useEvents();
  const [search, setSearch] = useState("");
  const [showOpen, setShowOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [fests, setFests] = useState<Fest[]>([]);
  const [festsLoading, setFestsLoading] = useState(true);

  /* Fetch actual fests from API so we get proper fest_id/slug */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/pwa/fests");
        if (res.ok) {
          const data = await res.json();
          const arr = data.fests ?? data ?? [];
          setFests(Array.isArray(arr) ? arr : []);
        }
      } catch {}
      setFestsLoading(false);
    })();
  }, []);

  const categories = useMemo(() => {
    const values = new Set<string>(["All"]);
    if (allEvents.some((event) => !event.registration_fee || event.registration_fee === 0)) {
      values.add("Free");
    }
    allEvents.forEach((event) => {
      const category = event.category?.trim();
      if (category) values.add(category);
    });
    return Array.from(values).slice(0, QUICK_CATEGORY_LIMIT);
  }, [allEvents]);

  const categoryGrid = useMemo(
    () => categories.filter((category) => category !== "All").slice(0, GRID_CATEGORY_LIMIT),
    [categories]
  );

  /* Filter events based on search and open status */
  const filtered = useMemo(() => {
    let list = allEvents;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.venue?.toLowerCase().includes(q) ||
          e.fest?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q)
      );
    }
    if (activeCategory !== "All") {
      if (activeCategory === "Free") {
        list = list.filter((e) => !e.registration_fee || e.registration_fee === 0);
      } else {
        list = list.filter((e) => (e.category || "").toLowerCase() === activeCategory.toLowerCase());
      }
    }
    if (showOpen) {
      list = list.filter((e) => !isDeadlinePassed(e.registration_deadline));
    }
    return list.sort(
      (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
  }, [allEvents, search, activeCategory, showOpen]);

  const allFiltered = filtered;
  const spotlightEvent =
    allFiltered.find((e) => !isDeadlinePassed(e.registration_deadline)) ||
    allFiltered[0] ||
    null;
  const totalPages = Math.ceil(allFiltered.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const displayedEvents = allFiltered.slice(0, startIdx + ITEMS_PER_PAGE);

  /* Auto-scroll for Featured Fests */
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUserInteraction = useCallback(() => {
    pausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;
      if (el.scrollLeft >= maxScroll - 2) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        const card = el.querySelector<HTMLElement>("[data-fest-card]");
        const step = card ? card.offsetWidth + 12 : el.clientWidth;
        el.scrollBy({ left: step, behavior: "smooth" });
      }
    }, 3000);
    return () => clearInterval(id);
  }, [fests]);

  return (
    <div className="pwa-page pt-[calc(var(--nav-height)+var(--safe-top)+4px)] pb-8">
      {/* Header */}
      <div className="px-5 pt-3 pb-2">
        <h1 className="text-[22px] font-extrabold">Discover Events &amp; Fests</h1>
      </div>

      {/* Search + Filter row */}
      <div className="px-5 pb-4 flex items-center gap-2.5">
        <div className="relative group flex-1 min-w-0">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-light)] group-focus-within:text-[var(--color-primary)] transition-colors pointer-events-none z-[1]"
          />
          <input
            type="text"
            placeholder="Search events, fests, venues…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-[44px] pl-[42px] pr-10 text-[14px] bg-white border-[1.5px] border-[var(--color-border)] rounded-[var(--radius)] outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(21,76,179,0.1)] transition-all placeholder:text-[var(--color-text-muted)]"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-light)] hover:text-[var(--color-text)] transition-colors p-1.5 rounded-full hover:bg-black/5 z-[1]"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button
          onClick={() => {
            setShowOpen(!showOpen);
            setCurrentPage(1);
          }}
          className={`shrink-0 btn-active-state flex items-center justify-center gap-1.5 h-[44px] px-4 border text-[12px] font-bold rounded-[var(--radius)] ${
            showOpen
              ? "bg-[var(--color-primary-light)] text-[var(--color-primary)] border-[var(--color-primary)]"
              : "bg-white text-[var(--color-text-muted)] border-[var(--color-border)]"
          }`}
        >
          <Filter size={14} />
          {showOpen ? "Open" : "All"}
        </button>
      </div>

      {/* Quick category chips */}
      {categories.length > 1 && (
        <div className="h-scroll mb-4 gap-2">
          <div className="shrink-0 w-5" aria-hidden />
          {categories.map((category) => {
            const active = category === activeCategory;
            return (
              <button
                key={category}
                onClick={() => {
                  setActiveCategory(category);
                  setCurrentPage(1);
                }}
                className={`chip btn-active-state px-3 py-1.5 text-[12px] font-semibold border ${
                  active
                    ? "chip-active border-[var(--color-primary)]"
                    : "bg-white text-[var(--color-text-muted)] border-[var(--color-border)]"
                }`}
              >
                {category}
              </button>
            );
          })}
          <div className="shrink-0 w-5" aria-hidden />
        </div>
      )}

      {isLoading ? (
        <div className="px-5 space-y-4">
          <Skeleton className="h-52 w-full rounded-[var(--radius-xl)]" count={1} />
          <Skeleton className="h-36 w-full rounded-[var(--radius-lg)]" count={2} />
        </div>
      ) : (
        <>
          {/* Spotlight Hero */}
          {spotlightEvent && (
            <div className="px-5 pb-6">
              <div className="pb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-extrabold tracking-[-0.01em]">Spotlight</h2>
                <Link href="/events" className="text-[12px] font-bold text-[var(--color-primary)] flex items-center gap-1 hover:gap-1.5 transition-all">
                  See All <ArrowRight size={13} />
                </Link>
              </div>

              <Link
                href={`/event/${spotlightEvent.event_id}`}
                className="premium-card group relative block overflow-hidden rounded-[var(--radius-xl)] border-0 shadow-hero"
              >
                <div className="relative aspect-[4/5] bg-[var(--color-primary-light)] overflow-hidden">
                  {spotlightEvent.banner_url || spotlightEvent.event_image_url ? (
                    <Image
                      src={spotlightEvent.banner_url || spotlightEvent.event_image_url || ""}
                      alt={spotlightEvent.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width:480px) 100vw, 420px"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary-dark)] to-[var(--color-primary)] flex items-center justify-center">
                      <span className="text-white font-black text-6xl opacity-30">{spotlightEvent.title.charAt(0)}</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[rgba(6,49,104,0.98)] via-[rgba(6,49,104,0.65)] to-[rgba(6,49,104,0.08)]" />
                  <div className="absolute inset-[1px] rounded-[18px] border border-white/20 bg-gradient-to-b from-white/15 via-transparent to-transparent pointer-events-none" />

                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <span className="chip bg-[var(--color-accent)] text-[var(--color-primary-dark)] text-[10px] font-extrabold uppercase tracking-[0.08em]">
                      Featured Event
                    </span>
                    <h3 className="mt-2 text-[34px] font-extrabold leading-[1.06] tracking-[-0.02em] text-white">
                      {spotlightEvent.title}
                    </h3>
                    <p className="mt-2 text-[12px] font-medium text-white/85 line-clamp-1">
                      {spotlightEvent.organizing_dept || spotlightEvent.fest || "Campus Highlight"}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-medium text-white/82">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={13} />
                        {formatDateShort(spotlightEvent.event_date)}
                      </span>
                      {spotlightEvent.venue && (
                        <span className="flex items-center gap-1">
                          <MapPin size={13} />
                          {spotlightEvent.venue}
                        </span>
                      )}
                    </p>

                    <span className="btn btn-primary btn-active-state mt-4 !w-full !min-h-[44px] !rounded-[var(--radius)] !px-4 !py-2 !text-[14px] !font-extrabold">
                      View Event
                      <ArrowRight size={16} />
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Trending Fests - Horizontal Scroll */}
          {(festsLoading || fests.length > 0) && (
            <div className="pb-6">
              <div className="px-5 pb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-extrabold tracking-[-0.01em]">Trending Now</h2>
                <Link href="/fests" className="text-[12px] font-bold text-[var(--color-primary)] flex items-center gap-1 hover:gap-2 transition-all">
                  View More <ArrowRight size={13} />
                </Link>
              </div>
              <div
                ref={scrollRef}
                onTouchStart={handleUserInteraction}
                onMouseDown={handleUserInteraction}
                className="flex overflow-x-auto gap-3 snap-x snap-mandatory scroll-smooth pb-1 no-scrollbar"
              >
                {/* left spacer */}
                <div className="shrink-0 w-5" aria-hidden />
                {festsLoading
                  ? Array.from({ length: 2 }).map((_, idx) => (
                      <div
                        key={`fest-skeleton-${idx}`}
                        className="premium-card w-[min(280px,calc(100vw-86px))] shrink-0 snap-start overflow-hidden"
                      >
                        <div className="skeleton aspect-[16/10]" />
                        <div className="p-3.5 space-y-2">
                          <div className="skeleton h-4 w-3/4" />
                          <div className="skeleton h-3 w-2/3" />
                          <div className="skeleton h-9 w-28 rounded-[var(--radius)]" />
                        </div>
                      </div>
                    ))
                  : fests.slice(0, 6).map((f) => {
                      const img = f.fest_image_url || f.banner_url || f.image_url;
                      const title = f.fest_title || f.name || "Fest";
                      return (
                        <Link
                          key={f.fest_id || f.id}
                          href={`/fest/${f.slug || f.fest_id}`}
                          data-fest-card
                          className="premium-card btn-active-state group w-[min(280px,calc(100vw-86px))] flex-shrink-0 snap-start overflow-hidden"
                        >
                          <div className="relative aspect-[16/10] bg-[var(--color-primary-light)] overflow-hidden">
                            {img ? (
                              <Image
                                src={img}
                                alt={title}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                sizes="(max-width:480px) 70vw, 280px"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary-dark)] to-[var(--color-primary)] flex items-center justify-center">
                                <span className="text-white font-extrabold text-2xl opacity-35">{title.charAt(0)}</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/68 via-black/10 to-transparent" />
                            <span className="absolute top-2.5 right-2.5 chip bg-white/92 text-[var(--color-primary)] text-[10px] font-bold">
                              Fest
                            </span>
                          </div>

                          <div className="p-3.5">
                            <p className="text-[14px] font-extrabold leading-tight line-clamp-1">{title}</p>
                            <p className="text-[11px] font-medium text-[var(--color-text-muted)] mt-1 line-clamp-1">
                              {f.organizing_dept || f.department || "Campus Fest"}
                            </p>
                            <span className="btn-active-state mt-3 inline-flex items-center gap-1 rounded-[var(--radius)] bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] px-3 py-2 text-[12px] font-bold text-white shadow-[var(--shadow-primary)]">
                              Explore
                              <ArrowRight size={13} />
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                {/* right spacer */}
                <div className="shrink-0 w-5" aria-hidden />
              </div>
            </div>
          )}

          {/* Categories */}
          {categoryGrid.length > 0 && (
            <div className="pb-6">
              <div className="px-5 pb-3">
                <h2 className="text-[15px] font-extrabold tracking-[-0.01em]">Explore Categories</h2>
              </div>

              <div className="px-5 grid grid-cols-2 gap-2.5">
                {categoryGrid.map((category) => {
                  const active = activeCategory === category;
                  return (
                    <button
                      key={`grid-${category}`}
                      onClick={() => {
                        setActiveCategory(category);
                        setCurrentPage(1);
                      }}
                      className={`premium-card btn-active-state flex items-center gap-3 px-3 py-3 text-left ${
                        active
                          ? "bg-[var(--color-primary-light)] border-[var(--color-primary)]"
                          : "bg-[var(--color-surface)]"
                      }`}
                    >
                      <span
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${
                          active
                            ? "bg-[var(--color-primary)] text-white"
                            : "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                        }`}
                      >
                        <Sparkles size={16} />
                      </span>
                      <span
                        className={`text-[13px] leading-snug ${
                          active
                            ? "font-bold text-[var(--color-primary)]"
                            : "font-semibold text-[var(--color-text)]"
                        }`}
                      >
                        {category}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Events Section - Vertical List */}
          {allFiltered.length > 0 && (
            <div>
              <div className="px-5 pb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-extrabold tracking-[-0.01em]">All Upcoming</h2>
                <Link href="/events" className="text-[12px] font-bold text-[var(--color-primary)] flex items-center gap-1 hover:gap-2 transition-all">
                  View More <ArrowRight size={13} />
                </Link>
              </div>
              <div className="px-5 space-y-3">
                {displayedEvents.map((e) => (
                  <EventCard key={e.event_id} event={e} />
                ))}
              </div>

              {/* Beautiful Pagination */}
              {totalPages > 1 && (
                <div className="px-5 mt-6 flex flex-col items-center gap-4">
                  {/* Page indicator */}
                  <p className="text-[12px] text-[var(--color-text-muted)] font-semibold">
                    Page <span className="text-[var(--color-primary)] font-bold">{currentPage}</span> of <span className="text-[var(--color-primary)] font-bold">{totalPages}</span>
                  </p>

                  {/* Page dots */}
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const pageNum = i + 1;
                      const isCurrentPage = pageNum === currentPage;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`transition-all ${
                            isCurrentPage
                              ? "w-8 h-2 rounded-full bg-[var(--color-primary)]"
                              : "w-2 h-2 rounded-full bg-[var(--color-border)] hover:bg-[var(--color-text-light)]"
                          }`}
                          aria-label={`Go to page ${pageNum}`}
                        />
                      );
                    })}
                    {totalPages > 5 && <span className="text-[var(--color-text-muted)] text-[11px] ml-1">•••</span>}
                  </div>

                  {/* Next/Prev buttons */}
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="btn btn-ghost btn-sm btn-active-state !rounded-[var(--radius-lg)] !px-4 !py-2 !text-[12px] !font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="btn btn-primary btn-sm btn-active-state !rounded-[var(--radius-lg)] !px-4 !py-2 !text-[12px] !font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {allFiltered.length === 0 && (
            <div className="px-5 py-12">
              <EmptyState
                icon={<Search size={32} className="text-[var(--color-primary)]" />}
                title="No events found"
                subtitle="Try adjusting your search or filters to see more results"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

