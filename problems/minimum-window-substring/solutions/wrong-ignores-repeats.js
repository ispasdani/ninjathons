// Treats t as a set of characters, so "aa" is satisfied by one a.
function minWindow(s, t) {
  const need = new Set(t);
  let best = "";
  for (let i = 0; i < s.length; i++) {
    const seen = new Set();
    for (let j = i; j < s.length; j++) {
      if (need.has(s[j])) seen.add(s[j]);
      if (seen.size === need.size) {
        if (!best || j - i + 1 < best.length) best = s.slice(i, j + 1);
        break;
      }
    }
  }
  return best;
}
