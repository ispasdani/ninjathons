Breadth-first search finds the path with the fewest **edges**. But roads have lengths, network links have delays, and some cells of a map cost more to cross than others. With weighted edges, the fewest edges isn't the cheapest path, and you need **Dijkstra's algorithm**.

## The idea

Dijkstra's algorithm is BFS with a priority queue in place of the plain queue. Instead of exploring in rings of equal *steps*, it explores in order of total *cost* from the start:

1. The start costs 0; every other node costs infinity, for now.
2. Repeatedly take the **cheapest** node not yet settled. Its cost is now final.
3. For each of its edges, see whether going through it gives the neighbour a cheaper cost. If so, update it (this is called **relaxing** the edge) and add the neighbour to the queue.

Why is the cheapest node's cost final? Every other path to it would go through some node still in the queue, which already costs at least as much, and edge costs never subtract. That's also why Dijkstra needs **non-negative** costs.

## The code

The queue holds `(cost, node)` pairs. A node can be added several times as cheaper routes turn up; when an outdated pair comes out, skip it:

```python
import heapq

def cheapest(n, edges, start):
    """edges: [from, to, cost], one way. Cost from start to every node; inf if unreachable."""
    out = [[] for _ in range(n)]
    for a, b, w in edges:
        out[a].append((b, w))
    best = [float("inf")] * n
    best[start] = 0
    queue = [(0, start)]
    while queue:
        cost, node = heapq.heappop(queue)
        if cost > best[node]:
            continue  # an outdated entry
        for nxt, w in out[node]:
            if cost + w < best[nxt]:
                best[nxt] = cost + w
                heapq.heappush(queue, (best[nxt], nxt))
    return best
```

```javascript
// MinHeap as in the Heaps tutorial, comparing pairs by their first item.
function cheapest(n, edges, start) {
  const out = Array.from({ length: n }, () => []);
  for (const [a, b, w] of edges) out[a].push([b, w]);
  const best = new Array(n).fill(Infinity);
  best[start] = 0;
  const queue = new MinHeap((x, y) => x[0] < y[0]);
  queue.push([0, start]);
  while (queue.size) {
    const [cost, node] = queue.pop();
    if (cost > best[node]) continue; // an outdated entry
    for (const [next, w] of out[node]) {
      if (cost + w < best[next]) {
        best[next] = cost + w;
        queue.push([best[next], next]);
      }
    }
  }
  return best;
}
```

(The `MinHeap` here takes the comparison as a parameter: a one-line change to the class in the Heaps tutorial.)

With E edges and V nodes it runs in O((V + E) log V).

## On a grid

A grid where each cell has a cost to enter is a graph too: every cell is a node, and each move to a neighbour is an edge costing the neighbour's value. You don't need to build an edge list; generate the four neighbours as you go, exactly as in BFS on a grid. Number cells `r × cols + c` if you'd like a single index per cell.

Two traps:

- **Only right and down**: a DP that only moves right and down is wrong as soon as the cheapest path has to go up or left around an expensive patch.
- **Plain BFS** counts moves, not cost. It finds the path with the fewest cells, which may be the most expensive one.

## Signal time

When a signal spreads from one server along links with delays, each server gets it at its cheapest-path time from the source. The moment *every* server has it is the largest of those times; if some server is unreachable, it never gets it at all.
