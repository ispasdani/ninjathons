import { fetchQuery } from "convex/nextjs";

import { ColorsSection } from "@/components/home/colors-section";
import {
  Challenges,
  FinalCta,
  Hero,
  HowItWorks,
  Languages,
  Leaderboards,
  Learning,
  Modes,
  Ninjathons,
  Pricing,
  Profiles,
  Progression,
  ResearchAndCoach,
  Roadmaps,
} from "@/components/home/sections";
import { api } from "@/convex/_generated/api";

function monthly(price: { amount: number; currency: string } | null) {
  if (!price) return null;
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: price.currency.toUpperCase(),
    minimumFractionDigits: price.amount % 100 === 0 ? 0 : 2,
  }).format(price.amount / 100);
}

// The marketing home page, built from the mockups canvas (Marketing homepage).
// Section order follows the mockup; the copy follows what's built (decisions).
export default async function HomePage() {
  // The Pro price comes from Stripe through Convex, as on /pro (decisions §18).
  const prices = await fetchQuery(api.billing.prices, {}).catch(() => null);

  return (
    <>
      <Hero />
      <Languages />
      <Modes />
      <HowItWorks />
      <Learning />
      <Roadmaps />
      <ResearchAndCoach />
      <Challenges />
      <ColorsSection />
      <Progression />
      <Leaderboards />
      <Profiles />
      <Ninjathons />
      <Pricing proPrice={monthly(prices?.month ?? null)} />
      <FinalCta />
    </>
  );
}
