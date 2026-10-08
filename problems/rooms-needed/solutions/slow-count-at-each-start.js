// Correct but O(n^2): counts the meetings running at each start. Must time
// out on the large tests.
function roomsNeeded(meetings) {
  let most = 0;
  for (const [t] of meetings) {
    let running = 0;
    for (const [start, end] of meetings) if (start <= t && t < end) running++;
    if (running > most) most = running;
  }
  return most;
}
