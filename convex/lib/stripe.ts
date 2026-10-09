/**
 * Stripe without the SDK (decisions §18): the webhook signature check, the
 * few REST calls we make, and the rule that turns a subscription into an
 * entitlement. Runs in the Convex runtime, so only fetch and Web Crypto.
 */

const API = "https://api.stripe.com/v1";

// Stripe's default tolerance for a signature's timestamp.
const TOLERANCE_SECONDS = 5 * 60;

export const GRACE_MS = 2 * 24 * 60 * 60 * 1000;

const ACTIVE = new Set(["active", "trialing", "past_due"]);

export type StripeEvent = {
  id: string;
  type: string;
  created: number;
  data: { object: Record<string, unknown> };
};

/** The parts of a subscription the entitlement needs, read from Stripe's object. */
export type SubscriptionState = {
  subscriptionId: string;
  customerId: string;
  // From the Checkout's subscription_data.metadata.
  userId: string | null;
  status: string;
  // Milliseconds. Newer API versions keep it on each item, older ones on the subscription.
  periodEnd: number;
  interval: "month" | "year" | null;
  cancelAtPeriodEnd: boolean;
};

async function hmacHex(secret: string, message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function equalTimingSafe(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The `Stripe-Signature` header for a payload, as Stripe signs it. For tests. */
export async function signPayload(payload: string, secret: string, timestamp: number) {
  return `t=${timestamp},v1=${await hmacHex(secret, `${timestamp}.${payload}`)}`;
}

/**
 * Checks a webhook delivery's `Stripe-Signature` header and returns the event,
 * or null for a bad signature, an old timestamp or a body that isn't JSON.
 */
export async function verifyStripeEvent(
  payload: string,
  header: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<StripeEvent | null> {
  if (!header) return null;
  const parts = header.split(",").map((p) => p.split("=", 2) as [string, string]);
  const timestamp = Number(parts.find(([k]) => k === "t")?.[1]);
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!Number.isFinite(timestamp) || signatures.length === 0) return null;
  if (Math.abs(nowSeconds - timestamp) > TOLERANCE_SECONDS) return null;

  const expected = await hmacHex(secret, `${timestamp}.${payload}`);
  if (!signatures.some((s) => equalTimingSafe(s, expected))) return null;
  try {
    return JSON.parse(payload) as StripeEvent;
  } catch {
    return null;
  }
}

/** Form-encodes nested params the way Stripe's API reads them: `a[b][0][c]=…`. */
export function toForm(params: Record<string, unknown>, prefix = ""): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === "object") out.push(...toForm(value as Record<string, unknown>, name));
    else out.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
  }
  return out;
}

export class StripeError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** One call to Stripe's REST API with the secret key from the Convex environment. */
export async function stripe<T = Record<string, unknown>>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set in the Convex environment");
  const form = toForm(params).join("&");
  const url = method === "POST" || !form ? `${API}${path}` : `${API}${path}?${form}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: method === "POST" ? form : undefined,
  });
  const body = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) throw new StripeError(response.status, body.error?.message ?? `Stripe ${response.status}`);
  return body;
}

type StripeSubscription = {
  id: string;
  customer: string | { id: string };
  status: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  metadata?: Record<string, string>;
  items?: { data?: { current_period_end?: number; price?: { recurring?: { interval?: string } } }[] };
};

export function subscriptionState(raw: Record<string, unknown>): SubscriptionState {
  const sub = raw as unknown as StripeSubscription;
  const items = sub.items?.data ?? [];
  const ends = items.map((i) => i.current_period_end ?? 0);
  const periodEnd = Math.max(sub.current_period_end ?? 0, ...ends);
  const interval = items[0]?.price?.recurring?.interval;
  return {
    subscriptionId: sub.id,
    customerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    userId: sub.metadata?.userId ?? null,
    status: sub.status,
    periodEnd: periodEnd * 1000,
    interval: interval === "month" || interval === "year" ? interval : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
  };
}

/**
 * The entitlement a subscription gives: Pro to the end of its period plus
 * 2 days while it's active, trialing or past due; ended now otherwise.
 */
export function entitlementFor(state: SubscriptionState, now: number) {
  const active = ACTIVE.has(state.status);
  return {
    tier: active ? ("pro" as const) : ("free" as const),
    expiresAt: active ? state.periodEnd + GRACE_MS : now,
    subscriptionId: state.subscriptionId,
    status: state.status,
    interval: state.interval ?? undefined,
    cancelAtPeriodEnd: state.cancelAtPeriodEnd,
  };
}

export function isActiveStatus(status: string) {
  return ACTIVE.has(status);
}
