// Pro through Stripe (decisions §2, §18): the webhook is the only writer of
// entitlements, reads each subscription back from Stripe, and handles each
// event once. Stripe itself is a stubbed fetch.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getPlan } from "./lib/functions";
import { GRACE_MS, signPayload } from "./lib/stripe";
import { identity, setup } from "./test.setup";

type T = ReturnType<typeof setup>;

const SECRET = "whsec_test";
const DAY = 24 * 60 * 60 * 1000;

type Call = { method: string; url: string; body: string };
let calls: Call[];
// Subscriptions as Stripe holds them, by id.
let subscriptions: Record<string, Record<string, unknown>>;
let prices: { id: string; created: number; unit_amount: number; currency: string; livemode: boolean; recurring: { interval: string } }[];

beforeEach(() => {
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
  vi.stubEnv("STRIPE_PRO_PRODUCT", "prod_pro");
  vi.stubEnv("SITE_URL", "http://localhost:3000");
  calls = [];
  subscriptions = {};
  prices = [
    { id: "price_month_old", created: 1, unit_amount: 700, currency: "eur", livemode: false, recurring: { interval: "month" } },
    { id: "price_month", created: 2, unit_amount: 800, currency: "eur", livemode: false, recurring: { interval: "month" } },
    { id: "price_year", created: 2, unit_amount: 6900, currency: "eur", livemode: false, recurring: { interval: "year" } },
  ];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ method, url, body: String(init?.body ?? "") });
      const path = new URL(url).pathname.replace("/v1", "");
      const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
      if (method === "GET" && path.startsWith("/subscriptions/")) {
        const sub = subscriptions[path.split("/")[2]];
        return sub ? json(200, sub) : json(404, { error: { message: "No such subscription" } });
      }
      if (method === "GET" && path === "/prices") return json(200, { data: prices });
      if (method === "POST" && path === "/customers") return json(200, { id: "cus_new" });
      if (method === "POST" && path === "/checkout/sessions") return json(200, { url: "https://checkout.stripe.com/c/1" });
      if (method === "POST" && path === "/billing_portal/sessions") return json(200, { url: "https://billing.stripe.com/p/1" });
      if (method === "DELETE" && path.startsWith("/customers/")) return json(200, { deleted: true });
      return json(400, { error: { message: `unexpected ${method} ${path}` } });
    }),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function player(t: T, name: string) {
  const userId = await t.withIdentity(identity(`user_${name}`, { name })).mutation(api.user.ensureUser);
  return { userId, as: t.withIdentity(identity(`user_${name}`)) };
}

function subscription(id: string, userId: Id<"users"> | null, status: string, periodEnd: number, customer = "cus_1") {
  return {
    id,
    object: "subscription",
    customer,
    status,
    cancel_at_period_end: false,
    metadata: userId ? { userId } : {},
    items: { data: [{ current_period_end: Math.floor(periodEnd / 1000), price: { recurring: { interval: "month" } } }] },
  };
}

let nextEvent = 0;
async function deliver(t: T, type: string, object: Record<string, unknown>, id = `evt_${++nextEvent}`) {
  const body = JSON.stringify({ id, type, created: Math.floor(Date.now() / 1000), data: { object } });
  const signature = await signPayload(body, SECRET, Math.floor(Date.now() / 1000));
  return await t.fetch("/stripe", { method: "POST", headers: { "stripe-signature": signature }, body });
}

async function tierOf(t: T, userId: Id<"users">) {
  return await t.run(async (ctx) => (await getPlan(ctx, (await ctx.db.get(userId))!)).tier);
}

async function entitlement(t: T, userId: Id<"users">) {
  return await t.run((ctx) =>
    ctx.db
      .query("entitlements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique(),
  );
}

describe("the Stripe webhook", () => {
  it("refuses a delivery that isn't signed with our secret", async () => {
    const t = setup();
    const { userId } = await player(t, "ada");
    const body = JSON.stringify({ id: "evt_x", type: "customer.subscription.created", data: { object: {} } });
    const forged = await signPayload(body, "whsec_attacker", Math.floor(Date.now() / 1000));

    const response = await t.fetch("/stripe", { method: "POST", headers: { "stripe-signature": forged }, body });
    const unsigned = await t.fetch("/stripe", { method: "POST", body });

    expect(response.status).toBe(400);
    expect(unsigned.status).toBe(400);
    expect(await entitlement(t, userId)).toBeNull();
  });

  it("gives Pro to the period's end plus 2 days and links the customer", async () => {
    const t = setup();
    const { userId } = await player(t, "ada");
    const end = Date.now() + 30 * DAY;
    subscriptions.sub_1 = subscription("sub_1", userId, "active", end);

    const response = await deliver(t, "customer.subscription.created", subscriptions.sub_1);

    expect(response.status).toBe(200);
    expect(await tierOf(t, userId)).toBe("pro");
    expect(await entitlement(t, userId)).toMatchObject({
      tier: "pro",
      expiresAt: Math.floor(end / 1000) * 1000 + GRACE_MS,
      subscriptionId: "sub_1",
      interval: "month",
    });
    const links = await t.run((ctx) => ctx.db.query("stripeCustomers").collect());
    expect(links).toMatchObject([{ userId, customerId: "cus_1" }]);
  });

  it("reads the subscription back, so a stale event can't undo a newer state", async () => {
    const t = setup();
    const { userId } = await player(t, "ada");
    subscriptions.sub_1 = subscription("sub_1", userId, "active", Date.now() + 30 * DAY);

    // An old "incomplete" event arriving after the subscription became active.
    await deliver(t, "customer.subscription.created", subscription("sub_1", userId, "incomplete", Date.now()));

    expect(await tierOf(t, userId)).toBe("pro");
  });

  it("handles an event id once", async () => {
    const t = setup();
    const { userId } = await player(t, "ada");
    subscriptions.sub_1 = subscription("sub_1", userId, "active", Date.now() + 30 * DAY);
    await deliver(t, "customer.subscription.created", subscriptions.sub_1, "evt_same");
    subscriptions.sub_1 = subscription("sub_1", userId, "canceled", Date.now());

    const retried = await deliver(t, "customer.subscription.created", subscriptions.sub_1, "evt_same");

    expect(retried.status).toBe(200);
    expect(await tierOf(t, userId)).toBe("pro");
    expect(await t.run((ctx) => ctx.db.query("stripeEvents").collect())).toHaveLength(1);
  });

  it("ends Pro at once when the subscription is cancelled or unpaid", async () => {
    const t = setup();
    const { userId } = await player(t, "ada");
    subscriptions.sub_1 = subscription("sub_1", userId, "active", Date.now() + 30 * DAY);
    await deliver(t, "customer.subscription.created", subscriptions.sub_1);

    subscriptions.sub_1 = subscription("sub_1", userId, "canceled", Date.now() + 30 * DAY);
    await deliver(t, "customer.subscription.deleted", subscriptions.sub_1);

    expect(await tierOf(t, userId)).toBe("free");
  });

  it("keeps Pro to the period's end when cancelled at period end", async () => {
    const t = setup();
    const { userId } = await player(t, "ada");
    subscriptions.sub_1 = { ...subscription("sub_1", userId, "active", Date.now() + 10 * DAY), cancel_at_period_end: true };

    await deliver(t, "customer.subscription.updated", subscriptions.sub_1);

    expect(await tierOf(t, userId)).toBe("pro");
    expect(await entitlement(t, userId)).toMatchObject({ cancelAtPeriodEnd: true });
  });

  it("doesn't let an ended subscription take Pro from one still running", async () => {
    const t = setup();
    const { userId } = await player(t, "ada");
    subscriptions.sub_1 = subscription("sub_1", userId, "active", Date.now() + 30 * DAY);
    await deliver(t, "customer.subscription.created", subscriptions.sub_1);

    subscriptions.sub_2 = subscription("sub_2", userId, "incomplete_expired", Date.now());
    await deliver(t, "customer.subscription.updated", subscriptions.sub_2);

    expect(await tierOf(t, userId)).toBe("pro");
    expect(await entitlement(t, userId)).toMatchObject({ subscriptionId: "sub_1" });
  });

  it("follows a completed Checkout to its subscription", async () => {
    const t = setup();
    const { userId } = await player(t, "ada");
    subscriptions.sub_9 = subscription("sub_9", userId, "active", Date.now() + 365 * DAY);

    await deliver(t, "checkout.session.completed", { id: "cs_1", mode: "subscription", subscription: "sub_9" });
    await deliver(t, "checkout.session.completed", { id: "cs_2", mode: "payment", subscription: null });

    expect(await tierOf(t, userId)).toBe("pro");
    expect(calls.filter((c) => c.url.includes("/subscriptions/"))).toHaveLength(1);
  });

  it("finds the player by their customer when the metadata is missing", async () => {
    const t = setup();
    const { userId } = await player(t, "ada");
    await t.mutation(internal.billing.linkCustomer, { userId, customerId: "cus_7" });
    subscriptions.sub_1 = subscription("sub_1", null, "active", Date.now() + 30 * DAY, "cus_7");

    await deliver(t, "customer.subscription.created", subscriptions.sub_1);

    expect(await tierOf(t, userId)).toBe("pro");
  });

  it("writes nothing for a customer it doesn't know", async () => {
    const t = setup();
    subscriptions.sub_1 = subscription("sub_1", null, "active", Date.now() + 30 * DAY, "cus_unknown");

    const response = await deliver(t, "customer.subscription.created", subscriptions.sub_1);

    expect(response.status).toBe(200);
    expect(await t.run((ctx) => ctx.db.query("entitlements").collect())).toHaveLength(0);
  });

  it("uses the event's copy when Stripe no longer has the subscription", async () => {
    const t = setup();
    const { userId } = await player(t, "ada");
    subscriptions.sub_1 = subscription("sub_1", userId, "active", Date.now() + 30 * DAY);
    await deliver(t, "customer.subscription.created", subscriptions.sub_1);
    delete subscriptions.sub_1;

    await deliver(t, "customer.subscription.deleted", subscription("sub_1", userId, "canceled", Date.now()));

    expect(await tierOf(t, userId)).toBe("free");
  });
});

describe("checkout and the billing portal", () => {
  it("refuses signed-out callers", async () => {
    const t = setup();
    await expect(t.action(api.billing.checkout, { interval: "month" })).rejects.toThrowError("UNAUTHENTICATED");
    await expect(t.action(api.billing.portal, {})).rejects.toThrowError("UNAUTHENTICATED");
    expect(calls).toHaveLength(0);
  });

  it("creates the customer once and checks out the newest price for the interval", async () => {
    const t = setup();
    const { userId, as } = await player(t, "ada");

    const first = await as.action(api.billing.checkout, { interval: "month" });
    await as.action(api.billing.checkout, { interval: "year" });

    expect(first.url).toBe("https://checkout.stripe.com/c/1");
    expect(calls.filter((c) => c.url.endsWith("/v1/customers"))).toHaveLength(1);
    const sessions = calls.filter((c) => c.url.endsWith("/checkout/sessions")).map((c) => new URLSearchParams(c.body));
    expect(sessions[0].get("line_items[0][price]")).toBe("price_month");
    expect(sessions[1].get("line_items[0][price]")).toBe("price_year");
    expect(sessions[0].get("customer")).toBe("cus_new");
    expect(sessions[0].get("subscription_data[metadata][userId]")).toBe(userId);
    expect(sessions[0].get("client_reference_id")).toBe(userId);
    expect(sessions[0].get("success_url")).toBe("http://localhost:3000/pro?checkout=success");
  });

  it("sends Pro players to the portal instead of a second Checkout", async () => {
    const t = setup();
    const { userId, as } = await player(t, "ada");
    subscriptions.sub_1 = subscription("sub_1", userId, "active", Date.now() + 30 * DAY);
    await deliver(t, "customer.subscription.created", subscriptions.sub_1);

    await expect(as.action(api.billing.checkout, { interval: "month" })).rejects.toThrowError("ALREADY_PRO");
    expect(await as.action(api.billing.portal, {})).toEqual({ url: "https://billing.stripe.com/p/1" });
    expect(await as.query(api.billing.plan, {})).toMatchObject({ tier: "pro", interval: "month", hasBilling: true });
  });

  it("has no portal for a player who never checked out", async () => {
    const t = setup();
    const { as } = await player(t, "ada");
    await expect(as.action(api.billing.portal, {})).rejects.toThrowError("NO_BILLING");
    expect(await as.query(api.billing.plan, {})).toMatchObject({ tier: "free", hasBilling: false });
  });
});

describe("the Pro page prices", () => {
  it("copies the newest active price of each interval from Stripe", async () => {
    const t = setup();
    expect(await t.query(api.billing.prices, {})).toEqual({ month: null, year: null, testMode: false });

    await t.action(internal.billing.syncPrices, {});
    await t.action(internal.billing.syncPrices, {});

    expect(await t.query(api.billing.prices, {})).toEqual({
      month: { amount: 800, currency: "eur" },
      year: { amount: 6900, currency: "eur" },
      testMode: true,
    });
    expect(await t.run((ctx) => ctx.db.query("stripePrices").collect())).toHaveLength(2);
  });
});

describe("account deletion", () => {
  it("removes the plan and the customer link, and deletes the Stripe customer", async () => {
    vi.useFakeTimers();
    try {
      const t = setup();
      const { userId } = await player(t, "ada");
      subscriptions.sub_1 = subscription("sub_1", userId, "active", Date.now() + 30 * DAY);
      await deliver(t, "customer.subscription.created", subscriptions.sub_1);

      await t.mutation(internal.user.deleteFromClerk, { clerkId: "user_ada" });
      await t.finishAllScheduledFunctions(vi.runAllTimers);

      expect(await t.run((ctx) => ctx.db.query("entitlements").collect())).toHaveLength(0);
      expect(await t.run((ctx) => ctx.db.query("stripeCustomers").collect())).toHaveLength(0);
      expect(calls.some((c) => c.method === "DELETE" && c.url.endsWith("/v1/customers/cus_1"))).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("one writer for plans", () => {
  // Only lib/billing.ts may write entitlements; lib/functions.ts reads them.
  const sources = import.meta.glob(["./**/*.ts", "!./**/*.test.ts", "!./_generated/**"], {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;

  it("names the entitlements table only where it's read or written", () => {
    const naming = Object.entries(sources)
      .filter(([, source]) => source.includes('"entitlements"'))
      .map(([path]) => path)
      .sort();
    expect(naming).toEqual(["./lib/billing.ts", "./lib/functions.ts"]);
  });

  it("never writes in lib/functions.ts", () => {
    expect(sources["./lib/functions.ts"]).not.toMatch(/ctx\.db\.(insert|patch|replace|delete)\(/);
  });
});
