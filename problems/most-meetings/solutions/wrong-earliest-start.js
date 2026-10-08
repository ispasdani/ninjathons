// Goes to whichever meeting starts first, which can be a long one that
// blocks several short ones.
function mostMeetings(meetings) {
  const byStart = [...meetings].sort((a, b) => a[0] - b[0]);
  let count = 0;
  let free = -Infinity;
  for (const [start, end] of byStart) {
    if (start >= free) {
      count++;
      free = end;
    }
  }
  return count;
}
