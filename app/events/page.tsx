"use client";

import { useState, useMemo } from "react";
import { useEvents } from "@/context/EventContext";
import EventCard from "@/components/EventCard";
import Skeleton from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { SearchIcon, XIcon, CalendarIcon, FilterIcon, SortAZIcon, TrendingUpIcon, ClockIcon } from "@/components/icons";
import { FilterChip } from "@/components/FilterChip";
import { Button } from "@/components/Button";
import { SectionContainer } from "@/components/SectionContainer";
import { isDeadlinePassed } from "@/lib/dateUtils";
import { useDebounce } from "@/lib/useDebounce";

type SortKey = "date" | "popular" | "name";

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ReactNode }[] = [
  { key: "date", label: "Date", icon: <ClockIcon size={11} /> },
  { key: "popular", label: "Popular", icon: <TrendingUpIcon size={11} /> },
  { key: "name", label: "A-Z", icon: <SortAZIcon size={11} /> },
];

export default function EventsPage() {
  const { allEvents, isLoading } = useEvents();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);
  const [sort, setSort] = useState<SortKey>("date");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const ITEMS_PER_PAGE = 5;

  // Dynamically calculate the trending threshold based on the top 25% of events
  const trendingThreshold = useMemo(() => {
    if (!allEvents || allEvents.length === 0) return Infinity;
    const counts = allEvents.map((e) => e.total_participants ?? 0).filter((c) => c > 0);
    if (counts.length === 0) return Infinity;
    counts.sort((a, b) => b - a);
    // Top 25%, at least top 3, max out at last item
    const index = Math.min(Math.max(2, Math.floor(counts.length * 0.25)), counts.length - 1);
    // Needs at least 5 registrations to be considered trending, regardless of relative rank
    return Math.max(5, counts[index]);
  }, [allEvents]);

  const allFilteredEvents = useMemo(() => {
    let list = allEvents;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (e) =>
          String(e.title || "").toLowerCase().includes(q) ||
          String(e.venue || "").toLowerCase().includes(q) ||
          String(e.fest || "").toLowerCase().includes(q)
      );
    }
    if (onlyOpen) {
      list = list.filter((e) => !isDeadlinePassed(e.registration_deadline));
    }
    const sorted = [...list];
    switch (sort) {
      case "date":
        sorted.sort((a, b) => {
          const aClosed = isDeadlinePassed(a.registration_deadline);
          const bClosed = isDeadlinePassed(b.registration_deadline);
          if (aClosed !== bClosed) return aClosed ? 1 : -1;
          return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
        });
        break;
      case "popular":
        sorted.sort((a, b) => {
          const aClosed = isDeadlinePassed(a.registration_deadline);
          const bClosed = isDeadlinePassed(b.registration_deadline);
          if (aClosed !== bClosed) return aClosed ? 1 : -1;
          return (b.total_participants ?? 0) - (a.total_participants ?? 0);
        });
        break;
      case "name":
        sorted.sort((a, b) => {
          const aClosed = isDeadlinePassed(a.registration_deadline);
          const bClosed = isDeadlinePassed(b.registration_deadline);
          if (aClosed !== bClosed) return aClosed ? 1 : -1;
          return String(a.title || "").localeCompare(String(b.title || ""));
        });
        break;
    }
    return sorted;
  }, [allEvents, debouncedSearch, sort, onlyOpen]);

  const totalPages = Math.ceil(allFilteredEvents.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const isDefaultView = !debouncedSearch && sort === "date";
  const events = allFilteredEvents.slice(0, startIdx + ITEMS_PER_PAGE);
  const happeningSoonEvents = isDefaultView ? events.slice(0, 2) : [];
  const trendingEvents = isDefaultView ? events.slice(2) : [];
  const hasMore = currentPage < totalPages;

  return (
    <div className="pwa-page pt-[calc(var(--nav-height)+var(--safe-top)+4px)] pb-8 bg-[#f9fafb] max-w-[420px] mx-auto">
      {/* Search & Header Row */}
      <div className="px-5 pt-2 pb-4 h-[60px] flex flex-col justify-center">
        {!isSearchOpen ? (
          <div className="flex items-center justify-between animate-fade-in">
            <h1 className="text-[26px] font-black tracking-tight text-[var(--color-text)]">Events</h1>
          </div>
        ) : (
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="relative group flex-1 min-w-0">
              <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none z-[1]" />
              <input
                autoFocus
                type="text"
                placeholder="Search events…"
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
            <button
              onClick={() => {
                setIsSearchOpen(false);
                setSearch("");
                setCurrentPage(1);
              }}
              className="text-[13px] font-bold text-[var(--color-primary-dark)] px-1 shrink-0"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="h-scroll mb-6 gap-2.5 items-center">
        <div className="shrink-0 w-4" aria-hidden />
        {!isSearchOpen && (
          <button
            onClick={() => setIsSearchOpen(true)}
            className="shrink-0 p-2 -ml-2 mr-1 flex items-center justify-center text-[var(--color-text)] transition-transform active:scale-95"
            aria-label="Open search"
          >
            <SearchIcon size={20} strokeWidth={2.5} />
          </button>
        )}
        <FilterChip
          label="Open only"
          icon={<FilterIcon size={14} />}
          isActive={onlyOpen}
          onClick={() => {
            setOnlyOpen(!onlyOpen);
            setCurrentPage(1);
          }}
        />
        {SORT_OPTIONS.map(({ key, label, icon }) => (
          <FilterChip
            key={key}
            label={label}
            icon={icon}
            isActive={sort === key}
            onClick={() => {
              setSort(key);
              setCurrentPage(1);
            }}
          />
        ))}
        <div className="shrink-0 w-4" aria-hidden />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="px-4 space-y-3">
          <Skeleton className="h-48 w-full rounded-[var(--radius)]" count={4} />
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon size={28} className="text-[var(--color-primary)]" />}
          title="No events found"
          subtitle="Try a different search term"
        />
      ) : (
        <>
          <div className="space-y-6">
            {isDefaultView ? (
              <>
                {happeningSoonEvents.length > 0 && (
                  <section className="space-y-3 animate-fade-up">
                    <div className="px-5">
                      <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">Happening Soon</h2>
                    </div>

                    <div className="px-5">
                      <div className="space-y-4">
                        {happeningSoonEvents.map((event) => (
                          <EventCard key={event.event_id} event={event} featured showAction isTrending={(event.total_participants ?? 0) >= trendingThreshold} />
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {trendingEvents.length > 0 && (
                  <SectionContainer title="Trending Events" className="pt-2">
                    <div className="space-y-3 stagger">
                      {trendingEvents.map((e) => (
                        <EventCard key={e.event_id} event={e} showAction isTrending={(e.total_participants ?? 0) >= trendingThreshold} />
                      ))}
                    </div>
                  </SectionContainer>
                )}
              </>
            ) : (
              <div className="px-5 space-y-4 pt-2">
                {events.map((event) => (
                  <EventCard key={event.event_id} event={event} showAction isTrending={(event.total_participants ?? 0) >= trendingThreshold} />
                ))}
              </div>
            )}
          </div>

          {/* Pagination info and load more button */}
          {allFilteredEvents.length > ITEMS_PER_PAGE && (
            <div className="px-4 py-4 flex items-center justify-between">
              <p className="text-[12px] text-[var(--color-text-muted)] font-semibold">
                Showing {Math.min(startIdx + ITEMS_PER_PAGE, allFilteredEvents.length)} of {allFilteredEvents.length}
              </p>
              {hasMore && (
                <Button
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Load More
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
