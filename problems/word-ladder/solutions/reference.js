function ladderLength(begin, end, words) {
  const left = new Set(words);
  if (!left.has(end)) return 0;
  left.delete(begin);
  let frontier = [begin];
  for (let length = 1; frontier.length; length++) {
    const next = [];
    for (const w of frontier) {
      if (w === end) return length;
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
