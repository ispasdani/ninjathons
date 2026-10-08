"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261009)


def case(n, low, high, k):
    return {"nums": [rng.randint(low, high) for _ in range(n)], "k": k}


n = 100000
tests = [
    {"nums": [5], "k": 5},
    {"nums": [5], "k": -5},
    {"nums": [0], "k": 0},
    {"nums": [1, -1, 1, -1], "k": 0},
    {"nums": [-1, -1, 1], "k": -1},
    {"nums": [1000, -1000, 1000], "k": 1000},
    case(20, -3, 3, 2),
    case(1000, -5, 5, 0),
    # Only positive values: a window would work here.
    case(n, 1, 10, 30),
    # Mixed signs, where a window fails.
    case(n, -1000, 1000, 500),
    case(n, -2, 2, 0),
    # Every subarray of zeros sums to 0: n(n+1)/2, past 32 bits.
    {"nums": [0] * n, "k": 0},
    # A target no subarray can reach.
    case(n, -1000, 1000, 10**7),
]
print(json.dumps(tests))
