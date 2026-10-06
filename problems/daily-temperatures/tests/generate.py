"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

n = 100000
tests = [
    {"temperatures": [50]},
    {"temperatures": [50, 50]},
    {"temperatures": [60, 50]},
    {"temperatures": [55, 38, 53, 81, 61, 93, 97, 32, 43, 78]},
    {"temperatures": [rng.randint(30, 100) for _ in range(1000)]},
    {"temperatures": [rng.randint(30, 100) for _ in range(n)]},
    # Falling (or flat) for a long time: looking ahead from every day scans to the end.
    {"temperatures": [100 - i * 70 // n for i in range(n)]},
    {"temperatures": [90] * (n - 1) + [100]},
    {"temperatures": [30 + i % 71 for i in range(n)]},
    {"temperatures": [100] + [30] * (n - 1)},
]
print(json.dumps(tests))
