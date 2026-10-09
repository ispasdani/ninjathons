"use client";

import { useMutation, useQuery } from "convex/react";
import { ArrowDown, ArrowUp, Lock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { LookValues } from "@/components/profile/look";
import { type About, ProfileView } from "@/components/profile/profile-page";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { accentFits, BANNERS, FONTS, THEMES, themeById } from "@/convex/lib/themes";
import { errorCode, errorMessage } from "@/lib/errors";
import { LANGUAGE_NAMES } from "@/lib/share";
import { cn } from "@/lib/utils";

const eyebrow = "font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase";
const input =
  "h-9 w-full rounded-md border bg-background px-3 text-[13px] hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:bg-bg-secondary";

const LANGUAGES = ["javascript", "typescript", "python", "java", "csharp", "cpp", "rust"] as const;
type Language = (typeof LANGUAGES)[number];
const SECTION_NAMES: Record<string, string> = {
  about: "About",
  pinned: "Pinned solutions",
  activity: "Activity",
  rating: "1v1 rating",
  badges: "Badges",
  recent: "Recent games",
};
const BANNER_NAMES: Record<string, string> = { none: "None", dots: "Dots", grid: "Grid", diagonal: "Diagonal", waves: "Waves", hex: "Hex" };

type Draft = {
  about: { bio: string; links: string[]; languages: Language[] };
  theme: string;
  custom: Omit<LookValues, "theme">;
};

function ProTag() {
  return (
    <span className="rounded-xs border border-pro-border bg-pro px-1 font-mono text-[10px] font-medium tracking-[0.08em] text-pro-foreground uppercase">
      Pro
    </span>
  );
}

function Panel({ title, pro, children }: { title: string; pro?: boolean; children: React.ReactNode }) {
  return (
    <section className="rounded-md border p-5">
      <h2 className={cn(eyebrow, "flex items-center gap-2")}>
        {title}
        {pro && <ProTag />}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * The profile editor (decisions §18): the free fields, themes and pins for
 * everyone; the Pro options previewed by anyone and saved only with Pro. The
 * preview on the right is the real profile drawn with the draft values.
 */
export function ProfileEditor() {
  const data = useQuery(api.profiles.editor);
  const profile = useQuery(api.profiles.get, data?.username ? { username: data.username } : "skip");
  const saveAbout = useMutation(api.profiles.saveAbout);
  const saveTheme = useMutation(api.profiles.saveTheme);
  const saveCustom = useMutation(api.profiles.saveCustom);
  const pin = useMutation(api.profiles.pin);
  const unpin = useMutation(api.profiles.unpin);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "pro">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  if (data === undefined || (data.username && profile === undefined)) {
    return <p className="text-[13px] text-muted-foreground">Loading…</p>;
  }
  if (!data.username || !profile || profile.redirect !== null) {
    return (
      <p className="text-[13px] text-muted-foreground">
        <Link href="/onboarding" className="text-brand-text hover:underline">
          Pick a username
        </Link>{" "}
        first; it&apos;s your profile&apos;s address.
      </p>
    );
  }

  const saved: Draft = {
    about: {
      bio: data.about.bio,
      links: [...data.about.links, "", "", "", ""].slice(0, 4),
      languages: data.about.languages as Language[],
    },
    theme: data.theme,
    custom: data.custom,
  };
  const d = draft ?? saved;
  const set = (next: Partial<Draft>) => {
    setDraft({ ...d, ...next });
    setState("idle");
  };
  const setCustom = (next: Partial<Draft["custom"]>) => set({ custom: { ...d.custom, ...next } });

  const unlocked = new Set(data.unlocked);
  const theme = themeById(d.theme);
  const accentOk = d.custom.accent === null || accentFits(theme, d.custom.accent);
  const usesPro =
    theme.kind === "pro" ||
    d.custom.accent !== null ||
    d.custom.banner !== "none" ||
    d.custom.headingFont !== "geist" ||
    d.custom.sections.hidden.length > 0 ||
    d.custom.sections.order.join() !== saved.custom.sections.order.join();
  const customChanged = JSON.stringify(d.custom) !== JSON.stringify(saved.custom);
  const dirty = draft !== null && JSON.stringify(d) !== JSON.stringify(saved);

  const about: About = { bio: d.about.bio.trim(), links: d.about.links.map((l) => l.trim()).filter(Boolean), languages: d.about.languages };
  const look: LookValues = { theme: d.theme, ...d.custom };

  async function save() {
    setState("saving");
    setError(null);
    try {
      await saveAbout({ bio: d.about.bio, links: d.about.links, languages: d.about.languages });
      if (d.theme !== saved.theme) await saveTheme({ theme: d.theme });
      if (customChanged) await saveCustom(d.custom);
      setDraft(null);
      setState("saved");
    } catch (e) {
      if (errorCode(e) === "PRO_REQUIRED") {
        setState("pro");
      } else {
        setError(errorMessage(e));
        setState("idle");
      }
    }
  }

  async function togglePin(submissionId: Id<"submissions">, problemId: Id<"problems">, pinned: boolean) {
    setPinError(null);
    try {
      if (pinned) await unpin({ problemId });
      else await pin({ submissionId });
    } catch (e) {
      setPinError(errorMessage(e));
    }
  }

  function move(index: number, by: number) {
    const order = [...d.custom.sections.order];
    const [item] = order.splice(index, 1);
    order.splice(index + by, 0, item);
    setCustom({ sections: { ...d.custom.sections, order } });
  }

  function toggleHidden(section: string) {
    const hidden = d.custom.sections.hidden.includes(section)
      ? d.custom.sections.hidden.filter((s) => s !== section)
      : [...d.custom.sections.hidden, section];
    setCustom({ sections: { ...d.custom.sections, hidden } });
  }

  const pinnedIds = new Set(data.pins.map((p) => p.problemId));

  return (
    <div className="grid gap-8 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="space-y-5">
        <Panel title="About">
          <label htmlFor="bio" className="text-[13px] font-medium">
            Bio
          </label>
          <textarea
            id="bio"
            rows={3}
            maxLength={160}
            value={d.about.bio}
            onChange={(e) => set({ about: { ...d.about, bio: e.target.value } })}
            className={cn(input, "mt-1.5 h-auto resize-none py-2 leading-relaxed")}
          />
          <p className="mt-1 text-right font-mono text-xs text-muted-foreground tabular-nums">{d.about.bio.length} / 160</p>

          <p className="mt-3 text-[13px] font-medium">Links</p>
          <div className="mt-1.5 space-y-2">
            {d.about.links.map((link, i) => (
              <input
                key={i}
                type="url"
                inputMode="url"
                placeholder="https://"
                aria-label={`Link ${i + 1}`}
                value={link}
                onChange={(e) => {
                  const links = [...d.about.links];
                  links[i] = e.target.value;
                  set({ about: { ...d.about, links } });
                }}
                className={input}
              />
            ))}
          </div>

          <p className="mt-4 text-[13px] font-medium">Favourite languages</p>
          <p className="text-[13px] text-muted-foreground">Up to 3.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {LANGUAGES.map((l) => {
              const on = d.about.languages.includes(l);
              const full = !on && d.about.languages.length >= 3;
              return (
                <button
                  key={l}
                  type="button"
                  aria-pressed={on}
                  disabled={full}
                  onClick={() =>
                    set({ about: { ...d.about, languages: on ? d.about.languages.filter((x) => x !== l) : [...d.about.languages, l] } })
                  }
                  className={cn(
                    "rounded-sm border px-2 py-1 text-[13px] disabled:opacity-40",
                    on ? "border-foreground bg-foreground text-background" : "hover:border-border-strong",
                  )}
                >
                  {LANGUAGE_NAMES[l]}
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel title="Theme">
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map((t) => {
              const locked = t.kind === "earned" && !unlocked.has(t.id);
              const selected = d.theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={locked}
                  aria-pressed={selected}
                  onClick={() => set({ theme: t.id })}
                  className={cn(
                    "rounded-md border p-2 text-left disabled:cursor-not-allowed",
                    selected ? "border-foreground ring-1 ring-foreground" : "hover:border-border-strong",
                  )}
                >
                  <span className="flex h-8 overflow-hidden rounded-sm border" aria-hidden>
                    <span className="flex-1" style={{ background: t.light.bg }} />
                    <span className="w-3" style={{ background: t.light.accent }} />
                    <span className="flex-1" style={{ background: t.dark.bg }} />
                    <span className="w-3" style={{ background: t.dark.accent }} />
                  </span>
                  <span className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium">
                    {t.name}
                    {t.kind === "pro" && <ProTag />}
                    {locked && <Lock className="size-3 text-muted-foreground" aria-label="Locked" />}
                  </span>
                  {t.kind === "earned" && (
                    <span className="block text-xs text-muted-foreground">{locked ? t.unlock : "Earned"}</span>
                  )}
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel title="Customise" pro>
          {!data.pro && (
            <p className="mb-4 text-[13px] text-muted-foreground">
              Try these in the preview. Saving them needs{" "}
              <Link href="/pro" className="text-brand-text hover:underline">
                Pro
              </Link>
              .
            </p>
          )}
          <p className="text-[13px] font-medium">Accent</p>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="color"
              aria-label="Accent colour"
              value={d.custom.accent ?? (theme.light.accent as string)}
              onChange={(e) => setCustom({ accent: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded-md border bg-background p-1"
            />
            <span className="font-mono text-[13px] tabular-nums">{d.custom.accent ?? "Theme's own"}</span>
            {d.custom.accent && (
              <button type="button" onClick={() => setCustom({ accent: null })} className="ml-auto text-[13px] text-muted-foreground hover:text-foreground">
                Reset
              </button>
            )}
          </div>
          {!accentOk && (
            <p className="mt-1.5 text-[13px] text-destructive" role="alert">
              Hard to read on {theme.name} in light or dark mode. It won&apos;t save; try a stronger colour.
            </p>
          )}

          <label htmlFor="banner" className="mt-4 block text-[13px] font-medium">
            Banner
          </label>
          <select id="banner" value={d.custom.banner} onChange={(e) => setCustom({ banner: e.target.value })} className={cn(input, "mt-1.5")}>
            {BANNERS.map((b) => (
              <option key={b} value={b}>
                {BANNER_NAMES[b]}
              </option>
            ))}
          </select>

          <label htmlFor="font" className="mt-4 block text-[13px] font-medium">
            Heading font
          </label>
          <select id="font" value={d.custom.headingFont} onChange={(e) => setCustom({ headingFont: e.target.value })} className={cn(input, "mt-1.5")}>
            {FONTS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          <p className="mt-4 text-[13px] font-medium">Sections</p>
          <p className="text-[13px] text-muted-foreground">The header and stats always come first.</p>
          <ul className="mt-2 divide-y rounded-md border">
            {d.custom.sections.order.map((s, i) => {
              const shown = !d.custom.sections.hidden.includes(s);
              return (
                <li key={s} className="flex items-center gap-2 px-3 py-1.5 text-[13px]">
                  <label className="flex flex-1 items-center gap-2">
                    <input type="checkbox" checked={shown} onChange={() => toggleHidden(s)} />
                    <span className={cn(!shown && "text-muted-foreground line-through")}>{SECTION_NAMES[s]}</span>
                  </label>
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${SECTION_NAMES[s]} up`} className="p-1 disabled:opacity-30">
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={i === d.custom.sections.order.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label={`Move ${SECTION_NAMES[s]} down`}
                    className="p-1 disabled:opacity-30"
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>

        <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 bg-background px-1 py-3">
          <Button onClick={save} disabled={!dirty || state === "saving" || !accentOk}>
            {state === "saving" ? "Saving…" : "Save profile"}
          </Button>
          {draft && (
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Discard
            </Button>
          )}
          <p className="text-[13px]" role="status">
            {state === "saved" && <span className="text-muted-foreground">Saved.</span>}
            {state === "pro" && (
              <span>
                Your bio, links and free theme are saved. Pro themes and options are previews:{" "}
                <Link href="/pro" className="font-medium text-brand-text hover:underline">
                  get Pro
                </Link>{" "}
                to keep them.
              </span>
            )}
            {error && <span className="text-destructive">{error}</span>}
          </p>
          {usesPro && !data.pro && state !== "pro" && <p className="w-full text-xs text-muted-foreground">Your draft uses Pro options.</p>}
        </div>

        <Panel title="Pinned solutions">
          <p className="text-[13px] text-muted-foreground">
            Up to 3 accepted Submits, one per problem. Pinning makes the code public. Pins save straight away.
          </p>
          {pinError && (
            <p className="mt-2 text-[13px] text-destructive" role="alert">
              {pinError}
            </p>
          )}
          {data.candidates.length === 0 ? (
            <p className="mt-3 text-[13px] text-muted-foreground">Solve a problem to pin it here.</p>
          ) : (
            <ul className="mt-3 max-h-80 divide-y overflow-y-auto rounded-md border">
              {data.candidates.map((c) => {
                const pinned = pinnedIds.has(c.problemId);
                return (
                  <li key={c.submissionId} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{c.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {LANGUAGE_NAMES[c.language]}
                        {c.held && " · in today's daily or a weekly set"}
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant={pinned ? "default" : "outline"}
                      disabled={!pinned && c.held}
                      onClick={() => togglePin(c.submissionId, c.problemId, pinned)}
                    >
                      {pinned ? "Unpin" : "Pin"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className={eyebrow}>Preview</p>
          <Link href={`/u/${data.username}`} className="text-[13px] text-muted-foreground hover:text-foreground">
            View your profile
          </Link>
        </div>
        <div className="mt-3">
          <ProfileView profile={{ ...profile, pro: profile.pro || usesPro }} look={look} about={about} pins={profile.pins} />
        </div>
      </div>
    </div>
  );
}
