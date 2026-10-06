function maxSlidingWindow(nums, k) {
  const deque = new Int32Array(nums.length);
  let head = 0;
  let tail = 0;
  const out = [];
  for (let i = 0; i < nums.length; i++) {
    while (tail > head && nums[deque[tail - 1]] <= nums[i]) tail--;
    deque[tail++] = i;
    if (deque[head] <= i - k) head++;
    if (i >= k - 1) out.push(nums[deque[head]]);
  }
  return out;
}
