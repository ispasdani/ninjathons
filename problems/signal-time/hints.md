## Hint

Each server gets the signal at the length of its shortest path from `source`, so the answer is the largest of those shortest paths. The route with the fewest links isn't always the fastest.

## Hint

Dijkstra's algorithm: always settle next the unsettled server with the smallest known arrival time, then try to improve its neighbours through it. A min-heap finds that server quickly.

## Hint

Push `(time, server)` into the heap whenever a time improves, and skip entries that are out of date when you pop them. Relaxing every link over and over (Bellman–Ford) is O(n × links): too slow here.
