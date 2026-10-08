The distance of a pair `(nums[i], nums[j])` with `i < j` is `|nums[i] - nums[j]|`. Write down the distance of every pair and sort the list.

Return the `k`-th smallest distance in it (the first is `k = 1`).

## Constraints

- `2 <= nums.length <= 100000`
- `0 <= nums[i] <= 10^6`
- `1 <= k <= n × (n - 1) / 2`, where `n` is `nums.length` (so `k` can pass 32 bits)
