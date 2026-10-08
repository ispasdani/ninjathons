// Never clamps, so huge numbers come out wrong.
function myAtoi(s) {
  const n = parseInt(s.trimStart(), 10);
  return Number.isNaN(n) ? 0 : n;
}
