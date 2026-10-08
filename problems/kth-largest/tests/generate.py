"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261024)


def case(n, low, high, k):
    return {"nums": [rng.randint(low, high) for _ in range(n)], "k": k}


n = 100000
tests = [
    {"nums": [7], "k": 1},
    {"nums": [5, 5, 3], "k": 2},
    {"nums": [1, 1, 1, 1], "k": 3},
    {"nums": [-1000000000, 1000000000], "k": 2},
    case(20, -5, 5, 7),
    case(1000, -10**9, 10**9, 500),
    case(n, -10**9, 10**9, 1),
    case(n, -10**9, 10**9, n),
    # k in the middle: the worst case for picking the largest k times.
    case(n, -10**9, 10**9, n // 2),
    # Few distinct values: dropping repeats gives the wrong answer.
    case(n, 0, 10, 60000),
    {"nums": sorted(rng.randint(-10**9, 10**9) for _ in range(n)), "k": 77777},
]
print(json.dumps(tests))
