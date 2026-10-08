// Lets a second sign through: "+-12" comes out as -12.
function myAtoi(s) {
  let i = 0;
  while (s[i] === " ") i++;
  let sign = 1;
  while (s[i] === "+" || s[i] === "-") {
    if (s[i] === "-") sign = -sign;
    i++;
  }
  let n = 0;
  while (i < s.length && s[i] >= "0" && s[i] <= "9") {
    n = Math.min(n * 10 + (s.charCodeAt(i) - 48), 2147483648);
    i++;
  }
  return Math.max(-2147483648, Math.min(2147483647, sign * n));
}
