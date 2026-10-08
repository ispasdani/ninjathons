function kthLargest(nums, k) {
  const sorted = Int32Array.from(nums).sort();
  return sorted[sorted.length - k];
}
