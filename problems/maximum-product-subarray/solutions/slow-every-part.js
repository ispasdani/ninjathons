// Every start and end: O(n²).
function maxProduct(nums) {
  let best = -Infinity;
  for (let i = 0; i < nums.length; i++) {
    let p = 1;
    for (let j = i; j < nums.length; j++) {
      p *= nums[j];
      if (p > best) best = p;
    }
  }
  return best;
}
