import React from "react";

export interface FilterChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  isActive?: boolean;
  icon?: React.ReactNode;
}

export function FilterChip({
  label,
  isActive = false,
  icon,
  className = "",
  ...props
}: FilterChipProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 text-[13px] font-bold rounded-full transition-all duration-200 active:scale-[0.97] ${
        isActive
          ? "bg-[var(--color-accent)] text-[var(--color-primary-dark)] shadow-md"
          : "bg-[#f3f4f6] text-[var(--color-text-muted)] hover:bg-[#e5e7eb]"
      } ${className}`}
      {...props}
    >
      {icon && <span className={isActive ? "text-[var(--color-primary-dark)]" : "text-gray-500"}>{icon}</span>}
      {label}
    </button>
  );
}
