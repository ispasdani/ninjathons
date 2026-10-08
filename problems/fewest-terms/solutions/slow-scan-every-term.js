// Correct but scans every course each term to find the ready ones: must time
// out on a long chain.
function fewestTerms(n, prerequisites) {
  const needs = Array.from({ length: n }, () => []);
  for (const [before, after] of prerequisites) needs[after].push(before);
  const passedIn = new Int32Array(n).fill(0); // 0: not passed yet
  let terms = 0;
  let taken = 0;
  while (taken < n) {
    terms++;
    let added = 0;
    for (let c = 0; c < n; c++) {
      if (passedIn[c]) continue;
      if (needs[c].every((b) => passedIn[b] && passedIn[b] < terms)) {
        passedIn[c] = terms;
        added++;
      }
    }
    if (!added) return -1;
    taken += added;
  }
  return terms;
}
