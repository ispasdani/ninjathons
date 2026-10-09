import type { UserJSON, WebhookEvent } from "@clerk/nextjs/server";
import { httpRouter } from "convex/server";
import { Webhook } from "svix";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { subscriptionForEvent } from "./billing";
import { verifyStripeEvent } from "./lib/stripe";

const handleClerkWebhook = httpAction(async (ctx, request) => {
  const event = await validateRequest(request);
  if (!event) {
    return new Response("Invalid request", { status: 400 });
  }

  switch (event.type) {
    case "user.created":
    case "user.updated":
      await ctx.runMutation(internal.user.upsertFromClerk, toUserFields(event.data));
      break;
    case "user.deleted":
      if (event.data.id) {
        await ctx.runMutation(internal.user.deleteFromClerk, {
          clerkId: event.data.id,
        });
      }
      break;
  }

  return new Response(null, { status: 200 });
});

// Clerk allows sign-ups without a first name or without an email (phone,
// some OAuth providers), so every field needs a fallback.
function toUserFields(data: UserJSON) {
  const email =
    data.email_addresses.find((e) => e.id === data.primary_email_address_id)
      ?.email_address ??
    data.email_addresses[0]?.email_address ??
    "";
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ");
  const name = fullName || data.username || email.split("@")[0] || "Player";

  return {
    clerkId: data.id,
    email,
    name,
    imageUrl: data.image_url ?? "",
  };
}

// Stripe's subscription events (decisions §18). The only way a plan changes.
const handleStripeWebhook = httpAction(async (ctx, request) => {
  // Set STRIPE_WEBHOOK_SECRET in the Convex dashboard (Settings → Environment Variables).
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not defined");

  const event = await verifyStripeEvent(await request.text(), request.headers.get("stripe-signature"), secret);
  if (!event) return new Response("Invalid signature", { status: 400 });

  // Stripe retries anything but a 2xx, so a failed read from Stripe is tried again later.
  const subscription = await subscriptionForEvent(event);
  await ctx.runMutation(internal.billing.applyEvent, { eventId: event.id, type: event.type, subscription });
  return new Response(null, { status: 200 });
});

const http = httpRouter();

http.route({
  path: "/clerk",
  method: "POST",
  handler: handleClerkWebhook,
});

http.route({
  path: "/stripe",
  method: "POST",
  handler: handleStripeWebhook,
});

async function validateRequest(req: Request): Promise<WebhookEvent | undefined> {
  // Set CLERK_WEBHOOK_SECRET in the Convex dashboard (Settings → Environment Variables).
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("CLERK_WEBHOOK_SECRET is not defined");
  }

  const payload = await req.text();
  const svixHeaders = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  try {
    // svix v2 verify() throws on a bad signature and returns nothing, so parse the payload ourselves
    new Webhook(webhookSecret).verify(payload, svixHeaders);
  } catch (error) {
    console.error("Error verifying Clerk webhook", error);
    return undefined;
  }
  return JSON.parse(payload) as WebhookEvent;
}

export default http;
