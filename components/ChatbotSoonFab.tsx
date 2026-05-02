"use client";

import { MessageSquareIcon, XIcon } from "@/components/icons";
import { useState } from "react";

export default function ChatbotSoonFab() {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowTooltip(!showTooltip)}
        aria-label="Chatbot coming soon"
        className="fixed right-3 z-40 w-12 h-12 rounded-full bg-[var(--color-primary)] text-white shadow-[var(--shadow-primary)] flex items-center justify-center hover:scale-110 transition-transform"
        style={{ bottom: "calc(var(--bottom-nav) + var(--safe-bottom) + 10px)" }}
      >
        <MessageSquareIcon size={22} strokeWidth={2} />
      </button>

      {/* Tooltip Modal */}
      {showTooltip && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setShowTooltip(false)}
          />
          <div className="fixed right-3 z-50 bg-white rounded-[var(--radius)] shadow-lg border border-[var(--color-border)] p-3 w-40"
            style={{ bottom: "calc(var(--bottom-nav) + var(--safe-bottom) + 56px)" }}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold">Chatbot</p>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-1">Coming soon</p>
              </div>
              <button
                onClick={() => setShowTooltip(false)}
                className="p-0.5 rounded hover:bg-black/5 flex-shrink-0"
              >
                <XIcon size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
