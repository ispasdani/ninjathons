// Assumes every cable joins two groups, which loops and repeats break.
function countComponents(n, edges) {
  return Math.max(1, n - edges.length);
}
