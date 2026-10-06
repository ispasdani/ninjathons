"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

n = 100000
falling = list(range(10000, 10000 - n, -1))
falling = [max(-10000, x) for x in falling]
tests = [
    {"nums": [4, 2], "k": 2},
    {"nums": [9, 11], "k": 2},
    {"nums": [1, -1], "k": 1},
    {"nums": [7, 2, 4], "k": 2},
    {"nums": [1, 3, 1, 2, 0, 5], "k": 3},
    {"nums": [rng.randint(-10000, 10000) for _ in range(1000)], "k": 17},
    {"nums": [rng.randint(-10000, 10000) for _ in range(n)], "k": 1},
    {"nums": [rng.randint(-10000, 10000) for _ in range(n)], "k": n // 2},
    {"nums": [rng.randint(-10000, 10000) for _ in range(n)], "k": n},
    {"nums": falling, "k": 50000},
    {"nums": [i % 20001 - 10000 for i in range(n)], "k": 30000},
]
print(json.dumps(tests))
