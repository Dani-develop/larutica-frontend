import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("la migración limita guardados y calificaciones a relaciones válidas", async () => {
  const sql = await read("supabase/migrations/202610060001_traveler_saved_ratings.sql");
  assert.match(sql, /create table public\.saved_publications/i);
  assert.match(sql, /primary key \(user_id, publication_id\)/i);
  assert.match(sql, /references public\.profiles\(id\) on delete cascade/i);
  assert.match(sql, /references public\.publications\(id\) on delete cascade/i);
  assert.match(sql, /create table public\.reservation_ratings/i);
  assert.match(sql, /rating between 1 and 5/i);
  assert.match(sql, /status = 'PAST'/i);
  assert.match(sql, /revoke all on table public\.reservation_ratings from anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.rate_past_reservation[\s\S]*to service_role/i);
});

test("las APIs aíslan guardados por viajero y restringen ratings al historial propio", async () => {
  const saved = await read("app/api/traveler/saved/route.ts");
  const removeSaved = await read("app/api/traveler/saved/[publicationId]/route.ts");
  const rating = await read("app/api/reservations/[id]/rating/route.ts");
  assert.match(saved, /requireAppSession/);
  assert.match(saved, /\.eq\("user_id", session\.userId\)/);
  assert.match(saved, /\.upsert\(/);
  assert.match(removeSaved, /\.eq\("user_id", session\.userId\)/);
  assert.match(rating, /reservation\.passengerId !== session\.userId/);
  assert.match(rating, /reservation\.status !== "PAST"/);
  assert.match(rating, /body\.rating < 1/);
  assert.match(rating, /body\.rating > 5/);
});

test("Explorar y Guardados usan publicaciones persistidas y califican solo viajes pasados", async () => {
  const service = await read("modules/traveler/services/traveler.service.ts");
  const views = await read("components/dashboard/TravelerViews.tsx");
  assert.match(service, /\/api\/traveler\/saved/);
  assert.match(service, /\/api\/reservations\/\$\{encodeURIComponent\(reservationId\)\}\/rating/);
  assert.match(views, /listTravelerPublications/);
  assert.match(views, /listSavedPublications/);
  assert.match(views, /reservation\.status === "PAST" \? \(/);
  assert.match(views, /setPublicationSaved\(publication\.id/);
});
