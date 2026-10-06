## Hint

Scanning each window is O(n × k): with k = 50,000 that's billions of steps.

## Hint

When a new value arrives, any smaller value before it in the window can never be a maximum again.

## Hint

Keep a deque of indices whose values are decreasing. Pop smaller values from the back before pushing the new index, pop the front when it leaves the window, and read the maximum from the front.
