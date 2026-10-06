"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

def majority(n, value, others=None):
    k = n // 2 + 1
    rest = others if others is not None else [rng.randint(-10**9, 10**9) for _ in range(n - k)]
    nums = [value] * k + rest[: n - k]
    rng.shuffle(nums)
    return {"nums": nums}

n = 100000
tests = [
    {"nums": [5]},
    {"nums": [-1, -1]},
    {"nums": [1, 2, 1]},
    {"nums": [4, 4, 5, 5, 4]},
    majority(1001, 0),
    majority(n, -10**9),
    majority(n - 1, 10**9),
    # Majority all at the start, or all at the end after n / 2 distinct other values.
    {"nums": [7] * (n // 2 + 1) + list(range(10, 10 + n // 2 - 1))},
    {"nums": list(range(10, 10 + n // 2 - 1)) + [7] * (n // 2 + 1)},
    majority(n, 123, [rng.randint(0, 5) for _ in range(n)]),
]
print(json.dumps(tests))
