// Correct but exponential: must time out on longer words.
function minDistance(word1, word2) {
  const go = (i, j) => {
    if (i === 0) return j;
    if (j === 0) return i;
    if (word1[i - 1] === word2[j - 1]) return go(i - 1, j - 1);
    return 1 + Math.min(go(i - 1, j - 1), go(i - 1, j), go(i, j - 1));
  };
  return go(word1.length, word2.length);
}
