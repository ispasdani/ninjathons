function rob(houses) {
  let before = 0; // best up to two houses back
  let last = 0; // best up to the previous house
  for (const coins of houses) {
    const best = Math.max(last, before + coins);
    before = last;
    last = best;
  }
  return last;
}
