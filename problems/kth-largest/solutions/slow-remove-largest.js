// Correct but finds and removes the largest value k times (O(n × k)): must
// time out on the large tests.
function kthLargest(nums, k) {
  const left = [...nums];
  let largest = 0;
  for (let round = 0; round < k; round++) {
    let at = 0;
    for (let i = 1; i < left.length; i++) if (left[i] > left[at]) at = i;
    largest = left[at];
    left[at] = left[left.length - 1];
    left.pop();
  }
  return largest;
}
