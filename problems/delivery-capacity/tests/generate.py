"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261014)


def case(n, high, days):
    return {"weights": [rng.randint(1, high) for _ in range(n)], "days": days}


n = 100000
tests = [
    {"weights": [7], "days": 1},
    {"weights": [1, 1, 1], "days": 3},
    {"weights": [1, 1, 1], "days": 1},
    # The heaviest package decides, even with spare days.
    {"weights": [1, 10, 1], "days": 3},
    {"weights": [10, 1, 1, 1, 1], "days": 2},
    case(10, 20, 4),
    case(1000, 10**4, 37),
    # One day: everything at once, far from the heaviest package.
    case(n, 10**4, 1),
    case(n, 10**4, 7),
    case(n, 10**4, 5000),
    # A few heavy packages among light ones.
    {"weights": [10**4 if rng.random() < 0.001 else rng.randint(1, 5) for _ in range(n)], "days": 50},
    {"weights": [10**4] * n, "days": 3},
]
print(json.dumps(tests))
