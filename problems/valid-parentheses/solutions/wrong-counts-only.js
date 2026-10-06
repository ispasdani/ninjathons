// Only checks that each type opens as often as it closes.
function isValid(s) {
  const count = (c) => s.split(c).length - 1;
  return count("(") === count(")") && count("[") === count("]") && count("{") === count("}");
}
