/**
 * The Convex guardrail (docs/03-challenge-platform-architecture.html):
 * every check happens here, before data leaves the server.
 *
 * Public functions must be built from these wrappers. The raw `query`,
 * `mutation` and `action` builders are blocked outside convex/lib by ESLint.
 * Internal functions (internalQuery, internalMutation, internalAction) and
 * httpAction are not callable from the browser and stay allowed everywhere.
 */
import { ConvexError } from "convex/values";
import {
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";

import type { Doc } from "../_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

/** The signed-in user's row, or null when signed out or not yet synced from Clerk. */
export async function getCurrentUserOrNull(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

export async function requireUser(ctx: Ctx) {
  const user = await getCurrentUserOrNull(ctx);
  if (!user) throw new ConvexError("UNAUTHENTICATED");
  return user;
}

export async function getPlan(ctx: Ctx, user: Doc<"users">) {
  const plan = await ctx.db
    .query("entitlements")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .unique();
  const active = plan !== null && plan.tier !== "free" && plan.expiresAt > Date.now();
  return { tier: active ? plan.tier : "free", plan };
}

async function requirePro(ctx: Ctx) {
  const user = await requireUser(ctx);
  const { tier, plan } = await getPlan(ctx, user);
  if (tier === "free" || !plan) throw new ConvexError("PRO_REQUIRED");
  return { user, plan };
}

/**
 * For data that is genuinely public (problem pages, public profiles,
 * leaderboards). The handler must not return anything private.
 */
export const publicQuery = query;

/**
 * Signed in with Clerk, whether or not the users row exists yet. Adds
 * `ctx.identity`. Only for creating that row (user.ensureUser); everything
 * else uses userQuery / userMutation.
 */
export const identityMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHENTICATED");
    return { identity };
  }),
);

/** Signed-in users only. Adds `ctx.user`. */
export const userQuery = customQuery(
  query,
  customCtx(async (ctx) => ({ user: await requireUser(ctx) })),
);
export const userMutation = customMutation(
  mutation,
  customCtx(async (ctx) => ({ user: await requireUser(ctx) })),
);

/** Active Pro or Organization plan only. Adds `ctx.user` and `ctx.plan`. */
export const proQuery = customQuery(query, customCtx(requirePro));
export const proMutation = customMutation(mutation, customCtx(requirePro));
