Every programmer's code is wrong a lot of the time. What separates beginners from experienced programmers isn't writing bug-free code; it's finding bugs quickly. Debugging is a method, not luck.

## 1. Read the result carefully

When a test fails, Ninjathons shows the input, the expected output and yours. Before changing anything, compare them:

- **Wrong by a little, or only sometimes?** Usually an edge case: the empty list, the first or last item, a boundary like 90 in a grading rule.
- **Wrong every time?** Usually the main idea: a wrong formula, a wrong variable, the wrong thing returned.
- **An error message instead of an answer?** Read its last line and its line number. `TypeError: Cannot read properties of undefined` in JavaScript, or `IndexError: list index out of range` in Python, usually means reading past the end of a list.
- **`NaN` (JavaScript) or `ZeroDivisionError` (Python)?** Something was divided by zero, or a calculation used a value that wasn't a number.

## 2. Make it small

Find the smallest input that goes wrong, and work through it by hand. If a list of 100,000 numbers fails, try the empty list, one number, two numbers. The bug is far easier to see on two numbers.

## 3. Look inside

Print what your code is doing, step by step:

```javascript
function average(nums) {
  let sum = 0;
  for (const x of nums) sum += x;
  console.log("sum", sum, "count", nums.length);
  return sum / nums.length;
}
```

```python
def average(nums):
    total = sum(nums)
    print("total", total, "count", len(nums))
    return total / len(nums)
```

Run it on the failing example. Is each value what you expected? The first one that isn't is where the bug is. Remove the prints when you're done; they don't affect the tests, but they clutter your code.

## 4. Change one thing at a time

Make one change, run again, and see what it did. Changing three things at once leaves you not knowing which one helped, or which one broke something else.

## Two bugs you'll meet often

**Dividing by zero.** Any time you divide by a count or a length, ask: can it be zero? An empty list has a length of 0. Handle that case first, before the division:

```javascript
if (nums.length === 0) return 0;
```

```python
if not nums:
    return 0
```

**Losing the fraction.** `Math.floor`, `Math.round`, `parseInt`, and Python's `//` and `int()` throw away the part after the decimal point. Use them only when you mean to.

The exercise below has both traps in it. Write it, then try the empty list before you submit.
