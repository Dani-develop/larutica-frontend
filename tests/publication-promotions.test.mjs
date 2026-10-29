import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  PROMOTION_DURATION_MS,
  PROMOTION_PRICE_USD,
  canStartPromotion,
  catalogPromotionFlag,
  comparePromotedPublications,
  decidePromotionSettlement,
  promotionEndsAt,
  settlementTarget,
} from "../lib/promotions/window.ts";
import { english } from "../lib/preferences/messages.ts";

const now = Date.parse("2026-10-29T12:00:00.000Z");
const day = 24 * 60 * 60 * 1000;

test("la promoción cuesta 12 USD y dura 7 días desde el cobro aceptado", () => {
  assert.equal(PROMOTION_PRICE_USD, 12);
  assert.equal(PROMOTION_DURATION_MS, 7 * day);
  assert.equal(promotionEndsAt(now), new Date(now + 7 * day).toISOString());
});

test("una promoción vencida no adelanta a una publicación nunca promocionada", () => {
  const expired = {
    promotedUntil: new Date(now - day).toISOString(),
    createdAt: new Date(now - 40 * day).toISOString(),
  };
  const fresh = {
    promotedUntil: null,
    createdAt: new Date(now - 2 * day).toISOString(),
  };
  assert.ok(comparePromotedPublications(expired, fresh, now) > 0);
  assert.deepEqual(catalogPromotionFlag(expired.promotedUntil, now), { promoted: false });
  assert.equal("promotedUntil" in catalogPromotionFlag(expired.promotedUntil, now), false);
});

test("las promociones vigentes van primero y vence más tarde la que queda delante", () => {
  const soon = { promotedUntil: new Date(now + day).toISOString(), createdAt: new Date(now).toISOString() };
  const later = { promotedUntil: new Date(now + 3 * day).toISOString(), createdAt: new Date(now - day).toISOString() };
  const plain = { promotedUntil: null, createdAt: new Date(now + day).toISOString() };
  assert.ok(comparePromotedPublications(later, soon, now) < 0);
  assert.ok(comparePromotedPublications(soon, plain, now) < 0);
  assert.deepEqual(catalogPromotionFlag(later.promotedUntil, now), { promoted: true });
});

test("un rechazo o un abandono no mueven la ventana, y un segundo cobro con ventana abierta se reembolsa", () => {
  const open = new Date(now + 2 * day).toISOString();
  for (const onvoStatus of ["pending", "failed", "canceled", "expired"]) {
    assert.deepEqual(
      decidePromotionSettlement({ promotedUntil: open, onvoStatus, now }),
      { action: "unchanged" },
    );
  }
  assert.deepEqual(
    decidePromotionSettlement({ promotedUntil: open, onvoStatus: "paid", now }),
    { action: "refund" },
  );
  assert.equal(canStartPromotion("APPROVED", open, now), false);
  assert.equal(canStartPromotion("PENDING", null, now), false);
  const accepted = decidePromotionSettlement({ promotedUntil: null, onvoStatus: "paid", now });
  assert.deepEqual(accepted, { action: "promote", promotedUntil: promotionEndsAt(now) });
});

test("un intento que no está en los pagos de reserva se liquida como promoción", () => {
  assert.equal(settlementTarget(null), "promotion");
  assert.equal(settlementTarget({ id: "reservation-payment" }), "reservation");
  const decision = decidePromotionSettlement({ promotedUntil: null, onvoStatus: "paid", now });
  assert.equal(decision.action, "promote");
});

test("el catálogo marca el patrocinio sin enviar la fecha y la reserva conserva su endpoint", async () => {
  const catalog = await readFile("app/api/catalog/route.ts", "utf8");
  const reservation = await readFile("modules/payments/services/payment.service.ts", "utf8");
  assert.match(catalog, /comparePromotedPublications/);
  assert.match(catalog, /promoted: catalogPromotionFlag/);
  assert.doesNotMatch(catalog, /promoted_until:/);
  assert.match(reservation, /\/api\/reservations\/\$\{encodeURIComponent\(reservationId\)\}\/payment\/confirm/);
  assert.match(reservation, /\/promotion\/payment\/confirm/);
});

test("Promocionar, Patrocinado y la nota de pago seguro tienen inglés", () => {
  assert.equal(english["Promocionar"], "Promote");
  assert.equal(english["Patrocinado"], "Sponsored");
  assert.match(english["Pago seguro con OnvoPAY. LaRutica no guarda los datos de tu tarjeta."], /OnvoPAY/);
});

test("la migración no otorga la tabla de promociones a anon ni a authenticated", async () => {
  const sql = await readFile("supabase/migrations/202610290001_publication_promotions.sql", "utf8");
  assert.match(sql, /promoted_until timestamptz/);
  assert.match(sql, /revoke all on table public\.publication_promotion_payments from anon, authenticated/i);
  assert.doesNotMatch(sql, /grant\s+.+\s+on table public\.publication_promotion_payments\s+to\s+(anon|authenticated)/i);
  assert.match(sql, /when p\.promoted_until > now\(\)/);
  const orderAt = sql.indexOf("when p.promoted_until > now()");
  const savedAt = sql.indexOf("when v_sort = 'most_saved'");
  const newestAt = sql.indexOf("when v_sort = 'newest'");
  assert.ok(orderAt > 0 && orderAt < savedAt && savedAt < newestAt);
});
