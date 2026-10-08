"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261011)


def case(n, low, high, k):
    return {"nums": [rng.randint(low, high) for _ in range(n)], "k": k}


def spikes(n):
    nums = [5000 if rng.random() < 0.01 else -rng.randint(0, 3) for _ in range(n)]
    return {"nums": nums, "k": 9000}


n = 100000
tests = [
    {"nums": [5], "k": 5},
    {"nums": [4], "k": 5},
    {"nums": [-5], "k": 1},
    {"nums": [1, -100, 1, 1], "k": 2},
    # A dip in the middle: the best start is after it.
    {"nums": [3, -10, 4, 4], "k": 8},
    {"nums": [100000, -100000, 100000], "k": 100000},
    case(20, -5, 10, 15),
    case(1000, -100, 100, 500),
    # Mostly small negatives with rare spikes: two spikes close together reach k.
    spikes(n),
    case(n, -100000, 100000, 10**6),
    # Only positive values, a long answer.
    case(n, 1, 3, 150000),
    # The sum of everything is needed, past 32 bits along the way.
    {"nums": [100000] * n, "k": 10**9},
    # Nothing reaches k.
    case(n, -100000, 100, 10**9),
    # Noisy, slowly rising: the deque holds many starts at once.
    case(n, -50, 52, 3000),
]
print(json.dumps(tests))
