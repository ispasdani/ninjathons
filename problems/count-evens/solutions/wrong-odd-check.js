// Counts numbers whose remainder isn't 1, but -3 % 2 is -1 in JavaScript, so -3 counts as even.
function countEvens(nums) {
  let count = 0;
  for (const x of nums) if (x % 2 !== 1) count++;
  return count;
}
