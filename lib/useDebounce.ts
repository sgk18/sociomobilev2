/**
 * useDebounce — returns a debounced version of `value` after `delay` ms.
 * Used to prevent unnecessary re-renders from search inputs.
 */
import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number = 250): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
