"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

tests = [
    {"n": 2, "edges": [], "source": 0, "destination": 1},
    {"n": 2, "edges": [[1, 0]], "source": 0, "destination": 1},
    {"n": 3, "edges": [[2, 1]], "source": 1, "destination": 2},
    {"n": 4, "edges": [[0, 1], [2, 3]], "source": 3, "destination": 0},
    {"n": 5, "edges": [[4, 3], [3, 2], [2, 1], [1, 0]], "source": 0, "destination": 4},
]
def random_graph(n, m):
    seen = set()
    edges = []
    while len(edges) < m:
        a, b = rng.randrange(n), rng.randrange(n)
        if a != b and (a, b) not in seen and (b, a) not in seen:
            seen.add((a, b))
            edges.append([a, b])
    return edges
for _ in range(6):
    n = rng.randint(2, 30)
    tests.append({"n": n, "edges": random_graph(n, rng.randint(0, n)), "source": rng.randrange(n), "destination": rng.randrange(n)})
n = 200000
order = list(range(n))
rng.shuffle(order)
chain = [[order[i + 1], order[i]] for i in range(n - 1)]
rng.shuffle(chain)
tests.append({"n": n, "edges": chain, "source": order[0], "destination": order[-1]})
tests.append({"n": n, "edges": random_graph(n, 100000), "source": 0, "destination": n - 1})
print(json.dumps(tests))
