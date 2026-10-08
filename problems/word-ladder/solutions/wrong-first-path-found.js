// Depth-first: returns the first ladder it finds, not the shortest.
function ladderLength(begin, end, words) {
  const all = new Set(words);
  if (!all.has(end)) return 0;
  const seen = new Set([begin]);
  const stack = [[begin, 1]];
  while (stack.length) {
    const [w, length] = stack.pop();
    if (w === end) return length;
    for (const v of all) {
      if (seen.has(v)) continue;
      let diff = 0;
      for (let i = 0; i < w.length && diff < 2; i++) if (w[i] !== v[i]) diff++;
      if (diff === 1) {
        seen.add(v);
        stack.push([v, length + 1]);
      }
    }
  }
  return 0;
}
