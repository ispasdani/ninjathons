// Correct but sorts everything seen so far after each number: must time out
// on the large tests.
function runningMedians(nums) {
  const seen = [];
  return nums.map((x) => {
    seen.push(x);
    seen.sort((a, b) => a - b);
    return seen[(seen.length - 1) >> 1];
  });
}
