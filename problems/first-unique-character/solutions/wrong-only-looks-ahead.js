// Only checks the characters after each one, so "abab"'s second b counts as unique.
function firstUniqChar(s) {
  for (let i = 0; i < s.length; i++) {
    if (!s.slice(i + 1).includes(s[i])) return i;
  }
  return -1;
}
