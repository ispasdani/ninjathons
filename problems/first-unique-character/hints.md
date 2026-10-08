## Hint

Checking each character against the rest of the string is O(n²): too slow for 100,000 characters.

## Hint

Two passes: first count every character, then walk the string again and return the first index whose count is 1.
