function isPalindrome(s) {
  const keep = (c) => /[a-z0-9]/i.test(c);
  let i = 0;
  let j = s.length - 1;
  while (i < j) {
    if (!keep(s[i])) i++;
    else if (!keep(s[j])) j--;
    else if (s[i++].toLowerCase() !== s[j--].toLowerCase()) return false;
  }
  return true;
}
