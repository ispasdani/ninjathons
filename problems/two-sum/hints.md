## Hint

Checking every pair works, but with 100,000 numbers that is about 5 billion pairs. Think about what you need to know when you look at one number.

## Hint

For each number `x`, the partner you need is `target - x`. How can you check whether you've already seen it, in constant time?

## Hint

Walk through the array once and keep a hash map from each value to its index. Before storing `x`, look up `target - x`.
