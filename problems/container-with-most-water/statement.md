`height[i]` is the height of a vertical line at position `i`. Two lines and the floor form a container; it holds `min(height[i], height[j]) × (j − i)` units of water.

Return the most water a container can hold.

## Constraints

- `2 <= height.length <= 100000`
- `0 <= height[i] <= 10000`
