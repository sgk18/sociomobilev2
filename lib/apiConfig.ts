
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "https://socio2026v2server.vercel.app")
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

export const PWA_API_URL = `${API_BASE}/api`;
