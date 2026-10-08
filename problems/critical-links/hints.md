## Hint

Cutting each link and checking whether the network splits is one search per link: about 200,000 searches of the whole graph.

## Hint

A link is critical exactly when it isn't on any cycle. In a depth-first search, give each server the time it was first reached, and its "low" value: the earliest time reachable from its subtree using at most one link back up. The tree link `parent → child` is critical when `low[child] > time[parent]`.

## Hint

Skip the link you arrived by, not every link to your parent: a second link to the parent is a real way back. With 100,000 servers in a line, recursion can overflow the stack, so run the search with an explicit stack.
