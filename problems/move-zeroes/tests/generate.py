"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

n = 100000
tests = [
    {"nums": [1]},
    {"nums": [0, 0]},
    {"nums": [1, 0]},
    {"nums": [0, 1]},
    {"nums": [4, 2, 0, -1, 0, 3]},
    {"nums": [-5, 0, -3, 0, 0, 7, -1]},
    {"nums": [rng.choice([0, rng.randint(-10**9, 10**9)]) for _ in range(1000)]},
    {"nums": [rng.choice([0, 0, rng.randint(-10**9, 10**9)]) for _ in range(n)]},
    {"nums": [0] * (n // 2) + list(range(n // 2, 0, -1))},
    {"nums": [rng.randint(1, 10**9) for _ in range(n)]},
]
print(json.dumps(tests))
