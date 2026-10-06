function lengthOfLongestSubstring(s) {
  const last = new Map();
  let left = 0;
  let best = 0;
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    if (last.has(c)) left = Math.max(left, last.get(c) + 1);
    last.set(c, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}
