"use client";

import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { useAuth } from "@/context/AuthContext";
import { AlertTriangleIcon, CameraIcon, CheckCircleIcon, QrCodeIcon, XIcon } from "@/components/icons";
import { Button } from "@/components/Button";

interface QRScannerProps {
  eventId: string;
  eventTitle: string;
  onScanSuccess?: (result: ScanPayload) => void;
}

interface ScanResult {
  name?: string;
  email?: string;
  registrationId?: string;
  status?: "marked_present" | "already_present";
  markedAt?: string;
}

interface ScanPayload {
  participant?: ScanResult;
  error?: string;
  message?: string;
}

export default function QRScanner({ eventId, eventTitle, onScanSuccess }: QRScannerProps) {
  const { session, userData } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const isProcessingRef = useRef(false);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, []);

  const stopScanner = () => {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setIsScanning(false);
  };

  const resumeScanner = (delayMs: number) => {
    window.setTimeout(() => {
      isProcessingRef.current = false;
      if (scannerRef.current) {
        scannerRef.current.start().catch(() => {
          setError("Unable to restart camera. Tap Start Scanner again.");
          setIsScanning(false);
        });
      }
    }, delayMs);
  };

  const processScan = async (qrCodeData: string) => {
    if (isProcessingRef.current || !session?.access_token) return;
    isProcessingRef.current = true;
    scannerRef.current?.stop();

    try {
      const response = await fetch(`/api/pwa/events/${encodeURIComponent(eventId)}/scan-qr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          qrCodeData,
          volunteerId: userData?.register_number,
          scannerInfo: {
            source: "sociomobilev2",
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          },
        }),
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => ({}))) as ScanPayload;
      if (!response.ok) {
        setResult(null);
        setError(payload.error || "Unable to process this QR code.");
        resumeScanner(2200);
        return;
      }

      setError(null);
      setResult(payload.participant || null);
      onScanSuccess?.(payload);
      resumeScanner(3000);
    } catch {
      setResult(null);
      setError("Network error. Please try again.");
      resumeScanner(2200);
    }
  };

  const startScanner = async () => {
    if (!videoRef.current) return;
    if (!session?.access_token) {
      setError("Please sign in again to use the scanner.");
      return;
    }

    try {
      setError(null);
      setResult(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      setHasPermission(true);

      scannerRef.current?.destroy();
      scannerRef.current = new QrScanner(
        videoRef.current,
        (scanResult) => {
          const data = typeof scanResult === "string" ? scanResult : scanResult?.data;
          if (data) void processScan(data);
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: "environment",
        }
      );

      await scannerRef.current.start();
      setIsScanning(true);
    } catch {
      setHasPermission(false);
      setIsScanning(false);
      setError("Camera access is required to scan QR codes.");
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="bg-[var(--color-primary-dark)] px-4 py-4 text-white">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/12">
            <QrCodeIcon size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[16px] font-extrabold">QR Scanner</h2>
            <p className="mt-0.5 truncate text-[12px] text-blue-100">{eventTitle}</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="relative overflow-hidden rounded-[22px] bg-black">
          <video
            ref={videoRef}
            className="aspect-square w-full object-cover"
            muted
            playsInline
          />
          {!isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 px-6 text-center text-white">
              <QrCodeIcon size={42} className="mb-3 text-white/70" />
              <p className="text-[14px] font-bold">Scanner locked to this event</p>
              <p className="mt-1 text-[12px] leading-5 text-white/65">
                Start the camera only when you are ready to scan attendee tickets.
              </p>
            </div>
          )}
          {isScanning && (
            <div className="pointer-events-none absolute inset-5 rounded-[18px] border-2 border-white/80" />
          )}
        </div>

        {hasPermission === false && (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-[12px] font-semibold text-red-700">
            Camera permission is required to scan QR codes.
          </div>
        )}

        {result && (
          <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-center gap-2 text-[13px] font-extrabold text-emerald-800">
              <CheckCircleIcon size={16} />
              {result.status === "already_present" ? "Already scanned" : "Attendance marked"}
            </div>
            <div className="mt-2 space-y-0.5 text-[12px] text-emerald-800">
              {result.name && <p>Name: {result.name}</p>}
              {result.email && <p>Email: {result.email}</p>}
              {result.markedAt && <p>Time: {new Date(result.markedAt).toLocaleString()}</p>}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3">
            <div className="flex items-start gap-2 text-[12px] font-semibold text-red-700">
              <AlertTriangleIcon size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {!isScanning ? (
            <Button
              variant="primary"
              fullWidth
              onClick={startScanner}
              leftIcon={<CameraIcon size={16} />}
            >
              Start Scanner
            </Button>
          ) : (
            <Button
              variant="danger"
              fullWidth
              onClick={stopScanner}
              leftIcon={<XIcon size={16} />}
            >
              Stop Scanner
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
