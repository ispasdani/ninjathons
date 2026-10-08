// Slices without reducing k first, so k bigger than the length goes wrong.
function rotate(nums, k) {
  return [...nums.slice(nums.length - k), ...nums.slice(0, nums.length - k)];
}
