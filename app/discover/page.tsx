"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useEvents } from "@/context/EventContext";
import EventCard from "@/components/EventCard";
import Skeleton from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { SearchIcon, XIcon, ArrowRightIcon, CalendarIcon, MapPinIcon, SparklesIcon, UsersIcon, ClockIcon, FlameIcon, TrendingUpIcon } from "@/components/icons";
import { FilterChip } from "@/components/FilterChip";
import { Button } from "@/components/Button";
import { SectionContainer } from "@/components/SectionContainer";
import { formatDateShort, isDeadlinePassed } from "@/lib/dateUtils";
import type { Fest } from "@/context/EventContext";
import { useDebounce } from "@/lib/useDebounce";

const ITEMS_PER_PAGE = 10;
const QUICK_CATEGORY_LIMIT = 6;
const GRID_CATEGORY_LIMIT = 4;

function normalizeFestLabel(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function formatCompactCount(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return "0";
  if (count >= 1_000_000) {
    const value = count / 1_000_000;
    return `${parseFloat(value.toFixed(value >= 10 ? 0 : 1))}m`;
  }
  if (count >= 1_000) {
    const value = count / 1_000;
    return `${parseFloat(value.toFixed(value >= 10 ? 0 : 1))}k`;
  }
  return `${Math.round(count)}`;
}

export default function DiscoverPage() {
  const { allEvents, isLoading } = useEvents();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [showOpen, setShowOpen] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [fests, setFests] = useState<Fest[]>([]);
  const [festsLoading, setFestsLoading] = useState(true);

  /* Fetch actual fests from API so we get proper fest_id/slug */
  useEffect(() => {
    (async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const res = await fetch("/api/pwa/fests", { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          const arr = data.fests ?? data.data ?? data ?? [];
          setFests(Array.isArray(arr) ? arr : []);
        }
      } catch {}
      finally {
        clearTimeout(timeoutId);
        setFestsLoading(false);
      }
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

  const festRegistrationMap = useMemo(() => {
    const map = new Map<string, number>();
    allEvents.forEach((event) => {
      const key = normalizeFestLabel(event.fest);
      if (!key || key === "none") return;
      const count = Math.max(0, event.total_participants ?? 0);
      map.set(key, (map.get(key) ?? 0) + count);
    });
    return map;
  }, [allEvents]);

  const trendingFests = useMemo(() => {
    return [...fests]
      .map((fest) => {
        const title = fest.fest_title || fest.name || "";
        const key = normalizeFestLabel(title);
        const registrations = key ? festRegistrationMap.get(key) ?? 0 : 0;
        return { fest, registrations };
      })
      .sort((a, b) => {
        if (b.registrations !== a.registrations) return b.registrations - a.registrations;
        const aTitle = a.fest.fest_title || a.fest.name || "";
        const bTitle = b.fest.fest_title || b.fest.name || "";
        return aTitle.localeCompare(bTitle);
      })
      .slice(0, 6);
  }, [fests, festRegistrationMap]);

  /* Filter events based on search and open status */
  const filtered = useMemo(() => {
    let list = allEvents;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (e) =>
          String(e.title || "").toLowerCase().includes(q) ||
          String(e.venue || "").toLowerCase().includes(q) ||
          String(e.fest || "").toLowerCase().includes(q) ||
          String(e.category || "").toLowerCase().includes(q)
      );
    }
    
    // Apply new filter chips
    if (activeCategory === "Today") {
      const today = new Date().toDateString();
      list = list.filter(e => new Date(e.event_date).toDateString() === today);
    } else if (activeCategory === "This Week") {
      const today = new Date();
      today.setHours(0,0,0,0);
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      list = list.filter(e => {
        const d = new Date(e.event_date);
        return d >= today && d <= nextWeek;
      });
    } else if (activeCategory === "Free") {
      list = list.filter(e => !e.registration_fee || e.registration_fee === 0);
    } else if (activeCategory !== "All") {
      list = list.filter(e => e.category?.trim().toLowerCase() === activeCategory.toLowerCase());
    }

    if (showOpen) {
      list = list.filter((e) => !isDeadlinePassed(e.registration_deadline));
    }
    return list.sort((a, b) => {
      const aClosed = isDeadlinePassed(a.registration_deadline);
      const bClosed = isDeadlinePassed(b.registration_deadline);
      if (aClosed !== bClosed) return aClosed ? 1 : -1;
      return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
    });
  }, [allEvents, debouncedSearch, activeCategory, showOpen]);

  const allFiltered = filtered;
  const spotlightEvents = allFiltered.slice(0, 4);
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
  }, [trendingFests]);

  return (
    <div className="pwa-page pt-[calc(var(--nav-height)+var(--safe-top)+4px)] pb-8 bg-[#f9fafb] max-w-[420px] mx-auto">
      {/* Header */}
      <div className="px-5 pt-3 pb-2 hidden">
        <h1 className="text-[22px] font-extrabold">Discover Events &amp; Fests</h1>
      </div>

      {/* Search row */}
      <div className="px-5 pb-4">
        <div className="relative group flex-1 min-w-0">
          <SearchIcon
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none z-[1]"
          />
          <input
            type="text"
            placeholder="Search events, clubs, or workshops..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-[46px] pl-[44px] pr-10 text-[14px] bg-[#e8e9ec] border-none rounded-xl outline-none transition-all duration-200 placeholder:text-[var(--color-text-muted)] font-medium"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors p-1.5 rounded-full hover:bg-black/5 z-[1]"
              aria-label="Clear search"
            >
              <XIcon size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div className="h-scroll mb-6 gap-2.5">
        <div className="shrink-0 w-4" aria-hidden />
        {["All", "Today", "This Week", "Free"].map((filter) => {
          const active = filter === activeCategory;
          return (
            <FilterChip
              key={filter}
              label={filter}
              isActive={active}
              onClick={() => {
                setActiveCategory(filter);
                setCurrentPage(1);
              }}
            />
          );
        })}
        <div className="shrink-0 w-4" aria-hidden />
      </div>

      {isLoading ? (
        <div className="px-5 space-y-4">
          <Skeleton className="h-52 w-full rounded-[var(--radius-xl)]" count={1} />
          <Skeleton className="h-36 w-full rounded-[var(--radius-lg)]" count={2} />
        </div>
      ) : (
        <>
          {/* Spotlight Hero Card */}
          {spotlightEvents.length > 0 && (
            <SectionContainer title="Spotlight" actionLabel="See All" actionHref="/events">
              <Link href={`/event/${spotlightEvents[0].event_id}`} className="group relative block overflow-hidden rounded-[24px] bg-gradient-to-br from-[#1b2533] to-[#0a1835] shadow-[0_12px_36px_rgba(10,24,53,0.3)] aspect-[4/5] max-h-[460px] btn-active-state">
                {/* Background effects & Image */}
                <div className="absolute inset-0 opacity-60 z-0">
                  <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-[var(--color-primary)] rounded-full blur-[100px] z-0" />
                  <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[var(--color-accent)]/20 rounded-full blur-[80px] z-0" />
                  {(spotlightEvents[0].banner_url || spotlightEvents[0].event_image_url) && (
                    <Image
                      src={(spotlightEvents[0].banner_url || spotlightEvents[0].event_image_url)!}
                      alt={spotlightEvents[0].title}
                      fill
                      className="object-cover mix-blend-overlay group-hover:scale-[1.03] transition-transform duration-700 ease-out z-[1]"
                      sizes="(max-width: 768px) 100vw, 800px"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a1835] via-[#0a1835]/60 to-transparent z-[2]" />
                </div>
                
                <div className="absolute inset-0 p-6 flex flex-col justify-end z-10">
                  <span className="self-start mb-4 chip bg-[#fff4cf] text-[#745b00] text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded">
                    SPOTLIGHT
                  </span>
                  
                  <h2 className="text-[32px] font-black leading-[1.1] text-white tracking-[-0.02em] mb-4 drop-shadow-md">
                    {spotlightEvents[0].title}
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex items-start gap-2">
                      <CalendarIcon size={16} className="text-white/70 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="text-white text-[13px] font-medium leading-tight">
                          {formatDateShort(spotlightEvents[0].event_date)}
                        </span>
                        {spotlightEvents[0].event_time && (
                          <span className="text-white/70 text-[11px] mt-0.5">
                            {formatDateShort(spotlightEvents[0].event_date).split(',')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                    {spotlightEvents[0].venue && (
                      <div className="flex items-start gap-2">
                        <MapPinIcon size={16} className="text-white/70 mt-0.5" />
                        <span className="text-white text-[13px] font-medium leading-tight line-clamp-2">
                          {spotlightEvents[0].venue}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <Button variant="secondary" fullWidth rightIcon={<ArrowRightIcon size={16} />}>
                    Secure Your Seat
                  </Button>
                </div>
              </Link>
            </SectionContainer>
          )}

          {/* Trending Fests - Horizontal Scroll */}
          {(festsLoading || fests.length > 0) && (
            <div className="pb-8">
              <div className="px-5 pb-3 flex items-center justify-between">
                <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">Trending Now</h2>
                <Link href="/fests" className="text-[12px] font-bold text-[var(--color-primary-dark)] hover:underline">
                  View All
                </Link>
              </div>
              <div
                ref={scrollRef}
                onTouchStart={handleUserInteraction}
                onMouseDown={handleUserInteraction}
                className="flex overflow-x-auto gap-3.5 snap-x snap-mandatory scroll-smooth pb-1 no-scrollbar"
              >
                {/* left spacer */}
                <div className="shrink-0 w-5" aria-hidden />
                {festsLoading
                  ? Array.from({ length: 2 }).map((_, idx) => (
                      <div
                        key={`fest-skeleton-${idx}`}
                        className="card-elevated w-[calc(100vw-40px)] max-w-[380px] shrink-0 snap-center"
                      >
                        <div className="skeleton aspect-[16/10]" />
                        <div className="p-4 space-y-2">
                          <div className="skeleton h-4 w-3/4" />
                          <div className="skeleton h-3 w-2/3" />
                          <div className="skeleton h-9 w-28 rounded-[var(--radius)]" />
                        </div>
                      </div>
                    ))
                  : trendingFests.map(({ fest: f, registrations }) => {
                      const img = f.fest_image_url || f.banner_url || f.image_url;
                      const title = f.fest_title || f.name || "Fest";
                      return (
                        <Link
                          key={f.fest_id || f.id}
                          href={`/fest/${f.slug || f.fest_id}`}
                          data-fest-card
                          className="card-elevated group w-[calc(100vw-40px)] max-w-[380px] flex-shrink-0 snap-center"
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
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                            
                            <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-md rounded-full px-2 py-1 flex items-center gap-1 z-10 shadow-sm border border-white/10">
                              <TrendingUpIcon className="w-3.5 h-3.5 text-orange-400 animate-badge-pulse" />
                              <span className="text-white text-[10px] font-medium tracking-wide">Trending</span>
                            </div>

                            <span className="absolute top-2.5 right-2.5 chip bg-white/92 text-[var(--color-primary)] text-[10px] font-bold">
                              Fest
                            </span>
                          </div>

                          <div className="p-4">
                            <p className="text-[15px] font-extrabold leading-tight line-clamp-1">{title}</p>
                            <p className="text-[11px] font-medium text-[var(--color-text-muted)] mt-1 line-clamp-1">
                              {f.organizing_dept || f.department || "Campus Fest"}
                            </p>
                            <div className="mt-3.5 flex items-center gap-2">
                              {registrations > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-md whitespace-nowrap">
                                  <UsersIcon size={12} />
                                  {formatCompactCount(registrations)} going
                                </span>
                              )}
                              <span className="btn-active-state ml-auto inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] px-3.5 py-2 text-[12px] font-bold text-white shadow-[var(--shadow-primary)] transition-all duration-200">
                                Register
                                <ArrowRightIcon size={13} />
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                {/* right spacer */}
                <div className="shrink-0 w-5" aria-hidden />
              </div>
            </div>
          )}

          {/* Browse by Vibe (Asymmetric Grid) */}
          {categoryGrid.length > 0 && (
            <SectionContainer title="Browse by Vibe" actionLabel="View All" actionHref="/events">
              <div className="grid grid-cols-2 gap-3">
                {/* Full Width Card */}
                {categoryGrid[0] && (
                  <button
                    onClick={() => { setActiveCategory(categoryGrid[0]); setCurrentPage(1); }}
                    className="col-span-2 relative bg-[#eef0ff] rounded-2xl p-5 overflow-hidden text-left btn-active-state border border-transparent hover:border-[#d0d6ff] transition-all min-h-[110px] flex flex-col justify-center"
                  >
                    <div className="relative z-10">
                      <div className="w-8 h-8 rounded-full bg-[#3b5bdb] text-white flex items-center justify-center mb-2 shadow-sm">
                        <SparklesIcon size={16} />
                      </div>
                      <h3 className="text-[18px] font-black text-[#263161] leading-tight mb-1">{categoryGrid[0]}</h3>
                      <p className="text-[12px] text-[#55629c] font-medium">Explore the best</p>
                    </div>
                    {/* Decorative abstract shape */}
                    <div className="absolute right-[-10%] bottom-[-20%] text-[#d0d6ff] opacity-50 rotate-[-15deg]">
                      <SparklesIcon size={120} strokeWidth={1} />
                    </div>
                  </button>
                )}
                
                {/* Half Width Cards */}
                {categoryGrid[1] && (
                  <button
                    onClick={() => { setActiveCategory(categoryGrid[1]); setCurrentPage(1); }}
                    className="col-span-1 relative bg-[#fff4cf] rounded-2xl p-4 overflow-hidden text-left btn-active-state border border-transparent hover:border-[#ffe18a] transition-all min-h-[120px] flex flex-col justify-between"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#f59e0b] text-white flex items-center justify-center shadow-sm">
                      <UsersIcon size={14} />
                    </div>
                    <div>
                      <h3 className="text-[16px] font-black text-[#745b00] leading-tight mb-0.5">{categoryGrid[1]}</h3>
                      <p className="text-[11px] text-[#a18627] font-medium">12 Active</p>
                    </div>
                  </button>
                )}
                
                {categoryGrid[2] && (
                  <button
                    onClick={() => { setActiveCategory(categoryGrid[2]); setCurrentPage(1); }}
                    className="col-span-1 relative bg-[#f1edfc] rounded-2xl p-4 overflow-hidden text-left btn-active-state border border-transparent hover:border-[#dbcefc] transition-all min-h-[120px] flex flex-col justify-between"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shadow-sm">
                      <CalendarIcon size={14} />
                    </div>
                    <div>
                      <h3 className="text-[16px] font-black text-[#3d1880] leading-tight mb-0.5">{categoryGrid[2]}</h3>
                      <p className="text-[11px] text-[#6b4ab0] font-medium">45 Active</p>
                    </div>
                  </button>
                )}
              </div>
            </SectionContainer>
          )}

          {/* Events Section - Vertical List */}
          {allFiltered.length > 0 && (
            <SectionContainer title="Curated For You">
              <div className="space-y-5">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </SectionContainer>
          )}

          {/* Empty state */}
          {allFiltered.length === 0 && (
            <div className="px-5 py-12">
              <EmptyState
                icon={<SearchIcon size={32} className="text-[var(--color-primary)]" />}
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

