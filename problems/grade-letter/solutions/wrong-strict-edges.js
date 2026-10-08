// Uses > where it needs >=, so 90 is a B and 60 is an F.
function gradeLetter(score) {
  if (score > 90) return "A";
  if (score > 80) return "B";
  if (score > 70) return "C";
  if (score > 60) return "D";
  return "F";
}
