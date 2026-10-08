function myAtoi(s) {
  let i = 0;
  while (i < s.length && s[i] === " ") i++;
  let sign = 1;
  if (s[i] === "+" || s[i] === "-") {
    if (s[i] === "-") sign = -1;
    i++;
  }
  let n = 0;
  while (i < s.length && s[i] >= "0" && s[i] <= "9") {
    n = n * 10 + (s.charCodeAt(i) - 48);
    if (n > 2147483648) break; // already out of range: keep it small
    i++;
  }
  n *= sign;
  if (n > 2147483647) return 2147483647;
  if (n < -2147483648) return -2147483648;
  return n;
}
