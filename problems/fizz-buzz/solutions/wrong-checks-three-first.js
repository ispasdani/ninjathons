// Checks 3 before 15, so multiples of 15 come out as "Fizz".
function fizzBuzz(n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    if (i % 3 === 0) out.push("Fizz");
    else if (i % 5 === 0) out.push("Buzz");
    else if (i % 15 === 0) out.push("FizzBuzz");
    else out.push(String(i));
  }
  return out;
}
