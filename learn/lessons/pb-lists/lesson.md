A list (an *array* in JavaScript) holds many values in order. Most exercises hand you one, and most answers are a loop over it.

## Making and reading lists

```javascript
const nums = [4, 9, 2];
nums[0];          // 4, the first item
nums.length;      // 3
nums[nums.length - 1]; // 2, the last item
nums.push(7);     // add to the end: [4, 9, 2, 7]
```

```python
nums = [4, 9, 2]
nums[0]          # 4, the first item
len(nums)        # 3
nums[-1]         # 2, the last item (Python counts from the end with negatives)
nums.append(7)   # add to the end: [4, 9, 2, 7]
```

## Finding the biggest

Built-ins like `Math.max(...nums)` and `max(nums)` exist, but writing it yourself teaches the pattern behind dozens of problems: **keep the best so far, and update it as you go**.

```javascript
function smallest(nums) {
  let best = nums[0];
  for (const x of nums) {
    if (x < best) best = x;
  }
  return best;
}
```

```python
def smallest(nums):
    best = nums[0]
    for x in nums:
        if x < best:
            best = x
    return best
```

Start `best` with the first item, not with `0`: if every number were bigger than 0, a start of 0 would win and give a wrong answer. Pick a starting value that's a real candidate.

## Keeping two things at once

Some questions need more than one running value: the largest *and* the second largest, the total *and* the count. Keep a variable for each and update them together in the same loop. When you update several variables from each other, think about the order: you often need to save the old value before you overwrite it.

```python
if x > best:
    second = best  # the old best moves down first
    best = x
```

## Sorting

`nums.sort((a, b) => a - b)` in JavaScript and `sorted(nums)` in Python put a list in order. In JavaScript, always pass `(a, b) => a - b`: without it, numbers are sorted as text and `10` comes before `9`.

Sorting is handy, but it's slower than one loop (you'll see why in the Big O lesson), and it's easy to read the wrong position afterwards, especially when values repeat. In `[4, 9, 9, 2]` sorted, the one before last is another 9.
