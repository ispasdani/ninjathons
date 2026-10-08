A van delivers packages from a queue, in order. Package `i` weighs `weights[i]`. Each day the van loads packages from the front of the queue, one after another, as long as the total stays within its capacity, then drives off. Packages are never split or reordered.

Return the smallest capacity that delivers every package within `days` days.

## Constraints

- `1 <= days <= weights.length <= 100000`
- `1 <= weights[i] <= 10^4`
