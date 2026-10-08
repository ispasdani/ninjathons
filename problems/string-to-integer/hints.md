## Hint

Before writing anything, list the awkward inputs: an empty string, only spaces, a sign with no digits, two signs, digits then letters, leading zeros, a huge number, and the two ends of the range.

## Hint

Build the number one digit at a time, and stop as soon as it passes 2147483648. Then the value never grows beyond what any language can hold, and clamping is one comparison.
