"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261017)


def dag(n, m, cycle=False):
    # Edges go from earlier to later in a random order, so there's no cycle.
    order = list(range(n))
    rng.shuffle(order)
    pairs = set()
    while len(pairs) < m:
        i, j = sorted(rng.sample(range(n), 2))
        pairs.add((order[i], order[j]))
    if cycle:
        i, j = sorted(rng.sample(range(n), 2))
        pairs.discard((order[i], order[j]))
        pairs.add((order[j], order[i]))
        pairs.add((order[i], order[j]))
    edges = [list(p) for p in pairs]
    rng.shuffle(edges)
    return {"n": n, "prerequisites": edges}


def chain(n):
    order = list(range(n))
    rng.shuffle(order)
    edges = [[order[i], order[i + 1]] for i in range(n - 1)]
    rng.shuffle(edges)
    return {"n": n, "prerequisites": edges}


n = 100000
loop = chain(n)
loop["prerequisites"].append([loop["prerequisites"][0][1], loop["prerequisites"][0][0]])
tests = [
    {"n": 1, "prerequisites": []},
    {"n": 2, "prerequisites": [[1, 0]]},
    {"n": 2, "prerequisites": [[0, 1], [1, 0]]},
    # A cycle off to the side of courses that are fine.
    {"n": 6, "prerequisites": [[0, 1], [1, 2], [3, 4], [4, 5], [5, 3]]},
    # A long route and a short one into the same course.
    {"n": 5, "prerequisites": [[0, 4], [0, 1], [1, 2], [2, 3], [3, 4]]},
    dag(20, 30),
    dag(1000, 3000),
    dag(n, n),
    dag(n, n, cycle=True),
    # 100,000 terms, one course each.
    chain(n),
    loop,
    # Wide: everything after one course.
    {"n": n, "prerequisites": [[0, i] for i in range(1, n)]},
]
print(json.dumps(tests))
