import { describe, expect, it } from "vitest";

import {
  entitlementFor,
  GRACE_MS,
  signPayload,
  subscriptionState,
  toForm,
  verifyStripeEvent,
} from "./stripe";

const secret = "whsec_test";
const event = JSON.stringify({ id: "evt_1", type: "customer.subscription.updated", created: 1, data: { object: {} } });

describe("verifyStripeEvent", () => {
  it("accepts Stripe's signature", async () => {
    const header = await signPayload(event, secret, 1_000);
    expect(await verifyStripeEvent(event, header, secret, 1_000)).toMatchObject({ id: "evt_1" });
  });

  it("accepts any matching v1 when the secret is being rolled", async () => {
    const good = await signPayload(event, secret, 1_000);
    const header = `t=1000,v1=${"0".repeat(64)},${good.split(",")[1]}`;
    expect(await verifyStripeEvent(event, header, secret, 1_000)).not.toBeNull();
  });

  it("refuses another secret, a changed body, an old timestamp and no header", async () => {
    const header = await signPayload(event, secret, 1_000);
    expect(await verifyStripeEvent(event, header, "whsec_other", 1_000)).toBeNull();
    expect(await verifyStripeEvent(event.replace("evt_1", "evt_2"), header, secret, 1_000)).toBeNull();
    expect(await verifyStripeEvent(event, header, secret, 1_000 + 301)).toBeNull();
    expect(await verifyStripeEvent(event, null, secret, 1_000)).toBeNull();
    expect(await verifyStripeEvent(event, "t=1000", secret, 1_000)).toBeNull();
  });
});

describe("toForm", () => {
  it("encodes nested objects and arrays the way Stripe reads them", () => {
    expect(
      toForm({ mode: "subscription", line_items: [{ price: "price_1", quantity: 1 }], meta: { a: "b c" }, skip: undefined }),
    ).toEqual(["mode=subscription", "line_items%5B0%5D%5Bprice%5D=price_1", "line_items%5B0%5D%5Bquantity%5D=1", "meta%5Ba%5D=b%20c"]);
  });
});

describe("subscriptionState and entitlementFor", () => {
  const raw = {
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    cancel_at_period_end: true,
    metadata: { userId: "u1" },
    items: { data: [{ current_period_end: 2_000, price: { recurring: { interval: "year" } } }] },
  };

  it("reads the period end from the items, as newer API versions put it", () => {
    expect(subscriptionState(raw)).toEqual({
      subscriptionId: "sub_1",
      customerId: "cus_1",
      userId: "u1",
      status: "active",
      periodEnd: 2_000_000,
      interval: "year",
      cancelAtPeriodEnd: true,
    });
    expect(subscriptionState({ ...raw, items: undefined, current_period_end: 3_000 }).periodEnd).toBe(3_000_000);
  });

  it("gives Pro to the period end plus 2 days while active, trialing or past due", () => {
    for (const status of ["active", "trialing", "past_due"]) {
      expect(entitlementFor({ ...subscriptionState(raw), status }, 5)).toMatchObject({
        tier: "pro",
        expiresAt: 2_000_000 + GRACE_MS,
      });
    }
  });

  it("ends now when cancelled, unpaid or incomplete", () => {
    for (const status of ["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"]) {
      expect(entitlementFor({ ...subscriptionState(raw), status }, 5)).toMatchObject({ tier: "free", expiresAt: 5 });
    }
  });
});
