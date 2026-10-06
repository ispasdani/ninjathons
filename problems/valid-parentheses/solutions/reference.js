function isValid(s) {
  const partner = { ")": "(", "]": "[", "}": "{" };
  const stack = [];
  for (const c of s) {
    if (c in partner) {
      if (stack.pop() !== partner[c]) return false;
    } else {
      stack.push(c);
    }
  }
  return stack.length === 0;
}
