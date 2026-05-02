import type { VolunteerEvent } from "@/context/AuthContext";

const CAMPUS_UTC_OFFSET_MINUTES = 330;

function parseCampusDateTime(dateValue?: string | null, timeValue?: string | null) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue || "").trim());
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(String(timeValue || "").trim());
  if (!dateMatch || !timeMatch) return null;

  const [, year, month, day] = dateMatch.map(Number);
  const [, hour, minute, second = "0"] = timeMatch;
  const timestamp =
    Date.UTC(year, month - 1, day, Number(hour), Number(minute), Number(second)) -
    CAMPUS_UTC_OFFSET_MINUTES * 60 * 1000;
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getVolunteerEventEndDate(event: VolunteerEvent) {
  return parseCampusDateTime(
    event.end_date || event.event_date,
    event.end_time || event.event_time
  );
}

export function isVolunteerEventActive(event: VolunteerEvent, now = new Date()) {
  const assignmentExpiry = new Date(event.volunteer_assignment?.expires_at || "");
  if (Number.isNaN(assignmentExpiry.getTime()) || now >= assignmentExpiry) return false;

  const eventEndDate = getVolunteerEventEndDate(event);
  if (eventEndDate && now >= eventEndDate) return false;

  return true;
}

export function getActiveVolunteerEvents(events?: VolunteerEvent[] | null) {
  return (Array.isArray(events) ? events : []).filter((event) => isVolunteerEventActive(event));
}
