// Only checks lower case, so "A" and "E" aren't counted.
function countVowels(s) {
  let count = 0;
  for (const ch of s) if ("aeiou".includes(ch)) count++;
  return count;
}
