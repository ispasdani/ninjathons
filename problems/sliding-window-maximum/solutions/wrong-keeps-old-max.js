// Keeps the previous maximum even after it has left the window.
function maxSlidingWindow(nums, k) {
  let best = Math.max(...nums.slice(0, k));
  const out = [best];
  for (let i = k; i < nums.length; i++) {
    best = Math.max(best, nums[i]);
    out.push(best);
  }
  return out;
}
