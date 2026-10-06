"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

LIMIT = 2**31 - 1

def safe(n, zeros=0):
    # Mostly 1 and -1, with a few bigger values whose total product stays in range.
    nums = [rng.choice([1, -1]) for _ in range(n)]
    product = 1
    for i in rng.sample(range(n), min(n, 40)):
        v = rng.choice([2, 3, -2, -3, 5, -30])
        if product * abs(v) <= LIMIT:
            nums[i] = v
            product *= abs(v)
    for i in rng.sample(range(n), zeros):
        nums[i] = 0
    return {"nums": nums}

n = 100000
tests = [
    {"nums": [0, 0]},
    {"nums": [0, 5]},
    {"nums": [2, 3]},
    {"nums": [-30, 30, -30, 30]},
    {"nums": [1, 0, -1, 0, 2]},
    safe(1000),
    safe(n),
    safe(n, zeros=1),
    safe(n, zeros=2),
    {"nums": [-1] * n},
]
print(json.dumps(tests))
