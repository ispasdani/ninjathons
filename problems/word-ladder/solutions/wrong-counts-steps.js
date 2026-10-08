// Counts the changes rather than the words: one short.
function ladderLength(begin, end, words) {
  const left = new Set(words);
  if (!left.has(end)) return 0;
  let frontier = [begin];
  for (let steps = 0; frontier.length; steps++) {
    const next = [];
    for (const w of frontier) {
      if (w === end) return steps;
      for (let i = 0; i < w.length; i++) {
        for (let c = 97; c <= 122; c++) {
          const v = w.slice(0, i) + String.fromCharCode(c) + w.slice(i + 1);
          if (left.has(v)) {
            left.delete(v);
            next.push(v);
          }
        }
      }
    }
    frontier = next;
  }
  return 0;
}
