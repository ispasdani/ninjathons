function countVowels(s) {
  let count = 0;
  for (const ch of s) if ("aeiouAEIOU".includes(ch)) count++;
  return count;
}
