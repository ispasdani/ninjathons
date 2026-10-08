## Hint

Moving only right and down isn't enough: the cheapest path can go up or left around an expensive patch. Breadth-first search doesn't work either, since steps cost different amounts.

## Hint

This is Dijkstra's algorithm on a grid. Keep the best known cost for each cell, and a priority queue of cells ordered by that cost. Repeatedly take the cheapest cell and offer each neighbour its cost plus the neighbour's own.

## Hint

A cell can enter the queue more than once with different costs. When you take one out whose cost is worse than the best already known for it, skip it.
