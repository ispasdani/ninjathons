// Rounds each book's hours down, so a part-finished hour isn't counted.
function minReadingSpeed(pages, hours) {
  const fits = (k) => pages.reduce((sum, p) => sum + Math.floor(p / k), 0) <= hours;
  let lo = 1;
  let hi = Math.max(...pages);
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (fits(mid)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}
