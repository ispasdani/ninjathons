## Hint

Sorting everything again after each number is O(n² log n). Even inserting each number into a sorted list moves up to 200,000 values every time.

## Hint

You never need the whole order, only the middle. Split the numbers into a lower half and an upper half: then the median is the largest number in the lower half.

## Hint

Keep the lower half in a max-heap and the upper half in a min-heap, with the lower half holding the same count or one more. Push each number into the right half, then move one top across if the sizes drift apart. The lower half's top is the answer every time.
