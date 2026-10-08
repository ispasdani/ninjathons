function mostMeetings(meetings) {
  const byEnd = [...meetings].sort((a, b) => a[1] - b[1]);
  let count = 0;
  let free = -Infinity;
  for (const [start, end] of byEnd) {
    if (start >= free) {
      count++;
      free = end;
    }
  }
  return count;
}
