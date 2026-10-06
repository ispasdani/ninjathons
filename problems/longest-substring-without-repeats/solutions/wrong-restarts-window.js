// On a repeat, restarts the window at the new character, dropping valid ones.
function lengthOfLongestSubstring(s) {
  let seen = new Set();
  let best = 0;
  for (const c of s) {
    if (seen.has(c)) seen = new Set();
    seen.add(c);
    best = Math.max(best, seen.size);
  }
  return best;
}
