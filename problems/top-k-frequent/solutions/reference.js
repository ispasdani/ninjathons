function topKFrequent(nums, k) {
  const count = new Map();
  for (const x of nums) count.set(x, (count.get(x) ?? 0) + 1);
  return [...count.keys()]
    .sort((a, b) => count.get(b) - count.get(a) || a - b)
    .slice(0, k);
}
