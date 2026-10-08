Many slow solutions have the same shape: for each item, search through the other items for something. Two loops, O(n²) time. A hash map or hash set removes the inner search: instead of looking through everything, you ask "have I seen this?" and get the answer in constant time on average.

## Sets: "have I seen this before?"

A set holds values with no duplicates and answers *is this value in here?* in O(1) on average, however many values it holds.

Here's the slow way to check whether a list has a repeated value, comparing every pair:

```python
def has_duplicate(nums):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] == nums[j]:
                return True
    return False
```

With 100,000 numbers that's about 5 billion comparisons. With a set, you walk the list once and remember what you've seen:

```python
def has_duplicate(nums):
    seen = set()
    for x in nums:
        if x in seen:
            return True
        seen.add(x)
    return False
```

```javascript
function hasDuplicate(nums) {
  const seen = new Set();
  for (const x of nums) {
    if (seen.has(x)) return true;
    seen.add(x);
  }
  return false;
}
```

That's 100,000 steps instead of 5 billion. The price is memory: the set can grow as large as the input.

## Maps: "what did I store for this key?"

A hash map (a `dict` in Python, a `Map` in JavaScript) stores a value for each key. Use it when you need to remember something *about* what you've seen: where it was, how many times, what it pairs with.

The classic example is finding two numbers that add up to a target. For each number `x`, the partner you need is `target - x`. Instead of searching for it, keep a map from each number you've passed to its index:

```python
def two_sum(nums, target):
    index_of = {}
    for i, x in enumerate(nums):
        if target - x in index_of:
            return [index_of[target - x], i]
        index_of[x] = i
```

```javascript
function twoSum(nums, target) {
  const indexOf = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (indexOf.has(need)) return [indexOf.get(need), i];
    indexOf.set(nums[i], i);
  }
}
```

Notice the order: look up the partner *before* storing the current number, so a number never pairs with itself.

## Counting

The other everyday use is counting. Two words are anagrams when every letter appears the same number of times in both, so count the letters of one, then count down with the other:

```python
from collections import Counter

def is_anagram(a, b):
    return Counter(a) == Counter(b)
```

```javascript
function isAnagram(a, b) {
  if (a.length !== b.length) return false;
  const count = new Map();
  for (const ch of a) count.set(ch, (count.get(ch) ?? 0) + 1);
  for (const ch of b) {
    const left = count.get(ch) ?? 0;
    if (left === 0) return false;
    count.set(ch, left - 1);
  }
  return true;
}
```

## When to reach for one

- You're about to write a nested loop that **searches** for something: store what you've seen instead.
- You need to know **how many times** something appears: count with a map.
- You need to find **where** something was: map it to its index.

Keys must be hashable: numbers, strings and (in Python) tuples work; lists don't. In JavaScript, a `Map` compares objects and arrays by identity, so two equal arrays are different keys. Turn them into a string first (`key = a + "," + b`) when you need to look them up by value.

| Operation | List or array | Set or map |
|---|---|---|
| Is `x` in it? | O(n) | O(1) on average |
| Add `x` | O(1) at the end | O(1) on average |
| Keep the order | yes | Python `dict` and JS `Map`: insertion order; sets: don't rely on it |
