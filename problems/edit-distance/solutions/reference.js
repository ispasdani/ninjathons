function minDistance(word1, word2) {
  const m = word2.length;
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= word1.length; i++) {
    const cur = [i];
    for (let j = 1; j <= m; j++) {
      cur[j] = word1[i - 1] === word2[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], cur[j - 1]);
    }
    prev = cur;
  }
  return prev[m];
}
