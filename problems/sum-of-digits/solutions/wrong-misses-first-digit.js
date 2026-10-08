// Stops while one digit is still left, so the first digit is never added.
function sumOfDigits(n) {
  let sum = 0;
  while (n >= 10) {
    sum += n % 10;
    n = Math.floor(n / 10);
  }
  return sum;
}
