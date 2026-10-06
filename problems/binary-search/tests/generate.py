"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

n = 100000
nums = sorted(rng.sample(range(-10**9, 10**9), n))
present = set(nums)
queries = [rng.choice(nums) if rng.random() < 0.5 else rng.randint(-10**9, 10**9) for _ in range(n)]
tests = [
    {"nums": [1], "queries": [1]},
    {"nums": [1], "queries": [0, 2]},
    {"nums": [1, 3], "queries": [0, 1, 2, 3, 4]},
    {"nums": [-10**9, 10**9], "queries": [-10**9, 10**9, 0]},
    {"nums": list(range(0, 100, 2)), "queries": list(range(-1, 101))},
    {"nums": nums, "queries": queries},
    # Values past the end: a linear scan walks the whole array every time.
    {"nums": list(range(n)), "queries": [n + i for i in range(n)]},
    {"nums": list(range(n)), "queries": list(range(n - 1, -1, -1))},
    {"nums": nums, "queries": [nums[0], nums[-1], nums[n // 2]]},
    {"nums": nums[:1000], "queries": nums[:1000]},
]
print(json.dumps(tests))
