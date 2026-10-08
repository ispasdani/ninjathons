## Hint

Each turn needs the two largest values of a collection that keeps changing. Sorting again every turn costs O(n log n) per turn; a max-heap gives the largest in O(log n).

## Hint

Python's `heapq` is a min-heap: push the weights negated, so the most negative (the heaviest) comes out first. JavaScript has no built-in heap, so you'll write a small one.
