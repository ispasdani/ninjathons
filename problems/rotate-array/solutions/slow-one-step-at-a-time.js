// Moves one value per step: O(n × k).
function rotate(nums, k) {
  const a = [...nums];
  for (let s = 0; s < k % a.length; s++) a.unshift(a.pop());
  return a;
}
