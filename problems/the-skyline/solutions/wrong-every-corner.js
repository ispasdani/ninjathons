// Writes a key point at every building corner, even where the height stays
// the same.
function skyline(buildings) {
  const xs = [...new Set(buildings.flatMap(([l, r]) => [l, r]))].sort((a, b) => a - b);
  const sorted = [...buildings].sort((a, b) => a[0] - b[0]);
  const result = [];
  for (const x of xs) {
    let h = 0;
    for (const [l, r, height] of sorted) {
      if (l > x) break;
      if (r > x && height > h) h = height;
    }
    result.push([x, h]);
  }
  return result;
}
