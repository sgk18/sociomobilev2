import Link from "next/link";
import Image from "next/image";
import { WifiOffIcon } from "@/components/icons";

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      <Image src="/logo.svg" alt="Socio" width={100} height={30} className="mb-6 opacity-50" />
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <WifiOffIcon size={36} className="text-gray-400" />
      </div>
      <h1 className="text-xl font-bold text-[var(--color-text)] mb-2">You&apos;re offline</h1>
      <p className="text-sm text-[var(--color-text-muted)] max-w-xs mb-6">
        It looks like you&apos;re not connected to the internet. Some features may be unavailable until you reconnect.
      </p>
      <Link href="/" className="btn btn-primary text-sm">
        Try again
      </Link>
    </div>
  );
}
