// Checks the lowest band first, so every passing score is a D.
function gradeLetter(score) {
  if (score >= 60) return "D";
  if (score >= 70) return "C";
  if (score >= 80) return "B";
  if (score >= 90) return "A";
  return "F";
}
