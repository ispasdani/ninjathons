/**
 * Pro through Stripe (decisions §2, §18): Checkout and the billing portal for
 * the app, and the webhook's mutation, the only writer of entitlements (via
 * lib/billing.ts).
 */
import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery, type QueryCtx } from "./_generated/server";
import { applySubscription } from "./lib/billing";
import { getPlan, userAction, userQuery } from "./lib/functions";
import { stripe, StripeError, subscriptionState, type StripeEvent } from "./lib/stripe";

const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

function siteUrl() {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

// --- For the app ---

/** The caller's plan, for the Pro page and settings. */
export const plan = userQuery({
  args: {},
  handler: async (ctx) => {
    const { tier, plan } = await getPlan(ctx, ctx.user);
    return {
      tier,
      expiresAt: plan && tier !== "free" ? plan.expiresAt : null,
      interval: plan?.interval ?? null,
      cancelAtPeriodEnd: plan?.cancelAtPeriodEnd ?? false,
      // Has a Stripe customer, so the billing portal has something to show.
      hasBilling: (await customerOf(ctx, ctx.user._id)) !== null,
    };
  },
});

async function customerOf(ctx: QueryCtx, userId: Id<"users">) {
  return await ctx.db
    .query("stripeCustomers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

export const billingState = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const { tier } = await getPlan(ctx, user);
    const customer = await customerOf(ctx, userId);
    return { tier, customerId: customer?.customerId ?? null, email: user.email };
  },
});

export const linkCustomer = internalMutation({
  args: { userId: v.id("users"), customerId: v.string() },
  handler: async (ctx, { userId, customerId }) => {
    const existing = await customerOf(ctx, userId);
    if (existing) return existing.customerId;
    await ctx.db.insert("stripeCustomers", { userId, customerId });
    return customerId;
  },
});

type Price = { id: string; created: number; recurring?: { interval?: string } | null };

/** The Pro product's newest active price for an interval. */
async function proPrice(interval: "month" | "year") {
  const product = process.env.STRIPE_PRO_PRODUCT;
  if (!product) throw new Error("STRIPE_PRO_PRODUCT is not set in the Convex environment");
  const { data } = await stripe<{ data: Price[] }>("GET", "/prices", {
    product,
    active: true,
    type: "recurring",
    limit: 20,
  });
  const matching = data.filter((p) => p.recurring?.interval === interval);
  matching.sort((a, b) => b.created - a.created);
  if (!matching[0]) throw new ConvexError("PRICE_NOT_FOUND");
  return matching[0].id;
}

/** Starts a Stripe Checkout for Pro and returns the page to send the player to. */
export const checkout = userAction({
  args: { interval: v.union(v.literal("month"), v.literal("year")) },
  handler: async (ctx, { interval }): Promise<{ url: string }> => {
    const state = await ctx.runQuery(internal.billing.billingState, { userId: ctx.user._id });
    if (!state) throw new ConvexError("UNAUTHENTICATED");
    // Already Pro: changes go through the billing portal, so nobody pays twice.
    if (state.tier !== "free") throw new ConvexError("ALREADY_PRO");

    let customerId = state.customerId;
    if (!customerId) {
      const customer = await stripe<{ id: string }>("POST", "/customers", {
        email: state.email || undefined,
        metadata: { userId: ctx.user._id },
      });
      customerId = await ctx.runMutation(internal.billing.linkCustomer, {
        userId: ctx.user._id,
        customerId: customer.id,
      });
    }

    const session = await stripe<{ url: string }>("POST", "/checkout/sessions", {
      mode: "subscription",
      customer: customerId,
      client_reference_id: ctx.user._id,
      line_items: [{ price: await proPrice(interval), quantity: 1 }],
      subscription_data: { metadata: { userId: ctx.user._id } },
      success_url: `${siteUrl()}/pro?checkout=success`,
      cancel_url: `${siteUrl()}/pro?checkout=cancelled`,
    });
    return { url: session.url };
  },
});

/** Opens Stripe's billing portal for cancelling, switching interval, cards and invoices. */
export const portal = userAction({
  args: {},
  handler: async (ctx): Promise<{ url: string }> => {
    const state = await ctx.runQuery(internal.billing.billingState, { userId: ctx.user._id });
    if (!state?.customerId) throw new ConvexError("NO_BILLING");
    const session = await stripe<{ url: string }>("POST", "/billing_portal/sessions", {
      customer: state.customerId,
      return_url: `${siteUrl()}/pro`,
    });
    return { url: session.url };
  },
});

// --- The webhook (http.ts) ---

/** The subscription an event is about, read back from Stripe so out-of-order events can't undo a newer state. */
export async function subscriptionForEvent(event: StripeEvent) {
  const object = event.data.object;
  let id: string | null = null;
  if (event.type === "checkout.session.completed") {
    if (object.mode !== "subscription" || typeof object.subscription !== "string") return null;
    id = object.subscription;
  } else if (SUBSCRIPTION_EVENTS.has(event.type)) {
    id = object.id as string;
  } else {
    return null;
  }
  try {
    return subscriptionState(await stripe("GET", `/subscriptions/${id}`));
  } catch (error) {
    // A deleted customer's subscription can't be read any more; the event's copy is the last word.
    if (error instanceof StripeError && error.status === 404 && SUBSCRIPTION_EVENTS.has(event.type)) {
      return subscriptionState(object);
    }
    throw error;
  }
}

const subscriptionFields = {
  subscriptionId: v.string(),
  customerId: v.string(),
  userId: v.union(v.string(), v.null()),
  status: v.string(),
  periodEnd: v.number(),
  interval: v.union(v.literal("month"), v.literal("year"), v.null()),
  cancelAtPeriodEnd: v.boolean(),
};

/** Records the event once and writes the entitlement its subscription gives. */
export const applyEvent = internalMutation({
  args: { eventId: v.string(), type: v.string(), subscription: v.union(v.object(subscriptionFields), v.null()) },
  handler: async (ctx, { eventId, type, subscription }) => {
    const seen = await ctx.db
      .query("stripeEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .unique();
    if (seen) return "duplicate";
    const now = Date.now();
    await ctx.db.insert("stripeEvents", { eventId, type, receivedAt: now });
    if (!subscription) return "ignored";

    // The user from the Checkout's metadata, else from the customer link.
    let userId = subscription.userId ? ctx.db.normalizeId("users", subscription.userId) : null;
    if (userId && !(await ctx.db.get(userId))) userId = null;
    if (!userId) {
      const link = await ctx.db
        .query("stripeCustomers")
        .withIndex("by_customer", (q) => q.eq("customerId", subscription.customerId))
        .unique();
      userId = link?.userId ?? null;
    }
    // A deleted account, or a customer made outside the app.
    if (!userId) return "no-user";

    if (!(await customerOf(ctx, userId))) {
      await ctx.db.insert("stripeCustomers", { userId, customerId: subscription.customerId });
    }
    return await applySubscription(ctx, userId, subscription, now);
  },
});

/** Account deletion: deleting the customer cancels its subscriptions at once. */
export const deleteCustomer = internalAction({
  args: { customerId: v.string() },
  handler: async (_ctx, { customerId }) => {
    try {
      await stripe("DELETE", `/customers/${customerId}`);
    } catch (error) {
      if (error instanceof StripeError && error.status === 404) return;
      throw error;
    }
  },
});
