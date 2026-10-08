function minReadingSpeed(pages, hours) {
  const fits = (k) => {
    let total = 0;
    for (const p of pages) {
      total += Math.ceil(p / k);
      if (total > hours) return false;
    }
    return true;
  };
  let lo = 1;
  let hi = Math.max(...pages);
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (fits(mid)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}
