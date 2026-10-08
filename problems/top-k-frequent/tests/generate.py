"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

tests = [{"nums": n, "k": k} for n, k in [([1], 1), ([2, 1], 2), ([2, 1], 1), ([-1, -1, 3, 3, 0], 2), ([5, 5, 5, 4, 4, 3], 3)]]
for _ in range(8):
    n = rng.randint(1, 40)
    nums = [rng.randint(-5, 5) for _ in range(n)]
    tests.append({"nums": nums, "k": rng.randint(1, len(set(nums)))})
nums = [rng.randint(-10**4, 10**4) for _ in range(100000)]
tests.append({"nums": nums, "k": 50})
nums = [rng.randint(-200, 200) for _ in range(100000)]
tests.append({"nums": nums, "k": len(set(nums))})
print(json.dumps(tests))
