// GET /calendar-feed?token=<FEED_TOKEN>
// Reserve-optie: een agenda-abonnement met alle online afspraken.
// In iCloud: Agenda > Archief > Nieuw agenda-abonnement, en plak deze link.
import { db } from "../_shared/common.ts";

const esc = (s: string) => String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const utc = (d: string) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get("token");
  const secret = Deno.env.get("FEED_TOKEN");
  if (!secret || token !== secret) return new Response("Niet toegestaan", { status: 403 });
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const { data } = await db().from("bookings").select("*").eq("status", "confirmed").gte("starts_at", since).order("starts_at");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AA Lashstudio//Feed//NL", "X-WR-CALNAME:AA Lashstudio – online", "REFRESH-INTERVAL;VALUE=DURATION:PT15M"];
  for (const b of data || []) {
    lines.push("BEGIN:VEVENT", `UID:boeking-${b.id}@aalashstudio`, `DTSTAMP:${utc(b.created_at)}`,
      `DTSTART:${utc(b.starts_at)}`, `DTEND:${utc(b.ends_at)}`, `SUMMARY:${esc(`${b.service_name} – ${b.name}`)}`,
      `DESCRIPTION:${esc(`Telefoon: ${b.phone}\nE-mail: ${b.email}${b.note ? `\nOpmerking: ${b.note}` : ""}`)}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR", "");
  return new Response(lines.join("\r\n"), { headers: { "Content-Type": "text/calendar; charset=utf-8" } });
});
