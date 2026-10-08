// From every start, grows until it has everything: O(n²).
function minWindow(s, t) {
  const need = new Map();
  for (const ch of t) need.set(ch, (need.get(ch) ?? 0) + 1);
  let best = "";
  for (let i = 0; i < s.length; i++) {
    const have = new Map();
    let missing = t.length;
    for (let j = i; j < s.length; j++) {
      const c = s[j];
      const h = (have.get(c) ?? 0) + 1;
      have.set(c, h);
      if (h <= (need.get(c) ?? 0)) missing--;
      if (missing === 0) {
        if (!best || j - i + 1 < best.length) best = s.slice(i, j + 1);
        break;
      }
    }
  }
  return best;
}
