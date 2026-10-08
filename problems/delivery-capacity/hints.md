## Hint

The capacity is at least the heaviest package (it has to fit) and at most the total weight (everything in one day).

## Hint

For a given capacity, loading each day as full as possible is the best you can do, and counting the days that takes is one pass. A bigger capacity never needs more days.

## Hint

Binary search the capacity between the heaviest package and the total weight, checking each guess with that one-pass count.
