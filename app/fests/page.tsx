"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import FestCard from "@/components/FestCard";
import Skeleton from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { Search, X, Sparkles, Heart, Calendar, Flame, ArrowRight } from "lucide-react";
import type { Fest } from "@/context/EventContext";
import { useDebounce } from "@/lib/useDebounce";

const ITEMS_PER_PAGE = 8;

export default function FestsPage() {
  const [fests, setFests] = useState<Fest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [currentPage, setCurrentPage] = useState(1);

  // Fallback dummy data to exactly match the mockup if the database is empty
  const DUMMY_FESTS: Fest[] = [
    {
      id: "dummy-1",
      fest_id: "pulse-2024",
      slug: "pulse-2024",
      name: "Pulse 2024",
      fest_title: "Pulse 2024",
      description: "Cultural Extravaganza",
      opening_date: "2024-10-15T00:00:00Z",
      closing_date: "2024-10-18T00:00:00Z",
      fest_image_url: null, // Will render gradient
      organizing_dept: "Cultural Extravaganza",
      category: "FEATURED",
    } as any,
    {
      id: "dummy-2",
      fest_id: "innotech-2024",
      slug: "innotech-2024",
      name: "InnoTech 2024",
      fest_title: "InnoTech 2024",
      description: "Tech Symposium",
      opening_date: "2024-11-05T00:00:00Z",
      closing_date: "2024-11-07T00:00:00Z",
      fest_image_url: null,
      organizing_dept: "Computer Science Dept",
      category: "TECH",
      attendee_count: 1200,
    } as any,
    {
      id: "dummy-3",
      fest_id: "pixel-palooza",
      slug: "pixel-palooza",
      name: "Pixel Palooza",
      fest_title: "Pixel Palooza",
      description: "Gaming Event",
      opening_date: "2024-11-12T00:00:00Z",
      closing_date: "2024-11-12T00:00:00Z",
      fest_image_url: null,
      organizing_dept: "E-Sports Club",
      category: "GAMING",
      attendee_count: 850,
    } as any,
    {
      id: "dummy-4",
      fest_id: "canvas-chaos",
      slug: "canvas-chaos",
      name: "Canvas & Chaos",
      fest_title: "Canvas & Chaos",
      description: "Art Exhibition",
      opening_date: "2024-12-01T00:00:00Z",
      closing_date: "2024-12-03T00:00:00Z",
      fest_image_url: null,
      organizing_dept: "Fine Arts Society",
      category: "ART",
      attendee_count: 420,
    } as any,
  ];

  useEffect(() => {
    (async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const res = await fetch(`/api/pwa/fests`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          const festArray = data.fests ?? data.data ?? data ?? [];
          if (!Array.isArray(festArray) || festArray.length === 0) {
            setFests(DUMMY_FESTS);
          } else {
            setFests(festArray);
          }
        } else {
          console.error("Failed to fetch fests:", res.status);
        }
      } catch (err) {
        console.error("Error fetching fests:", err);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    })();
  }, []);

  const filtered = debouncedSearch
    ? fests.filter(
        (f) =>
          String(f.fest_title || f.name || "").toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          String(f.organizing_dept || f.department || "").toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : fests;

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const displayedFests = filtered.slice(0, startIdx + ITEMS_PER_PAGE);
  const hasMore = currentPage < totalPages;

  const featuredFest = displayedFests.length > 0 ? displayedFests[0] : null;
  const upcomingFests = displayedFests.slice(1);

  return (
    <div className="pwa-page pt-[calc(var(--nav-height)+var(--safe-top)+8px)] max-w-3xl mx-auto space-y-8">
      {/* Search */}
      <div className="px-5">
        <div className="relative w-full">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search fests..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-[#e8e8e8] text-[#1a1c1c] placeholder:text-gray-500 border-none rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-[#dae2ff] focus:outline-none transition-shadow text-[15px] shadow-sm"
          />
          {search && (
            <button 
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 transition-colors p-1.5 rounded-full hover:bg-black/5"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="px-5 space-y-6">
          <Skeleton className="h-[400px] w-full rounded-[1.25rem]" />
          <Skeleton className="h-[220px] w-full rounded-[1.25rem]" count={2} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-5">
          <EmptyState
            icon={<Sparkles size={28} className="text-[#154cb3]" />}
            title="No fests found"
            subtitle={search ? "Try a different search" : "Check back soon for upcoming fests"}
          />
        </div>
      ) : (
        <>
          {/* Featured Fest */}
          {featuredFest && (
            <div className="px-5">
              <div className="mb-3">
                <h1 className="text-[2rem] font-extrabold text-[#1a1c1c] tracking-tight leading-none mb-2">
                  Featured Fest
                </h1>
                <p className="text-[#434653] font-medium">
                  Don't miss out on the biggest events this season.
                </p>
              </div>

              <Link
                href={`/fest/${featuredFest.slug || featuredFest.fest_id}`}
                className="relative block w-full h-[400px] rounded-[1.25rem] overflow-hidden group shadow-[0_8px_30px_rgba(21,76,179,0.15)] cursor-pointer transition-transform duration-300 active:scale-[0.97] border border-white/40"
              >
                {(featuredFest.fest_image_url || featuredFest.banner_url || featuredFest.image_url) ? (
                  <Image
                    src={featuredFest.fest_image_url || featuredFest.banner_url || featuredFest.image_url || ""}
                    alt={featuredFest.fest_title || featuredFest.name || "Featured Fest"}
                    fill
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#001848] to-[#154cb3]" />
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-[#001848]/95 via-[#001848]/60 to-transparent"></div>
                <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
                  <div className="flex justify-between items-start">
                    <span className="bg-[#ffe08b] text-[#241a00] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm">
                      Featured
                    </span>
                    <button 
                      className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 transition-all active:scale-90"
                      onClick={(e) => {
                        e.preventDefault();
                        // Add favorite logic here if needed
                      }}
                    >
                      <Heart size={20} className="text-white" />
                    </button>
                  </div>
                  <div>
                    <h2 className="text-4xl font-extrabold text-white mb-2 leading-tight tracking-tight drop-shadow-md text-glow">
                      {featuredFest.fest_title || featuredFest.name}
                      <br />
                      <span className="text-2xl font-bold text-[#b2c5ff]">
                        {featuredFest.organizing_dept || featuredFest.department || "Cultural Extravaganza"}
                      </span>
                    </h2>
                    <div className="flex items-center gap-2 text-[#e2e2e2] mb-6 text-sm font-medium">
                      <Calendar size={18} />
                      <span>
                        {featuredFest.opening_date || featuredFest.start_date
                          ? new Date(featuredFest.opening_date || featuredFest.start_date!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : "Dates TBA"}
                      </span>
                      <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-xs ml-2 flex items-center gap-1 font-bold">
                        <Flame size={14} /> Trending
                      </span>
                    </div>
                    <div className="w-full bg-gradient-to-br from-[#00368b] to-[#154cb3] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(21,76,179,0.5)] brand-pulse transition-all active:scale-[0.97] ease-out duration-300">
                      <span>Explore Fest</span>
                      <ArrowRight size={20} />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Upcoming Fests */}
          {upcomingFests.length > 0 && (
            <div className="px-5">
              <div className="pt-2 pb-4 flex justify-between items-end">
                <h2 className="text-[1.5rem] font-bold text-[#1a1c1c] tracking-tight leading-none">
                  Upcoming Fests
                </h2>
                {hasMore && (
                  <button 
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="text-[#00368b] font-bold text-sm hover:underline"
                  >
                    View All
                  </button>
                )}
              </div>
              
              <div className="space-y-6 stagger">
                {upcomingFests.map((f) => (
                  <FestCard key={f.fest_id || f.id} fest={f} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
