"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

n = 100000
tests = [
    {"nums": [5]},
    {"nums": [2, 1]},
    {"nums": [1, 2]},
    {"nums": [3, 3, 4]},
    {"nums": [4, 10, 4, 3, 8, 9]},
    {"nums": [rng.randint(-100, 100) for _ in range(500)]},
    {"nums": [rng.randint(-10**9, 10**9) for _ in range(n)]},
    {"nums": list(range(n))},
    {"nums": list(range(n, 0, -1))},
    {"nums": [rng.randint(0, 50) for _ in range(n)]},
    {"nums": [i // 2 + rng.randint(0, 3) for i in range(n)]},
]
print(json.dumps(tests))
