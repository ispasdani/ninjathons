import { ImageResponse } from "next/og";

import { duration, headline, LANGUAGE_NAMES, type MatchResult, modeName, playerName, type ResultPlayer } from "@/lib/share";
import { site } from "@/lib/site";

// The share card: 1200 × 630, the size link previews expect. Dark, with the
// duel colours for the two sides and the brand green for the name (design.md).
const SIZE = { width: 1200, height: 630 };
const COLORS = {
  background: "#0a0a0a",
  text: "#fafafa",
  muted: "#a1a1a1",
  border: "#262626",
  track: "#262626",
  brand: "#c4f012",
  sides: ["#60a5fa", "#fb7185"],
  difficulty: { easy: "#4ade80", medium: "#fbbf24", hard: "#f87171" },
};

function Side({ player, color }: { player: ResultPlayer; color: string }) {
  const total = player.total || player.bestPassed || 1;
  const name = playerName(player);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        padding: 28,
        border: `2px solid ${player.result === "win" ? color : COLORS.border}`,
        borderRadius: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 14, height: 14, borderRadius: 7, background: color }} />
        <div style={{ fontSize: name.length > 22 ? 26 : 32, fontWeight: 600, color: COLORS.text }}>
          {name.charAt(0).toUpperCase() + name.slice(1)}
        </div>
      </div>
      <div style={{ display: "flex", marginTop: 10, fontSize: 24, color: COLORS.muted }}>
        {LANGUAGE_NAMES[player.language] ?? player.language}
        {player.rating !== null ? ` · ${player.rating} ${player.tier}` : ""}
        {player.ratingChange !== null ? ` (${player.ratingChange >= 0 ? "+" : ""}${player.ratingChange})` : ""}
      </div>
      <div style={{ display: "flex", marginTop: 22, height: 12, borderRadius: 6, background: COLORS.track }}>
        <div
          style={{
            width: `${player.solvedInMs !== null ? 100 : Math.min(100, (player.bestPassed / total) * 100)}%`,
            height: 12,
            borderRadius: 6,
            background: color,
          }}
        />
      </div>
      <div style={{ display: "flex", marginTop: 10, fontSize: 22, color: COLORS.muted }}>
        {player.solvedInMs !== null
          ? `Solved in ${duration(player.solvedInMs)}`
          : `${player.bestPassed}/${player.total || "?"} tests`}
        {` · ${player.submits} ${player.submits === 1 ? "submit" : "submits"}`}
      </div>
    </div>
  );
}

/** The share card for a finished match, as a PNG response. */
export function renderCard(result: MatchResult) {
  const { title, detail } = headline(result);
  const [a, b] = result.players;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: 64,
          background: COLORS.background,
          color: COLORS.text,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: COLORS.brand }}>{site.name}</div>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 3, color: COLORS.muted }}>
            {modeName(result).toUpperCase()}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexShrink: 0,
            marginTop: 40,
            // Long names (a ghost's, say) get a smaller line so it stays on one or two.
            fontSize: title.length > 34 ? 46 : 60,
            fontWeight: 700,
            lineHeight: 1.15,
          }}
        >
          {title.charAt(0).toUpperCase() + title.slice(1)}
        </div>
        <div style={{ display: "flex", flexShrink: 0, marginTop: 14, fontSize: 28, color: COLORS.muted }}>
          {detail}
          {result.problem ? ` · ${result.problem.title}` : ""}
          {result.problem && (
            <span style={{ marginLeft: 12, color: COLORS.difficulty[result.problem.difficulty] }}>
              {result.problem.difficulty.charAt(0).toUpperCase() + result.problem.difficulty.slice(1)}
            </span>
          )}
        </div>
        <div style={{ display: "flex", flexShrink: 0, gap: 28, marginTop: "auto" }}>
          {a && <Side player={a} color={COLORS.sides[0]} />}
          {b && <Side player={b} color={COLORS.sides[1]} />}
        </div>
      </div>
    ),
    SIZE,
  );
}
