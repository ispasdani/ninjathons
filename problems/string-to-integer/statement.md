Turn the text `s` into a 32-bit signed integer, the way a careful parser would:

1. Skip any spaces at the start.
2. Read an optional `+` or `-` sign (at most one).
3. Read digits until the first character that isn't a digit, or the end. Leading zeros are fine.
4. If no digits were read, the result is `0`.
5. Apply the sign. If the number is outside the 32-bit range `[-2147483648, 2147483647]`, clamp it to the nearest end of the range.

Anything after the digits is ignored.

## Constraints

- `0 <= s.length <= 200`
- `s` contains English letters, digits, spaces, `+`, `-` and `.`.
