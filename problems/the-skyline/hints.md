## Hint

The outline can only change height where some building starts or ends. At each of those places, the height is the tallest building standing there.

## Hint

Sweep from left to right over those places. Keep the buildings that have started but not ended in a max-heap by height, so the tallest is always on top.

## Hint

Don't search the heap for a building that ends: leave it there, and when it reaches the top, pop it if its `right <= x` (lazy removal). Add every building starting at `x` before reading the height, and only write a key point when the height differs from the last one you wrote.
