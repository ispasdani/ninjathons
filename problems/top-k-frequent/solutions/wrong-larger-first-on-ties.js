// Breaks ties the wrong way: the larger value first.
function topKFrequent(nums, k) {
  const count = new Map();
  for (const x of nums) count.set(x, (count.get(x) ?? 0) + 1);
  return [...count.keys()].sort((a, b) => count.get(b) - count.get(a) || b - a).slice(0, k);
}
