"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)


def case(n, q, low=-10**4, high=10**4):
    nums = [rng.randint(low, high) for _ in range(n)]
    queries = []
    for _ in range(q):
        a, b = rng.randrange(n), rng.randrange(n)
        queries.append([min(a, b), max(a, b)])
    return {"nums": nums, "queries": queries}


n = 100000
tests = [
    {"nums": [5], "queries": [[0, 0], [0, 0]]},
    {"nums": [1, 2, 3, 4], "queries": [[0, 0], [3, 3], [1, 2], [0, 3]]},
    {"nums": [-10000, 10000], "queries": [[0, 1], [1, 1], [0, 0]]},
    {"nums": [0, 0, 0], "queries": [[0, 2]]},
    case(10, 20),
    case(1000, 1000),
    # The largest sums: every value at the maximum, whole-array queries.
    {"nums": [10**4] * n, "queries": [[0, n - 1]] * 1000 + [[1, n - 2]]},
    {"nums": [-10**4] * n, "queries": [[0, n - 1], [5, n - 1]]},
    case(n, n),
    # Long ranges, the worst case for adding each range up.
    {"nums": case(n, 0)["nums"], "queries": [[rng.randrange(10), n - 1 - rng.randrange(10)] for _ in range(n)]},
]
print(json.dumps(tests))
