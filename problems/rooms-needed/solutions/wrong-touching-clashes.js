// Frees a room only after its meeting has ended strictly before the next
// start, so back-to-back meetings need an extra room.
function roomsNeeded(meetings) {
  const starts = Float64Array.from(meetings, (m) => m[0]).sort();
  const ends = Float64Array.from(meetings, (m) => m[1]).sort();
  let inUse = 0;
  let most = 0;
  let e = 0;
  for (const start of starts) {
    while (ends[e] < start) {
      e++;
      inUse--;
    }
    inUse++;
    if (inUse > most) most = inUse;
  }
  return most;
}
