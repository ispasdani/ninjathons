// Correct but tries every capacity up from the heaviest package: must time
// out on the large tests.
function minCapacity(weights, days) {
  for (let capacity = Math.max(...weights); ; capacity++) {
    let count = 1;
    let load = 0;
    for (const w of weights) {
      if (load + w > capacity) {
        count++;
        load = 0;
      }
      load += w;
    }
    if (count <= days) return capacity;
  }
}
