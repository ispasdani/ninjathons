## Hint

Check the rules from the most specific: divisible by 400 means a leap year; otherwise divisible by 100 means not; otherwise divisible by 4 means a leap year; otherwise not.

## Hint

As one expression: `(year % 4 == 0 && year % 100 != 0) || year % 400 == 0`.
