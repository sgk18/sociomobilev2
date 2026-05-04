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
    <div className="min-h-screen bg-[var(--color-bg)] pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-4 border-b border-[var(--color-border)] sticky top-0 z-20">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-[var(--color-text)]"
          >
            <ArrowLeftIcon size={18} />
          </button>
          <h1 className="text-xl font-extrabold flex-1">Catering Orders</h1>
        </div>

        <div className="bg-gradient-to-br from-orange-600 to-orange-400 rounded-2xl p-5 text-white shadow-lg shadow-orange-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <ChefHat size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Catering Dashboard</h2>
              <p className="text-white/80 text-[11px] font-medium uppercase tracking-wider">
                Vendor Management System
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        {error ? (
          <div className="card p-8 text-center flex flex-col items-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-3">
              <AlertTriangleIcon className="text-red-500" size={24} />
            </div>
            <p className="text-[13px] font-bold text-red-600 mb-1">Update Failed</p>
            <p className="text-[12px] text-[var(--color-text-muted)] mb-4">{error}</p>
            <Button size="sm" variant="outline" onClick={() => fetchBookings(page)}>
              Retry
            </Button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="card p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-4">
              <ChefHat className="text-orange-400" size={32} />
            </div>
            <h3 className="font-bold text-[15px] mb-1">No Orders Found</h3>
            <p className="text-[12px] text-[var(--color-text-muted)]">
              When users book your catering services, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.booking_id} className="card overflow-hidden border-l-4 border-orange-500">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0 mr-2">
                      <h3 className="font-extrabold text-[15px] text-[var(--color-text)] truncate leading-tight">
                        {booking.event_title || booking.fest_title || "General Booking"}
                      </h3>
                      <p className="text-[11px] text-[var(--color-text-muted)] font-medium">
                        ID: {booking.booking_id}
                      </p>
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      booking.status === "pending" ? "bg-blue-50 text-blue-600" :
                      booking.status === "accepted" ? "bg-green-50 text-green-600" :
                      "bg-red-50 text-red-600"
                    }`}>
                      {booking.status}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-[12px] text-[var(--color-text)]">
                      <CalendarDays size={14} className="text-orange-500" />
                      <span>
                        {booking.event_date || booking.fest_opening_date 
                          ? formatDateShort(booking.event_date || booking.fest_opening_date!) 
                          : "Date TBD"}
                      </span>
                    </div>
                    {booking.catering_name && (
                      <div className="flex items-center gap-2 text-[12px] text-[var(--color-text)]">
                        <ChefHat size={14} className="text-orange-500" />
                        <span className="font-semibold">{booking.catering_name}</span>
                      </div>
                    )}
                    {booking.description && (
                      <div className="mt-2 p-2 bg-gray-50 rounded-lg text-[12px] text-[var(--color-text-muted)] italic">
                        "{booking.description}"
                      </div>
                    )}
                  </div>

                  {booking.status === "pending" && (
                    <div className="flex gap-2 pt-2 border-t border-gray-100 mt-2">
                      <button
                        onClick={() => handleAction(booking.booking_id, "accept")}
                        className="flex-1 py-2 bg-green-500 text-white rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform"
                      >
                        <CheckCircle size={14} />
                        Accept
                      </button>
                      <button
                        onClick={() => handleAction(booking.booking_id, "decline")}
                        className="flex-1 py-2 bg-white border border-red-200 text-red-600 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                      >
                        <XCircle size={14} />
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-8 px-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    page === 1 ? "bg-gray-100 text-gray-400" : "bg-white text-orange-600 border border-orange-100 shadow-sm active:bg-orange-50"
                  }`}
                >
                  <ChevronLeftIcon size={20} />
                </button>
                
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-[var(--color-text)]">
                    Page {page} of {pagination.totalPages}
                  </span>
                </div>

                <button
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    page === pagination.totalPages ? "bg-gray-100 text-gray-400" : "bg-white text-orange-600 border border-orange-100 shadow-sm active:bg-orange-50"
                  }`}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
            
            <p className="text-center text-[10px] text-[var(--color-text-muted)] mt-4">
              Showing {bookings.length} of {pagination?.totalItems || bookings.length} orders
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
