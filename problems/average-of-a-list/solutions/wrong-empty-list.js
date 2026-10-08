// Divides by 0 on an empty list: 0 / 0 is NaN.
function average(nums) {
  let sum = 0;
  for (const x of nums) sum += x;
  return sum / nums.length;
}
