// Forgets to sort first, so overlapping intervals far apart in the input stay separate.
function merge(intervals) {
  const out = [];
  for (const [s, e] of intervals) {
    const last = out[out.length - 1];
    if (last && s <= last[1] && s >= last[0]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}
