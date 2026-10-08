"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261027)


def case(n, low, high):
    return {"nums": [rng.randint(low, high) for _ in range(n)]}


n = 200000
tests = [
    {"nums": [7]},
    {"nums": [1, 2]},
    {"nums": [2, 1]},
    {"nums": [-1000000000, 1000000000, 0]},
    {"nums": [4, 4, 4, 4, 4]},
    case(20, -10, 10),
    case(1000, -10**9, 10**9),
    case(n, -10**9, 10**9),
    case(n, 0, 5),
    # Rising and falling: every new number lands on the same side.
    {"nums": list(range(n))},
    {"nums": list(range(n, 0, -1))},
    # Swinging between the two ends.
    {"nums": [(-1) ** i * (10**9 - i) for i in range(n)]},
]
print(json.dumps(tests))
