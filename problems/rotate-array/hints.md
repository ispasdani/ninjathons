## Hint

Rotating by the length of the array changes nothing. So only `k % n` steps matter.

## Hint

Moving one step at a time is O(n × k). Instead, work out where each value ends up: the value at position `i` moves to `(i + k) % n`.

## Hint

In place: reverse the whole array, then reverse the first `k` values and the rest separately.
