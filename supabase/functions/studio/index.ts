// POST /studio  (alleen voor ingelogde studio-beheerders)
//   { action: "cancel", id }      -> afspraak annuleren en uit iCloud halen
//   { action: "resync", id }      -> afspraak opnieuw naar iCloud sturen
//   { action: "icloud-status" }   -> testen of de iCloud-koppeling werkt
import { cors, db, getSettings, icloud, icloudConfigured, json } from "../_shared/common.ts";
import { eventIcs } from "../_shared/caldav.js";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const client = db();
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await client.auth.getUser(jwt);
    if (!u?.user) return json({ error: "Log opnieuw in." }, 401);
    const { data: admin } = await client.from("admins").select("user_id").eq("user_id", u.user.id).maybeSingle();
    if (!admin) return json({ error: "Dit account heeft geen toegang tot de studio." }, 403);

    const body = await req.json().catch(() => ({}));

    if (body.action === "icloud-status") {
      if (!icloudConfigured()) return json({ ok: false, message: "iCloud is nog niet ingesteld (geheimen ICLOUD_USERNAME, ICLOUD_APP_PASSWORD, ICLOUD_CALENDAR ontbreken)." });
      try {
        const cals = await icloud().calendars();
        const want = Deno.env.get("ICLOUD_CALENDAR")!.trim().toLowerCase();
        const found = cals.some((c) => c.name.trim().toLowerCase() === want);
        return json({
          ok: found,
          account: Deno.env.get("ICLOUD_USERNAME"),
          calendar: Deno.env.get("ICLOUD_CALENDAR"),
          calendars: cals.map((c) => c.name),
          message: found ? "Verbonden met iCloud." : `Ingelogd, maar agenda "${Deno.env.get("ICLOUD_CALENDAR")}" bestaat niet.`,
        });
      } catch (e) {
        return json({ ok: false, message: String((e as Error).message || e) });
      }
    }

    const { data: b } = await client.from("bookings").select("*").eq("id", body.id).maybeSingle();
    if (!b) return json({ error: "Afspraak niet gevonden." }, 404);

    if (body.action === "cancel") {
      await client.from("bookings").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", b.id);
      let removed = true;
      if (b.caldav_url && icloudConfigured()) {
        try { await icloud().remove(b.caldav_url); } catch (e) { removed = false; console.error(e); }
      }
      return json({ ok: true, removedFromIcloud: removed });
    }

    if (body.action === "resync") {
      if (!icloudConfigured()) return json({ error: "iCloud is nog niet ingesteld." }, 400);
      const settings = await getSettings(client);
      const cal = icloud();
      const target = await cal.calendar(Deno.env.get("ICLOUD_CALENDAR")!);
      const uid = `boeking-${b.id}@aalashstudio`;
      if (b.caldav_url) { try { await cal.remove(b.caldav_url); } catch (_) { /* bestaat misschien niet meer */ } }
      const url = await cal.add(target, uid, eventIcs({
        uid, start: new Date(b.starts_at), end: new Date(b.ends_at),
        summary: `${b.service_name} – ${b.name}`,
        description: `Telefoon: ${b.phone}\nE-mail: ${b.email}${b.note ? `\nOpmerking: ${b.note}` : ""}\nPrijs: € ${b.price}\nGeboekt via de website`,
        location: settings.address,
      }));
      await client.from("bookings").update({ caldav_url: url, icloud_synced: true, icloud_error: null }).eq("id", b.id);
      return json({ ok: true });
    }

    return json({ error: "Onbekende actie." }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
