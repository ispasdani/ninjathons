You're given an array of integers `nums` and a list of `queries`. Each query `[left, right]` asks for the sum of `nums[left]`, `nums[left + 1]`, …, `nums[right]`, both ends included.

Return the answer to every query, in order.

## Constraints

- `1 <= nums.length <= 100000`
- `-10^4 <= nums[i] <= 10^4`
- `1 <= queries.length <= 100000`
- `0 <= left <= right < nums.length`
