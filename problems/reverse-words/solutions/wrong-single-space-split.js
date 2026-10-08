// Splits on single spaces, so extra spaces survive as empty words.
function reverseWords(s) {
  return s.split(" ").reverse().join(" ");
}
