A city is a row of rectangular buildings on flat ground. Building `[left, right, height]` stands from `x = left` to `x = right` and is `height` tall. Buildings can overlap and touch.

Seen from far away, the buildings make one outline: the skyline. Describe it by its **key points** `[x, h]`: each place where the outline's height changes, and the height it changes to. List them from left to right, with the last one back down at height 0.

Never list two key points in a row at the same height: if the height doesn't change at some `x`, there is no key point there.

## Constraints

- `1 <= buildings.length <= 100000`
- `0 <= left < right <= 10^9`
- `1 <= height <= 10^9`
- The buildings come in any order.
