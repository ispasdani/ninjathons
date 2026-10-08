// Correct but relabels every computer on each join (O(n × edges)): must time
// out on the large tests.
function countComponents(n, edges) {
  const group = Array.from({ length: n }, (_, i) => i);
  let groups = n;
  for (const [a, b] of edges) {
    const from = group[b];
    const to = group[a];
    if (from === to) continue;
    for (let i = 0; i < n; i++) if (group[i] === from) group[i] = to;
    groups--;
  }
  return groups;
}
