function joinCost(ropes) {
  // Two sorted queues instead of a heap: tied ropes come out in increasing
  // length, so they can wait in a plain queue behind the sorted originals.
  const original = Float64Array.from(ropes).sort();
  const tied = new Float64Array(ropes.length);
  let i = 0;
  let head = 0;
  let tail = 0;
  const shortest = () =>
    i < original.length && (head === tail || original[i] <= tied[head]) ? original[i++] : tied[head++];
  let cost = 0;
  for (let left = ropes.length; left > 1; left--) {
    const sum = shortest() + shortest();
    cost += sum;
    tied[tail++] = sum;
  }
  return cost;
}
