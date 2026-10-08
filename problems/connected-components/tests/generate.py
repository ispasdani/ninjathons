"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261016)


def random_edges(n, m):
    edges = []
    while len(edges) < m:
        a, b = rng.randrange(n), rng.randrange(n)
        if a != b:
            edges.append([a, b])
    return {"n": n, "edges": edges}


def chain(n):
    # One long path, numbered in a shuffled order.
    order = list(range(n))
    rng.shuffle(order)
    return {"n": n, "edges": [[order[i], order[i + 1]] for i in range(n - 1)]}


n = 100000
tests = [
    {"n": 1, "edges": []},
    {"n": 3, "edges": []},
    {"n": 2, "edges": [[0, 1], [1, 0], [0, 1]]},
    {"n": 6, "edges": [[0, 1], [2, 3], [4, 5], [1, 0]]},
    random_edges(20, 10),
    random_edges(1000, 600),
    random_edges(n, n // 2),
    random_edges(n, n - 1),
    chain(n),
    # A star: one hub joined to everything.
    {"n": n, "edges": [[0, i] for i in range(1, n)]},
    # Many tiny groups: pairs.
    {"n": n, "edges": [[i, i + 1] for i in range(0, n - 1, 2)]},
]
print(json.dumps(tests))
