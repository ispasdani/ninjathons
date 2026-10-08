// Sorts once and keeps adding the next rope to one growing rope, which isn't
// always tying the two shortest.
function joinCost(ropes) {
  const sorted = [...ropes].sort((a, b) => a - b);
  let cost = 0;
  let rope = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    rope += sorted[i];
    cost += rope;
  }
  return cost;
}
