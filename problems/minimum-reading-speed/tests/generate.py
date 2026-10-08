"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261013)


def case(n, high, hours):
    return {"pages": [rng.randint(1, high) for _ in range(n)], "hours": hours}


n = 100000
tests = [
    {"pages": [1], "hours": 1},
    {"pages": [10], "hours": 3},
    {"pages": [10], "hours": 1000},
    {"pages": [1000000000], "hours": 2},
    {"pages": [5, 5, 5], "hours": 3},
    {"pages": [7, 7], "hours": 5},
    case(10, 100, 25),
    case(1000, 10**6, 5000),
    # One hour a book: the speed is the longest book, a billion slow tries.
    case(n, 10**9, n),
    case(n, 10**9, 3 * n),
    # Lots of time: small speeds, where the total hours pass 32 bits.
    case(n, 10**9, 10**9),
    {"pages": [10**9] * n, "hours": 10**9},
]
print(json.dumps(tests))
