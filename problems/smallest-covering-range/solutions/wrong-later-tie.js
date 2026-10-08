// Replaces the best range on a tie in width, so it keeps the last range of
// that width instead of the one with the smallest start.
function smallestRange(lists) {
  const pos = lists.map(() => 0);
  let best = null;
  for (;;) {
    let low = 0;
    let largest = -Infinity;
    for (let i = 0; i < lists.length; i++) {
      if (lists[i][pos[i]] < lists[low][pos[low]]) low = i;
      largest = Math.max(largest, lists[i][pos[i]]);
    }
    const a = lists[low][pos[low]];
    if (!best || largest - a <= best[1] - best[0]) best = [a, largest];
    if (++pos[low] === lists[low].length) return best;
  }
}
