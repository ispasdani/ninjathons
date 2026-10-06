function search(nums, queries) {
  return queries.map((q) => {
    let lo = 0;
    let hi = nums.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (nums[mid] === q) return mid;
      if (nums[mid] < q) lo = mid + 1;
      else hi = mid - 1;
    }
    return -1;
  });
}
