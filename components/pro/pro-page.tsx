"use client";

import { useAction, useConvexAuth, useQuery } from "convex/react";
import { Check } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

const eyebrow = "font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase";

type Price = { amount: number; currency: string } | null;
type Prices = { month: Price; year: Price; testMode: boolean };

function money(price: { amount: number; currency: string }, perMonth = false) {
  const amount = perMonth ? price.amount / 12 : price.amount;
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: price.currency.toUpperCase(),
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100);
}

function date(at: number) {
  return new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

// What Pro adds at launch (roadmap, Free vs Pro), and what stays free.
const PRO = [
  "Every roadmap module, not just the first",
  "All 10 profile themes",
  "Your accent colour, banner, heading font and section order",
  "A short profile address: ninjathons.com/you",
  "The Pro badge on your profile",
];
const FREE = [
  "Every problem, in every language",
  "1v1 and Territory, ranked and unranked",
  "Daily and weekly challenges",
  "Tutorials, the first module of each roadmap and the docs library",
  "XP, levels, badges and every leaderboard",
  "Your profile with free and earned themes, and groups",
];

function Features({ items, title }: { items: string[]; title: string }) {
  return (
    <div>
      <h2 className={eyebrow}>{title}</h2>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-[15px] leading-snug">
            <Check className="mt-0.5 size-4 shrink-0 text-brand-text" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** What you're on, and the button that changes it: sign in, Checkout or the billing portal. */
function Plan({ interval }: { interval: "month" | "year" }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const plan = useQuery(api.billing.plan, isAuthenticated ? {} : "skip");
  const checkout = useAction(api.billing.checkout);
  const portal = useAction(api.billing.portal);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(action: () => Promise<{ url: string }>) {
    setBusy(true);
    setError(null);
    try {
      const { url } = await action();
      window.location.assign(url);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  if (isLoading || (isAuthenticated && plan === undefined)) {
    return <Button disabled className="w-full">Loading…</Button>;
  }
  if (!isAuthenticated) {
    return (
      <Button asChild className="w-full">
        <Link href="/sign-in?redirect_url=/pro">Sign in to get Pro</Link>
      </Button>
    );
  }
  if (plan && plan.tier !== "free") {
    return (
      <div>
        <p className="text-[13px]" role="status">
          <span className="font-medium">You&apos;re on Pro</span>
          {plan.interval && <span className="text-muted-foreground">, billed {plan.interval === "year" ? "yearly" : "monthly"}</span>}.
          {plan.expiresAt && (
            <span className="text-muted-foreground">
              {" "}
              {plan.cancelAtPeriodEnd ? "It ends" : "It renews"} around {date(plan.expiresAt)}.
            </span>
          )}
        </p>
        {plan.hasBilling && (
          <Button variant="outline" className="mt-3 w-full" disabled={busy} onClick={() => go(() => portal({}))}>
            {busy ? "Opening…" : "Manage billing"}
          </Button>
        )}
        {error && <p className="mt-2 text-[13px] text-destructive">{error}</p>}
      </div>
    );
  }
  return (
    <div>
      <Button className="w-full" disabled={busy} onClick={() => go(() => checkout({ interval }))}>
        {busy ? "Opening Checkout…" : `Get Pro ${interval === "year" ? "yearly" : "monthly"}`}
      </Button>
      {plan?.hasBilling && (
        <button
          type="button"
          disabled={busy}
          onClick={() => go(() => portal({}))}
          className="mt-2 w-full text-center text-[13px] text-muted-foreground hover:text-foreground"
        >
          Past invoices
        </button>
      )}
      {error && <p className="mt-2 text-[13px] text-destructive">{error}</p>}
    </div>
  );
}

/** Back from Stripe: Pro shows once the webhook has written it, usually within seconds. */
function Returned() {
  const params = useSearchParams();
  const { isAuthenticated } = useConvexAuth();
  const plan = useQuery(api.billing.plan, isAuthenticated ? {} : "skip");
  const outcome = params.get("checkout");
  if (outcome === "cancelled") {
    return <p className="rounded-md border p-4 text-[13px]">Checkout cancelled. Nothing was charged.</p>;
  }
  if (outcome !== "success") return null;
  const active = plan && plan.tier !== "free";
  return (
    <p className={cn("rounded-md border p-4 text-[13px]", active && "bg-brand/10 shadow-[inset_2px_0_0_var(--brand)]")} role="status">
      {active ? (
        <>
          <span className="font-medium">Welcome to Pro.</span> Every roadmap module is open, and your profile can use
          every theme.{" "}
          <Link href="/settings/profile" className="text-brand-text hover:underline">
            Edit your profile
          </Link>
          .
        </>
      ) : (
        "Payment received. Turning on Pro… this usually takes a few seconds."
      )}
    </p>
  );
}

export function ProPage({ prices }: { prices: Prices }) {
  const [interval, setBilling] = useState<"month" | "year">("year");
  const price = prices[interval];
  const saving =
    prices.month && prices.year ? Math.round((1 - prices.year.amount / (prices.month.amount * 12)) * 100) : null;

  return (
    <div className="mx-auto max-w-4xl">
      <Returned />
      <header className="mt-6">
        <p className={eyebrow}>Ninjathons Pro</p>
        <h1 className="mt-2 text-3xl text-balance sm:text-4xl">Learn the whole path, and make your profile yours</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Competing, practice and progression stay free. Pro opens every roadmap module and the full profile
          customisation.
        </p>
      </header>

      <div className="mt-10 grid gap-8 md:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
          <Features title="With Pro" items={PRO} />
          <Features title="Free for everyone" items={FREE} />
        </div>

        <aside className="order-first h-fit rounded-md border p-6 md:order-none" aria-label="Price">
          <div role="radiogroup" aria-label="Billing" className="grid grid-cols-2 rounded-md border p-0.5 text-[13px]">
            {(["month", "year"] as const).map((i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={interval === i}
                onClick={() => setBilling(i)}
                className={cn("rounded-sm py-1.5", interval === i ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
              >
                {i === "month" ? "Monthly" : "Yearly"}
              </button>
            ))}
          </div>
          {price ? (
            <>
              <p className="mt-6 flex items-baseline gap-1.5">
                <span className="font-mono text-4xl font-medium tabular-nums">{money(price)}</span>
                <span className="text-[13px] text-muted-foreground">/ {interval}</span>
              </p>
              <p className="mt-1 h-5 text-[13px] text-muted-foreground">
                {interval === "year" && `${money(price, true)} a month`}
                {interval === "year" && saving !== null && saving > 0 && ` · ${saving}% less than monthly`}
              </p>
            </>
          ) : (
            <p className="mt-6 text-[13px] text-muted-foreground">Prices are on their way.</p>
          )}
          <div className="mt-6">
            <Plan interval={interval} />
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Paid through Stripe. Cancel any time from Manage billing; Pro lasts to the end of the period you paid for.
          </p>
          {prices.testMode && (
            <p className="mt-3 rounded-sm bg-bg-secondary px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
              Test mode: card 4242 4242 4242 4242, any future date, any CVC. Nothing is charged.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
