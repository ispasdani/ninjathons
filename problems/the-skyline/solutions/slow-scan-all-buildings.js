// Correct but O(n^2): finds the tallest building at each corner by looking at
// every building. Must time out on the large tests.
function skyline(buildings) {
  const xs = [...new Set(buildings.flatMap(([l, r]) => [l, r]))].sort((a, b) => a - b);
  const result = [];
  let last = 0;
  for (const x of xs) {
    let h = 0;
    for (const [l, r, height] of buildings) if (l <= x && x < r && height > h) h = height;
    if (h !== last) {
      result.push([x, h]);
      last = h;
    }
  }
  return result;
}
