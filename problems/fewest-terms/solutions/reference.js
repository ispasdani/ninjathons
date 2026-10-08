function fewestTerms(n, prerequisites) {
  const next = Array.from({ length: n }, () => []);
  const waiting = new Int32Array(n);
  for (const [before, after] of prerequisites) {
    next[before].push(after);
    waiting[after]++;
  }
  let term = [];
  for (let i = 0; i < n; i++) if (waiting[i] === 0) term.push(i);
  let terms = 0;
  let taken = 0;
  while (term.length) {
    terms++;
    taken += term.length;
    const following = [];
    for (const course of term) {
      for (const after of next[course]) if (--waiting[after] === 0) following.push(after);
    }
    term = following;
  }
  return taken === n ? terms : -1;
}
