// Correct but O(n^2): must time out on the large tests.
function trap(height) {
  let water = 0;
  for (let i = 0; i < height.length; i++) {
    let l = 0;
    let r = 0;
    for (let k = 0; k <= i; k++) l = Math.max(l, height[k]);
    for (let k = i; k < height.length; k++) r = Math.max(r, height[k]);
    water += Math.min(l, r) - height[i];
  }
  return water;
}
