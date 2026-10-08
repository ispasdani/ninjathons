"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261031)


def case(n, high, low=0):
    return {"balloons": [rng.randint(low, high) for _ in range(n)]}


tests = [
    {"balloons": [0]},
    {"balloons": [7]},
    {"balloons": [5, 1]},
    {"balloons": [9, 0, 9]},
    {"balloons": [1, 1, 1, 1, 1]},
    # Smallest first is wrong here.
    {"balloons": [8, 2, 6, 8, 9, 8, 1, 4, 1, 5]},
    case(8, 10),
    case(12, 100),
    case(15, 100, low=1),
    case(60, 100),
    case(200, 100),
    case(200, 100, low=90),
    # The largest total: every balloon at 100.
    {"balloons": [100] * 200},
    {"balloons": [rng.choice([0, 1, 100]) for _ in range(200)]},
]
print(json.dumps(tests))
