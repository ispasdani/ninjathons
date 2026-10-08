"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261025)


def case(n, high):
    return {"ropes": [rng.randint(1, high) for _ in range(n)]}


n = 100000
tests = [
    {"ropes": [1]},
    {"ropes": [5, 5]},
    {"ropes": [1, 2, 3]},
    {"ropes": [1, 1, 1, 1, 1, 1, 1, 1]},
    # Sorting once and tying left to right gets this wrong.
    {"ropes": [3, 3, 3, 4, 4]},
    case(20, 10),
    case(1000, 10**4),
    case(n, 10**4),
    # Equal ropes: tied in pairs, round after round.
    {"ropes": [10**4] * n},
    case(n, 3),
    # A few long ropes among many short ones.
    {"ropes": [10**4 if rng.random() < 0.01 else rng.randint(1, 10) for _ in range(n)]},
]
print(json.dumps(tests))
