// Correct but tries both choices at every house without remembering results
// (exponential): must time out on anything but tiny rows.
function rob(houses) {
  const best = (i) => (i >= houses.length ? 0 : Math.max(best(i + 1), houses[i] + best(i + 2)));
  return best(0);
}
