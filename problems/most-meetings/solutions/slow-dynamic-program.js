// Correct but O(n^2): for each meeting, the best plan ending with it, found by
// looking at every earlier one. Must time out on the large tests.
function mostMeetings(meetings) {
  const byEnd = [...meetings].sort((a, b) => a[1] - b[1]);
  const best = new Int32Array(byEnd.length);
  let overall = 0;
  for (let i = 0; i < byEnd.length; i++) {
    let before = 0;
    for (let j = 0; j < i; j++) {
      if (byEnd[j][1] <= byEnd[i][0] && best[j] > before) before = best[j];
    }
    best[i] = before + 1;
    if (best[i] > overall) overall = best[i];
  }
  return overall;
}
