## Hint

With 100,000 numbers there are about 5 billion pairs: too many to list, let alone sort.

## Hint

Turn it around: for a guessed distance `d`, how many pairs are at most `d` apart? That count only grows as `d` grows, so the answer is the smallest `d` whose count reaches `k`, and you can binary search it.

## Hint

Sort `nums` first. Then count pairs within `d` in one pass with two pointers: for each `right`, move `left` up while `nums[right] - nums[left] > d`, and add `right - left`. The count can pass 32 bits.
