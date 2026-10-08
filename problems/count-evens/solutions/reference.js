function countEvens(nums) {
  let count = 0;
  for (const x of nums) if (x % 2 === 0) count++;
  return count;
}
