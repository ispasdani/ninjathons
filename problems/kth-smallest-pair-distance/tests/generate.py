"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261015)


def case(n, high, k=None):
    pairs = n * (n - 1) // 2
    return {"nums": [rng.randint(0, high) for _ in range(n)], "k": k if k is not None else rng.randint(1, pairs)}


n = 100000
all_pairs = n * (n - 1) // 2
tests = [
    {"nums": [5, 5], "k": 1},
    {"nums": [0, 1000000], "k": 1},
    {"nums": [1, 2, 3, 4], "k": 6},
    {"nums": [1, 2, 3, 4], "k": 1},
    {"nums": [7, 7, 7, 1], "k": 4},
    case(10, 50),
    case(1000, 10**6),
    case(n, 10**6, k=1),
    # The very last pair: the largest distance, k past 32 bits.
    case(n, 10**6, k=all_pairs),
    case(n, 10**6, k=all_pairs // 2),
    case(n, 1000, k=rng.randint(1, all_pairs)),
    # Many equal values: lots of zero distances.
    {"nums": [rng.choice([0, 500000, 10**6]) for _ in range(n)], "k": all_pairs // 3 + 7},
]
print(json.dumps(tests))
