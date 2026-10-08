You have a pile of stones with the weights in `stones`. Each turn, take the **two heaviest** stones and smash them together:

- if they weigh the same, both are destroyed;
- otherwise the lighter one is destroyed and the heavier one now weighs the difference, and goes back on the pile.

When at most one stone is left, stop. Return its weight, or `0` if no stones are left.

## Constraints

- `1 <= stones.length <= 100000`
- `1 <= stones[i] <= 10^9`
