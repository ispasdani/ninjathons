"""Large Two Sum tests. Prints a JSON array of inputs; expected outputs come
from the reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261003)


def make(n, lo, hi, pair_at_end=False):
    while True:
        nums = rng.sample(range(lo, hi), n)
        i, j = (n - 2, n - 1) if pair_at_end else sorted(rng.sample(range(n), 2))
        target = nums[i] + nums[j]
        if not -10**9 <= target <= 10**9:
            continue
        seen = set()
        pairs = 0
        for x in nums:
            if target - x in seen:
                pairs += 1
            seen.add(x)
        if pairs == 1:
            return {"nums": nums, "target": target}


tests = [
    make(1000, -10**6, 10**6),
    make(100000, -10**9 // 2, 10**9 // 2),
    # The answer is the last two numbers, so checking every pair takes ~5 billion steps.
    make(100000, -10**9 // 2, 10**9 // 2, pair_at_end=True),
    make(100000, 0, 10**9 // 2, pair_at_end=True),
]
print(json.dumps(tests))
