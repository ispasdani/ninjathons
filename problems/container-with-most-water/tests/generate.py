"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

n = 100000
tests = [
    {"height": [0, 0]},
    {"height": [5, 0]},
    {"height": [4, 3, 2, 1, 4]},
    {"height": [1, 2, 1]},
    {"height": [2, 3, 4, 5, 18, 17, 6]},
    {"height": [rng.randint(0, 10000) for _ in range(1000)]},
    {"height": [rng.randint(0, 10000) for _ in range(n)]},
    {"height": list(range(1, n + 1))},
    {"height": [10000] * n},
    {"height": [1] + [rng.randint(0, 10) for _ in range(n - 2)] + [1]},
]
print(json.dumps(tests))
