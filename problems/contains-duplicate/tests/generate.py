"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

n = 100000
distinct = rng.sample(range(-10**9, 10**9), n)
tests = [
    {"nums": [7]},
    {"nums": [7, 7]},
    {"nums": [-1, 1]},
    {"nums": [0, -0 + 1, 0]},
    {"nums": [10**9, -10**9, 10**9]},
    {"nums": [3, 1, 4, 1]},
    {"nums": rng.sample(range(1000), 1000)},
    {"nums": distinct},
    # The only repeat is far apart: first and last.
    {"nums": distinct[:-1] + [distinct[0]]},
    {"nums": sorted(distinct)},
    {"nums": [5] * n},
]
print(json.dumps(tests))
