## Hint

Trying every start and end is O(n²): too slow for 100,000 numbers.

## Hint

Walk left to right. For the best subarray that ends at index i, you either extend the best one ending at i − 1 or start fresh at i.

## Hint

Kadane's algorithm: current = max(nums[i], current + nums[i]); the answer is the largest current you saw. The subarray can't be empty, so an all-negative array returns its largest value.
