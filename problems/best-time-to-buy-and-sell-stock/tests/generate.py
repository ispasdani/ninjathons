"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

n = 100000
tests = [
    {"prices": [5]},
    {"prices": [1, 2]},
    {"prices": [2, 1]},
    {"prices": [3, 3, 3]},
    {"prices": [2, 4, 1]},
    {"prices": [3, 2, 6, 5, 0, 3]},
    {"prices": [10000, 0, 10000]},
    {"prices": [rng.randint(0, 10000) for _ in range(1000)]},
    {"prices": [rng.randint(0, 10000) for _ in range(n)]},
    # Falling prices: no profit, and every pair has to be ruled out.
    {"prices": [10000 - i // 10 for i in range(n)]},
    {"prices": [10000 - i // 10 for i in range(n - 1)] + [10000]},
]
print(json.dumps(tests))
