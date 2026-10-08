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

Say you need the positions of the first repeated value in a list. A set can tell you a value was seen before, but not where; a map from each value to its first index can:

```python
def first_repeat_positions(nums):
    first_index = {}
    for i, x in enumerate(nums):
        if x in first_index:
            return [first_index[x], i]
        first_index[x] = i
    return []
```

```javascript
function firstRepeatPositions(nums) {
  const firstIndex = new Map();
  for (let i = 0; i < nums.length; i++) {
    if (firstIndex.has(nums[i])) return [firstIndex.get(nums[i]), i];
    firstIndex.set(nums[i], i);
  }
  return [];
}
```

Notice the order: look up *before* storing the current number, so a number never matches itself. Two Sum works the same way, except that what you look up for `x` is the partner it needs, `target - x`.

## Counting

The other everyday use is counting. The most common character in a word:

```python
from collections import Counter

def most_common_char(word):
    return Counter(word).most_common(1)[0][0]
```

```javascript
function mostCommonChar(word) {
  const count = new Map();
  for (const ch of word) count.set(ch, (count.get(ch) ?? 0) + 1);
  let best = null;
  for (const [ch, n] of count) if (best === null || n > count.get(best)) best = ch;
  return best;
}
```

Two words are anagrams when every letter appears the same number of times in both: count one word's letters up, then count the other's down.

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
