"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

def grid(n):
    return {"matrix": [[rng.randint(-1000, 1000) for _ in range(n)] for _ in range(n)]}

tests = [
    {"matrix": [[1, 2], [3, 4]]},
    {"matrix": [[5, 1, 9, 11], [2, 4, 8, 10], [13, 3, 6, 7], [15, 14, 12, 16]]},
    {"matrix": [[0, 0], [0, 1]]},
    grid(3),
    grid(5),
    grid(10),
    grid(99),
    grid(100),
    grid(500),
    {"matrix": [[r * 500 + c - 1000 if r * 500 + c < 2000 else 0 for c in range(500)] for r in range(500)]},
]
print(json.dumps(tests))
