## Hint

Build an adjacency list: for each town, the list of towns one road away. Add every road in both directions.

## Hint

Then explore from `source` with a queue (breadth-first) or a stack (depth-first), marking towns as visited so none is explored twice. Stop as soon as you reach `destination`.

## Hint

With 200,000 towns in a line, a recursive depth-first search goes 200,000 calls deep and overflows the stack in most languages. Use a loop with your own stack or queue.
