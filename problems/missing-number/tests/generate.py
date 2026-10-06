"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

def without(n, missing):
    nums = [x for x in range(n + 1) if x != missing]
    rng.shuffle(nums)
    return {"nums": nums}

n = 100000
tests = [
    {"nums": [0]},
    {"nums": [1]},
    {"nums": [1, 2]},
    without(10, 0),
    without(10, 10),
    without(1000, 500),
    without(n, 0),
    without(n, n),
    without(n, rng.randint(1, n - 1)),
    without(n - 1, 77777),
]
print(json.dumps(tests))
