## Hint

A rope's length is paid again every time the rope it's part of is tied. Long ropes should be tied in as few times as possible, so they should be tied last.

## Hint

Sorting once isn't enough: after a tie, the new rope may be longer than ropes you haven't used yet. Always tie the two shortest ropes you have right now.

## Hint

Keep the ropes in a min-heap. Pop the two shortest, add their sum to the cost, push the sum back, and repeat until one rope is left. Re-sorting after every tie gets the same answer, but in O(n² log n).
