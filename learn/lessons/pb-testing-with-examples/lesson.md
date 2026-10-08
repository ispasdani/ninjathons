The examples in a problem statement are a starting point, not a proof. Code that passes them can still fail the hidden tests, and the hidden tests are built from exactly the cases people forget. Get in the habit of testing your own code first.

## Think of the cases before you write the code

Before writing anything, list the inputs that could go wrong. For a function that works on a list, nearly always:

- the **empty** list,
- a list with **one** item,
- **two** items, in both orders,
- **repeated** values,
- the case that matters only **at the very end** (or the very start),
- the **largest** input the constraints allow, which tests speed, and the **largest values**, which can overflow or lose precision.

Then work out the right answer for each by hand. That's your own test list.

## Run your cases

The quickest way to try a case is to call your function on it and print the answer. In the solve view, write the call at the bottom of your code and press **Run**:

```javascript
function isSorted(nums) {
  // …
}

console.log(isSorted([]), isSorted([1]), isSorted([2, 2]), isSorted([1, 2, 0]));
// expect: true true true false
```

```python
def is_sorted(nums):
    ...

print(is_sorted([]), is_sorted([1]), is_sorted([2, 2]), is_sorted([1, 2, 0]))
# expect: True True True False
```

The output appears with the Run result. Remove the line before submitting.

## Read the statement for the rules about edges

Statements answer most edge questions if you read closely:

- "**non-decreasing**" means equal neighbours are allowed; "**strictly increasing**" means they aren't.
- "**different** values" means duplicates count once.
- The **Constraints** section says whether a list can be empty (`0 <= nums.length`) or not (`1 <= nums.length`), and how big things get.

## Check loops at both ends

When your loop compares each item with the one before it, the first comparison is between positions 0 and 1, and the last between positions `length - 2` and `length - 1`. Stopping one step early is easy to miss, because the examples might be out of order somewhere in the middle. A test case that's only wrong at the end catches it.
