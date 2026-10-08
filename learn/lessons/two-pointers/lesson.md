Many problems on arrays and strings compare items from two places at once. The brute-force way tries every pair: two nested loops, O(n²). The two-pointer technique walks two positions through the array in a coordinated way, so each one only ever moves forward, and the whole thing takes O(n).

## Pointers from both ends

Put one pointer at the start and one at the end, and move them towards each other. It fits whenever the answer depends on the two ends matching or balancing.

A palindrome reads the same both ways, so compare the outermost characters, then step both inwards:

```javascript
function isPalindrome(s) {
  let i = 0;
  let j = s.length - 1;
  while (i < j) {
    if (s[i] !== s[j]) return false;
    i++;
    j--;
  }
  return true;
}
```

```python
def is_palindrome(s):
    i, j = 0, len(s) - 1
    while i < j:
        if s[i] != s[j]:
            return False
        i += 1
        j -= 1
    return True
```

The exercise only counts letters and digits, ignoring case: skip a pointer past anything else before comparing, rather than building a cleaned-up copy first.

## Moving the pointer that can't do better

In *Container With Most Water*, the area between lines `i` and `j` is `min(height[i], height[j]) × (j − i)`. Start with the widest container, the two outermost lines. To find a bigger area you have to give up width, so move one pointer inwards. Which one?

The shorter line limits the area. Moving the taller one inwards can only keep the same limit or lower it, with less width, so it can never help. Moving the shorter one is the only move that might. So: record the area, move the pointer at the shorter line, and repeat until the pointers meet. That's the whole algorithm; writing it is the exercise.

Two-pointer solutions almost always come with an argument like this: why the pointer you move can't have been part of a better answer. If you can't make the argument, the technique probably doesn't apply.

## A slow pointer and a fast pointer

The other shape has both pointers moving the same way: a fast one reads every item, and a slow one marks where the next item you're keeping should go. It rewrites an array in place without a second array.

To remove repeated values from a **sorted** array, keeping one of each, and return how many are left:

```javascript
function dedupe(nums) {
  let write = 0;
  for (let read = 0; read < nums.length; read++) {
    if (read === 0 || nums[read] !== nums[read - 1]) nums[write++] = nums[read];
  }
  return write; // nums[0..write-1] holds the kept values
}
```

```python
def dedupe(nums):
    write = 0
    for read in range(len(nums)):
        if read == 0 or nums[read] != nums[read - 1]:
            nums[write] = nums[read]
            write += 1
    return write  # nums[:write] holds the kept values
```

`write` never passes `read`, so nothing is overwritten before it's been read. Moving zeroes to the end is the same pattern with a different rule for what to keep, plus filling the tail afterwards.

## When to reach for it

- The input is **sorted**, or the answer depends on the two **ends**: pointers from both ends.
- You need to **filter or compact** an array in place: slow and fast pointers.
- A pair of nested loops where the inner loop could pick up where it left off, instead of starting again: the inner loop's position is your second pointer.
