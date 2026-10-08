// Correct but tries every speed from 1: must time out on the large tests.
function minReadingSpeed(pages, hours) {
  for (let k = 1; ; k++) {
    let total = 0;
    for (const p of pages) total += Math.ceil(p / k);
    if (total <= hours) return k;
  }
}
