// Correct but cuts each link and searches again (O(links × (n + links))):
// must time out on the large tests.
function criticalLinks(n, links) {
  const adj = Array.from({ length: n }, () => []);
  links.forEach(([a, b], id) => {
    adj[a].push([b, id]);
    adj[b].push([a, id]);
  });
  const seen = new Int32Array(n).fill(-1);
  const result = [];
  links.forEach(([a, b], cut) => {
    // Can b still reach a without this link?
    const stack = [b];
    seen[b] = cut;
    let found = false;
    while (stack.length && !found) {
      const u = stack.pop();
      for (const [v, id] of adj[u]) {
        if (id === cut || seen[v] === cut) continue;
        if (v === a) {
          found = true;
          break;
        }
        seen[v] = cut;
        stack.push(v);
      }
    }
    if (!found) result.push(a < b ? [a, b] : [b, a]);
  });
  return result;
}
