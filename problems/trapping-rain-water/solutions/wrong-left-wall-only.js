// Only looks at the tallest bar to the left, as if the right side were always high enough.
function trap(height) {
  let leftMax = 0;
  let water = 0;
  for (const h of height) {
    leftMax = Math.max(leftMax, h);
    water += leftMax - h;
  }
  return water;
}
