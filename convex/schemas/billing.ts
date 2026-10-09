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
