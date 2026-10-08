function validPath(n, edges, source, destination) {
  const next = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) {
    next[a].push(b);
    next[b].push(a);
  }
  const seen = new Uint8Array(n);
  const stack = [source];
  seen[source] = 1;
  while (stack.length) {
    const town = stack.pop();
    if (town === destination) return true;
    for (const other of next[town]) {
      if (!seen[other]) {
        seen[other] = 1;
        stack.push(other);
      }
    }
  }
  return false;
}
