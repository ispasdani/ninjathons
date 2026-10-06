function trap(height) {
  let i = 0;
  let j = height.length - 1;
  let leftMax = 0;
  let rightMax = 0;
  let water = 0;
  while (i < j) {
    if (height[i] < height[j]) {
      leftMax = Math.max(leftMax, height[i]);
      water += leftMax - height[i++];
    } else {
      rightMax = Math.max(rightMax, height[j]);
      water += rightMax - height[j--];
    }
  }
  return water;
}
