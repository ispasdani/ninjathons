function shortestSubarray(nums, k) {
  const n = nums.length;
  const prefix = new Array(n + 1).fill(0);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + nums[i];
  // Start indices with increasing prefix sums; head and tail mark the deque.
  const deque = new Array(n + 1);
  let head = 0;
  let tail = 0;
  let best = Infinity;
  for (let j = 0; j <= n; j++) {
    while (head < tail && prefix[j] - prefix[deque[head]] >= k) {
      best = Math.min(best, j - deque[head]);
      head++;
    }
    while (head < tail && prefix[deque[tail - 1]] >= prefix[j]) tail--;
    deque[tail++] = j;
  }
  return best === Infinity ? -1 : best;
}
