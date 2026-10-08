// Counts each character's occurrences from scratch: O(n²).
function firstUniqChar(s) {
  for (let i = 0; i < s.length; i++) {
    let n = 0;
    for (let j = 0; j < s.length; j++) if (s[j] === s[i]) n++;
    if (n === 1) return i;
  }
  return -1;
}
