A graph is a set of **nodes** joined by **edges**: towns and roads, people and friendships, courses and prerequisites. Problems usually hand you a graph as a number of nodes `n` (numbered `0` to `n - 1`) and a list of edges `[a, b]`. The first step is always the same: turn that list into something you can explore.

## The adjacency list

For each node, the list of nodes one edge away:

```javascript
const next = Array.from({ length: n }, () => []);
for (const [a, b] of edges) {
  next[a].push(b);
  next[b].push(a); // leave this out when edges only go one way
}
```

```python
next_to = [[] for _ in range(n)]
for a, b in edges:
    next_to[a].append(b)
    next_to[b].append(a)  # leave this out when edges only go one way
```

Read the statement for direction. "Joined", "connected", "a road both ways" means **undirected**: add both. "From a to b", "a must come before b", "a follows b" means **directed**: add one.

With the adjacency list, everything from the Grids tutorial carries over: DFS with a stack to visit everything reachable, BFS with a queue for the fewest edges. Mark nodes as visited when you add them. Every node and edge is handled once, so it's O(n + edges).

## Groups: connected components

To count separate groups, loop over every node, and from each one not yet visited, explore everything it reaches: that's one group. There's a second tool made for this, **union-find** (also called a *disjoint set*). Every node starts as its own group; each edge merges two groups:

```python
class Groups:
    def __init__(self, n):
        self.parent = list(range(n))

    def find(self, x):  # the representative of x's group
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]  # shortcut the path as we go
            x = self.parent[x]
        return x

    def union(self, a, b):  # merge the two groups; False if they were already one
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        self.parent[ra] = rb
        return True
```

Two nodes are in the same group when `find` gives the same representative for both. Counting the groups comes down to counting the merges that succeeded.

Union-find never builds an adjacency list, and it answers "are a and b in the same group?" at any moment as edges arrive. With the path shortcut it's close to O(1) per operation.

## Order: topological sort

With **directed** edges meaning "a before b", a common question is the order to do things in. Count each node's **in-degree**, the number of edges coming into it. Nodes with in-degree 0 have nothing in front of them: start there. Each time you take one, remove its outgoing edges, and any node whose in-degree drops to 0 becomes ready:

```javascript
function order(n, edges) {
  const next = Array.from({ length: n }, () => []);
  const indegree = new Array(n).fill(0);
  for (const [a, b] of edges) {
    next[a].push(b);
    indegree[b]++;
  }
  const ready = [];
  for (let v = 0; v < n; v++) if (indegree[v] === 0) ready.push(v);
  const out = [];
  for (let head = 0; head < ready.length; head++) {
    const v = ready[head];
    out.push(v);
    for (const w of next[v]) if (--indegree[w] === 0) ready.push(w);
  }
  return out.length === n ? out : null; // null: a cycle, so no order exists
}
```

If the edges go round in a circle, the nodes on it never reach in-degree 0, so fewer than `n` come out. That's how you detect a cycle. Processing the ready nodes in **rounds** (all of round 1, then everything they free up, and so on) tells you how many stages the work needs.

## Recursion depth

A graph can be one long chain of 100,000 nodes. Recursive DFS on it goes 100,000 calls deep: too deep for Python's default limit of 1,000 and risky elsewhere. Prefer an explicit stack or queue, or union-find, as in every example above.
