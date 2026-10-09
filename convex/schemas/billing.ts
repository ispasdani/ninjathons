import { defineTable } from "convex/server";
import { v } from "convex/values";

// The Stripe customer behind a user, created at their first Checkout
// (decisions §18). Deleted with the account.
export const stripeCustomers = defineTable({
  userId: v.id("users"),
  customerId: v.string(),
})
  .index("by_user", ["userId"])
  .index("by_customer", ["customerId"]);

// Every Stripe event the webhook has handled, by id, so a retried delivery
// is handled once.
export const stripeEvents = defineTable({
  eventId: v.string(),
  type: v.string(),
  receivedAt: v.number(),
}).index("by_eventId", ["eventId"]);

// The Pro product's active prices, copied from Stripe every hour (and on
// demand) by billing.syncPrices, so the Pro page shows Stripe's numbers
// without calling Stripe. Checkout reads Stripe itself.
export const stripePrices = defineTable({
  priceId: v.string(),
  interval: v.union(v.literal("month"), v.literal("year")),
  // In the currency's smallest unit (cents).
  amount: v.number(),
  currency: v.string(),
  // False for test mode.
  livemode: v.boolean(),
}).index("by_interval", ["interval"]);
