## Hint

`n % 10` is the last digit of `n`, and dividing by 10 (rounding down) removes it: `1234 % 10` is `4`, and `1234` becomes `123`.

## Hint

Repeat while `n` is greater than 0: add the last digit, then remove it. Make sure a one-digit number, and 0, still come out right.
