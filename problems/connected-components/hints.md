## Hint

Each cable joins two groups into one, unless both ends are already in the same group. So "n minus the number of cables" is only right when there are no loops or repeated cables.

## Hint

A union-find (disjoint set) keeps a parent for every computer; two computers are in the same group when they lead to the same root. Start with `n` groups and subtract one for every cable that joins two different roots.

## Hint

Keep the trees flat: point nodes closer to the root as you look it up (path compression), and hang the smaller tree under the bigger one. A graph search (BFS or DFS) over an adjacency list works too; with deep chains, use an explicit stack instead of recursion.
