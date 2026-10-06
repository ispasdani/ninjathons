## Hint

Keep a window [left, right] with no repeats, and grow it one character at a time.

## Hint

When the new character is already in the window, the window must start just after its previous position, not just after the new one.

## Hint

Store the last index of each character. On a repeat, move left to max(left, last[c] + 1).
