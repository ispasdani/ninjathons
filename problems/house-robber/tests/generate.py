"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261028)


def case(n, high):
    return {"houses": [rng.randint(0, high) for _ in range(n)]}


n = 100000
tests = [
    {"houses": [0]},
    {"houses": [7]},
    {"houses": [3, 9]},
    {"houses": [9, 3]},
    {"houses": [1, 100, 1, 1, 100, 1]},
    {"houses": [0, 0, 0, 0]},
    case(20, 10),
    case(30, 1000),
    case(1000, 10**9),
    case(n, 10**9),
    case(n, 3),
    # The largest total: every other house at the maximum.
    {"houses": [10**9] * n},
]
print(json.dumps(tests))
