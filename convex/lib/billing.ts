/**
 * The only code that writes `entitlements` (decisions §2, §18), checked by
 * convex/billing.test.ts. Called by the Stripe webhook and by account deletion.
 */
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { entitlementFor, isActiveStatus, type SubscriptionState } from "./stripe";

/**
 * Writes the entitlement a subscription gives. A subscription that has ended
 * doesn't take Pro away from another one that's still running.
 */
export async function applySubscription(
  ctx: MutationCtx,
  userId: Id<"users">,
  state: SubscriptionState,
  now: number,
) {
  const existing = await ctx.db
    .query("entitlements")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  const fields = entitlementFor(state, now);

  if (
    existing &&
    !isActiveStatus(state.status) &&
    existing.subscriptionId !== state.subscriptionId &&
    existing.tier !== "free" &&
    existing.expiresAt > now
  ) {
    return "kept";
  }
  if (existing) await ctx.db.patch(existing._id, fields);
  else await ctx.db.insert("entitlements", { userId, ...fields });
  return fields.tier;
}

/** Account deletion: the plan and the Stripe link go; returns the customer to delete in Stripe. */
export async function removeBilling(ctx: MutationCtx, userId: Id<"users">) {
  const plans = await ctx.db
    .query("entitlements")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const plan of plans) await ctx.db.delete(plan._id);

  const customers = await ctx.db
    .query("stripeCustomers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const customer of customers) await ctx.db.delete(customer._id);
  return customers.map((c) => c.customerId);
}
