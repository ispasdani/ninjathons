"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

n = 200000
tests = [
    {"height": [5]},
    {"height": [5, 5]},
    {"height": [3, 0, 3]},
    {"height": [0, 0, 0]},
    {"height": [1, 2, 3, 2, 1]},
    {"height": [5, 1, 1, 1, 1, 1]},
    {"height": [rng.randint(0, 100) for _ in range(1000)]},
    {"height": [rng.randint(0, 100000) for _ in range(n)]},
    # A deep valley: the answer is about 2 * 10^10, over 32 bits.
    {"height": [100000] + [0] * (n - 2) + [100000]},
    {"height": list(range(n // 2)) + list(range(n // 2, 0, -1))},
    {"height": [100000 if i % 1000 == 0 else rng.randint(0, 10) for i in range(n)]},
]
print(json.dumps(tests))
