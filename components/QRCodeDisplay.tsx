"use client";

import { useEffect, useState } from "react";
import { DownloadIcon, XIcon, AlertCircleIcon, Loader2Icon } from "@/components/icons";
import { useAuth } from "@/context/AuthContext";
import { PWA_API_URL } from "@/lib/apiConfig";

interface QRCodeDisplayProps {
  registrationId: string;
  eventTitle: string;
  participantName: string;
  onClose: () => void;
}

export default function QRCodeDisplay({
  registrationId,
  eventTitle,
  participantName,
  onClose,
}: QRCodeDisplayProps) {
  const { session } = useAuth();
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQRCode = async () => {
      if (!session?.access_token) {
        setError("Please sign in again to generate QR code.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${PWA_API_URL}/registrations/${encodeURIComponent(registrationId)}/qr-code`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Failed to fetch QR code.");
          return;
        }

        setQrImage(data.qrCodeImage || null);
      } catch {
        setError("Network error while loading QR code.");
      } finally {
        setLoading(false);
      }
    };

    fetchQRCode();
  }, [registrationId, session?.access_token]);

  const downloadQRCode = () => {
    if (!qrImage) return;
    const link = document.createElement("a");
    link.href = qrImage;
    link.download = `qr-${eventTitle.replace(/[^a-zA-Z0-9]/g, "-")}-${registrationId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card max-w-[360px] overflow-hidden">
        <div className="bg-gradient-to-r from-[var(--color-primary-dark)] to-[var(--color-primary)] px-4 py-3 text-white flex items-center justify-between">
          <h3 className="text-[15px] font-bold">Event Ticket</h3>
          <button onClick={onClose} className="p-1 rounded-full bg-white/10" aria-label="Close QR">
            <XIcon size={16} />
          </button>
        </div>

        <div className="p-4 text-center">
          {loading ? (
            <div className="py-6 text-[var(--color-text-muted)]">
              <Loader2Icon size={24} className="mx-auto mb-2 animate-spin" />
              <p className="text-[13px]">Generating QR code...</p>
            </div>
          ) : error ? (
            <div className="py-3">
              <AlertCircleIcon size={24} className="mx-auto mb-2 text-[var(--color-danger)]" />
              <p className="text-[13px] text-[var(--color-danger)]">{error}</p>
            </div>
          ) : (
            <>
              <h4 className="text-[14px] font-bold text-[var(--color-text)]">{eventTitle}</h4>
              <p className="text-[12px] text-[var(--color-text-muted)] mt-1">{participantName}</p>

              {qrImage && (
                <div className="mt-4 inline-block rounded-[var(--radius)] border border-[var(--color-border)] bg-white p-3">
                  <img src={qrImage} alt="QR code ticket" className="h-52 w-52" />
                </div>
              )}

              <p className="mt-3 text-[11px] text-[var(--color-text-muted)]">
                Show this QR code at event entry.
              </p>

              <button onClick={downloadQRCode} className="btn btn-primary w-full mt-4 text-[13px]">
                <DownloadIcon size={14} /> Download QR
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
