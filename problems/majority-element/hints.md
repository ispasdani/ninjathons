## Hint

Counting every value with a hash map works in O(n) time and O(n) space.

## Hint

For O(1) space: pair up different values and cancel them out. The majority value can't be cancelled completely.

## Hint

Boyer–Moore voting: keep a candidate and a counter. Matching values add one, others subtract one; when the counter hits zero, take the next value as the candidate.
