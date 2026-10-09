import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { Suspense } from "react";

import { ProPage } from "@/components/pro/pro-page";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = {
  title: "Pro",
  description: "Every roadmap module and full profile customisation. Competing and practice stay free.",
};

// Public (decisions §18): the prices come from Stripe through Convex, then the
// button depends on whether you're signed in and on Pro.
export default async function ProRoute() {
  const prices = await fetchQuery(api.billing.prices, {});
  return (
    <Suspense>
      <ProPage prices={prices} />
    </Suspense>
  );
}
