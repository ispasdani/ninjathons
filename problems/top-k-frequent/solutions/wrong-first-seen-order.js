// Takes the k most frequent but returns them in the order first seen.
function topKFrequent(nums, k) {
  const count = new Map();
  for (const x of nums) count.set(x, (count.get(x) ?? 0) + 1);
  const keep = new Set([...count.keys()].sort((a, b) => count.get(b) - count.get(a) || a - b).slice(0, k));
  return [...count.keys()].filter((x) => keep.has(x));
}
