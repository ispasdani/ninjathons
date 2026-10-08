// Starts at 0, so a list of negative numbers returns 0.
function largest(nums) {
  let best = 0;
  for (const x of nums) if (x > best) best = x;
  return best;
}
