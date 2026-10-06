"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

def random_intervals(n, span, length):
    out = []
    for _ in range(n):
        s = rng.randint(0, span)
        out.append([s, min(10**9, s + rng.randint(0, length))])
    return {"intervals": out}

n = 100000
tests = [
    {"intervals": [[5, 5]]},
    {"intervals": [[1, 10], [2, 3]]},
    {"intervals": [[2, 3], [1, 10]]},
    {"intervals": [[1, 2], [3, 4]]},
    {"intervals": [[0, 0], [0, 0], [1, 1]]},
    {"intervals": [[6, 8], [1, 9], [2, 4], [4, 7]]},
    random_intervals(1000, 10000, 50),
    random_intervals(n, 10**9, 5000),
    random_intervals(n, 10**9, 20),
    {"intervals": [[i, i + 1] for i in range(n - 1, -1, -1)]},
    {"intervals": [[2 * i, 2 * i] for i in range(n)]},
]
print(json.dumps(tests))
