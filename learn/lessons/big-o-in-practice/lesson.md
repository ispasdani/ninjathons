Two correct programs can differ wildly in speed. One finishes in a millisecond, the other takes a minute, on the same input. Big O notation is the shorthand for *how the work grows as the input grows*, and it's how you can tell, before running anything, whether a solution will pass the time limit.

## Counting steps, roughly

Big O ignores constant factors and small terms. It only asks: if the input gets 10 times bigger, how much more work is there?

| Big O | Name | 10× more input means | Typical code |
|---|---|---|---|
| O(1) | constant | the same work | reading `nums[i]`, a hash map lookup |
| O(log n) | logarithmic | a little more | binary search |
| O(n) | linear | 10× the work | one loop over the input |
| O(n log n) | "n log n" | a bit over 10× | sorting |
| O(n²) | quadratic | 100× the work | a loop inside a loop |
| O(2ⁿ) | exponential | astronomically more | trying every subset |

## From constraints to a target

A computer does very roughly **100 million simple steps per second**, a little fewer in Python. So the constraints tell you what you need:

| If n is up to | You can afford |
|---|---|
| 20 | O(2ⁿ): try everything |
| 1,000 | O(n²) |
| 100,000 | O(n log n) or O(n) |
| 10,000,000 | O(n) with a small constant |

With n = 100,000, an O(n²) solution does 10 billion steps: about 100 seconds. O(n) does 100,000: under a millisecond.

## Spotting the cost in code

```python
# O(n): one pass
total = 0
for x in nums:
    total += x

# O(n²): for each item, look at every other item
for i in range(len(nums)):
    for j in range(len(nums)):
        if i != j and nums[i] == nums[j]:
            ...
```

Watch for hidden loops. These look like one step but go through the whole list:

- `x in some_list` (Python), `list.includes(x)`, `list.indexOf(x)` (JavaScript): O(n) each.
- `list.remove(x)`, `list.pop(0)`, `list.insert(0, x)`, `array.shift()`: O(n), because everything after it moves.
- Building a new list from a slice, `nums[1:]` or `nums.slice(1)`: O(n).

Inside a loop, each of these turns O(n) into O(n²).

## Space

Big O also describes memory. A few counters are O(1) extra space; a copy of the input, or a set of everything seen, is O(n). Often you trade one for the other: spend O(n) memory on a hash set to drop the time from O(n²) to O(n).

## Doing better than the obvious

The first exercise: one number from 0 to n is missing from a list. Checking each candidate with `in` is O(n²). But you know what the numbers *should* add up to: 0 + 1 + … + n is `n * (n + 1) / 2`. Subtract the actual sum, and the difference is the missing number, in one pass and O(1) space.

The second: find the value that appears more than half the time. A hash map of counts is O(n) time and O(n) space. There's also a clever O(1)-space idea, the *Boyer–Moore vote*: keep a candidate and a counter; a match adds one, a mismatch takes one away, and a counter of zero picks a new candidate. The majority value survives, because it outnumbers all the others put together.
