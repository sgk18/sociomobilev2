"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoadingScreen from "@/components/LoadingScreen";
import { Button } from "@/components/Button";
import {
  ChefHatIcon as ChefHat,
  CalendarIcon as CalendarDays,
  ClockIcon as Clock3,
  MapPinIcon as MapPin,
  ChevronRightIcon as ChevronRight,
  AlertTriangleIcon,
  CheckCircleIcon as CheckCircle,
  XCircleIcon as XCircle,
  ArrowLeftIcon,
  ChevronLeftIcon,
} from "@/components/icons";
import { formatDateShort, formatTime } from "@/lib/dateUtils";
import { PWA_API_URL } from "@/lib/apiConfig";

interface CateringBooking {
  booking_id: string;
  booked_by: string;
  description: string | null;
  status: "pending" | "accepted" | "declined";
  event_fest_id: string | null;
  event_fest_type: "event" | "fest" | null;
  catering_id: string;
  contact_details: any;
  created_at: string;
  event_title: string | null;
  event_date: string | null;
  fest_title: string | null;
  fest_opening_date: string | null;
  catering_name: string | null;
}

interface PaginationData {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

const DENIED_MESSAGE = "You do not have permission to access catering services";

export default function CateringDashboardPage() {
  const router = useRouter();
  const { session, userData, isLoading } = useAuth();
  const [bookings, setBookings] = useState<CateringBooking[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/auth");
    }
  }, [isLoading, router, session]);

  const fetchBookings = useCallback(async (pageNum: number) => {
    if (isLoading || !session?.access_token) return;

    setIsFetching(true);
    setError(null);

    try {
      const res = await fetch(`${PWA_API_URL}/catering/bookings?page=${pageNum}&pageSize=${pageSize}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        setBookings([]);
        setError(payload.error || DENIED_MESSAGE);
      } else {
        setBookings(payload.bookings || []);
        setPagination(payload.pagination || null);
      }
    } catch (err) {
      console.error("Failed to fetch catering bookings:", err);
      setError("Failed to load catering orders. Please check your connection.");
    } finally {
      setIsFetching(false);
    }
  }, [isLoading, session?.access_token]);

  useEffect(() => {
    fetchBookings(page);
  }, [fetchBookings, page]);

  const handleAction = async (bookingId: string, action: "accept" | "decline") => {
    if (!session?.access_token) return;

    try {
      const res = await fetch(`${PWA_API_URL}/catering/bookings/${bookingId}/action`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        // Update local state
        setBookings(prev => prev.map(b => 
          b.booking_id === bookingId 
            ? { ...b, status: action === "accept" ? "accepted" : "declined" } 
            : b
        ));
      } else {
        const data = await res.json();
        alert(data.error || `Failed to ${action} booking`);
      }
    } catch (err) {
      console.error(`Error performing ${action} on booking:`, err);
      alert("Network error. Please try again.");
    }
  };

  if (isLoading || (isFetching && page === 1)) {
    return <LoadingScreen />;
  }

  if (!userData?.is_masteradmin && !userData?.roles?.catering) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <AlertTriangleIcon className="text-red-500" size={32} />
        </div>
        <h1 className="text-xl font-bold mb-2">Access Denied</h1>
        <p className="text-[var(--color-text-muted)] mb-6">{DENIED_MESSAGE}</p>
        <Button onClick={() => router.push("/profile")}>Back to Profile</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Sticky Header */}
      <div className="bg-white px-4 pt-5 pb-4 border-b border-[var(--color-border)] sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-[var(--color-text)] active:scale-90 transition-transform"
          >
            <ArrowLeftIcon size={18} />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-[#0F172A] leading-tight">Catering Orders</h1>
            {bookings.length > 0 && !error && (
              <p className="text-[12px] text-[var(--color-text-muted)] font-medium">
                Incoming orders for your catering service.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {error ? (
          <div className="card p-8 text-center flex flex-col items-center mt-10">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <AlertTriangleIcon className="text-red-500" size={28} />
            </div>
            <p className="text-[14px] font-bold text-red-600 mb-1">Failed to Load Orders</p>
            <p className="text-[12px] text-[var(--color-text-muted)] mb-6">{error}</p>
            <Button size="md" variant="primary" onClick={() => fetchBookings(page)}>
              Retry
            </Button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="card p-12 text-center flex flex-col items-center mt-10 shadow-sm">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <ChefHat className="text-[var(--color-primary)]" size={32} />
            </div>
            <h3 className="font-bold text-[16px] text-[#0F172A] mb-1">No Orders Found</h3>
            <p className="text-[12px] text-[var(--color-text-muted)]">
              When users book your catering services, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6 mt-2">
            {/* Group Header - Following Web UI */}
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-[14px] font-bold text-[#475569]">
                Pending <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-[11px] ml-1">
                  {bookings.filter(b => b.status === "pending").length}
                </span>
              </h3>
            </div>

            {bookings.map((booking) => (
              <div key={booking.booking_id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-blue-200 transition-colors">
                <div className="p-5">
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-[16px] text-[#0F172A] leading-snug">
                        {booking.event_title || booking.fest_title || "Catering Request"}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <CalendarDays size={12} className="text-slate-400" />
                          {booking.event_date || booking.fest_opening_date 
                            ? formatDateShort(booking.event_date || booking.fest_opening_date!) 
                            : "No Date"}
                        </span>
                        <span>•</span>
                        <span>ID: {booking.booking_id.slice(-8).toUpperCase()}</span>
                      </div>
                    </div>
                    
                    <div className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      booking.status === "pending" ? "bg-blue-50 text-blue-600" :
                      booking.status === "accepted" ? "bg-emerald-50 text-emerald-600" :
                      "bg-rose-50 text-rose-600"
                    }`}>
                      {booking.status}
                    </div>
                  </div>

                  {/* Section: Order Details */}
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Order Details</p>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[13px] text-slate-700 leading-relaxed">
                        {booking.description || "No specific instructions provided."}
                      </p>
                    </div>
                  </div>

                  {/* Section: Requester Info */}
                  <div className="mb-5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Requester Contact</p>
                    <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100/50 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-bold text-blue-400 uppercase">Name</p>
                        <p className="text-[12px] font-bold text-[#0F172A] truncate">
                          {booking.contact_details?.name || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-blue-400 uppercase">Email</p>
                        <p className="text-[12px] font-medium text-blue-600 truncate underline underline-offset-2">
                          {booking.contact_details?.email || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {booking.status === "pending" && (
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => handleAction(booking.booking_id, "decline")}
                        className="py-3 px-4 border border-rose-200 text-rose-600 rounded-xl text-[13px] font-bold active:bg-rose-50 transition-colors"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleAction(booking.booking_id, "accept")}
                        className="py-3 px-4 bg-emerald-600 text-white rounded-xl text-[13px] font-bold shadow-sm active:scale-[0.98] transition-all"
                      >
                        Accept
                      </button>
                    </div>
                  )}
                  
                  {booking.status !== "pending" && (
                    <div className="flex items-center justify-center gap-2 py-2 text-slate-400 text-[12px] font-medium italic bg-slate-50 rounded-lg">
                      {booking.status === "accepted" ? (
                        <><CheckCircle size={14} className="text-emerald-500" /> Order accepted</>
                      ) : (
                        <><XCircle size={14} className="text-rose-500" /> Order declined</>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-10 px-2 pb-6">
                <button
                  disabled={page === 1}
                  onClick={() => {
                    setPage(p => Math.max(1, p - 1));
                    window.scrollTo(0, 0);
                  }}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                    page === 1 
                      ? "bg-slate-100 text-slate-300" 
                      : "bg-white text-blue-600 border border-slate-200 shadow-sm active:scale-90"
                  }`}
                >
                  <ChevronLeftIcon size={20} />
                </button>
                
                <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[13px] font-extrabold text-[#0F172A]">
                    {page} / {pagination.totalPages}
                  </span>
                </div>

                <button
                  disabled={page === pagination.totalPages}
                  onClick={() => {
                    setPage(p => Math.min(pagination.totalPages, p + 1));
                    window.scrollTo(0, 0);
                  }}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                    page === pagination.totalPages 
                      ? "bg-slate-100 text-slate-300" 
                      : "bg-white text-blue-600 border border-slate-200 shadow-sm active:scale-90"
                  }`}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
