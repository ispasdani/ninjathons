"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261030)


def splittable(n, high):
    # Two random halves with the same total, mixed together.
    while True:
        a = [rng.randint(1, high) for _ in range(n // 2)]
        b = [rng.randint(1, high) for _ in range(n - n // 2 - 1)]
        gap = sum(a) - sum(b)
        if 1 <= gap <= high:
            nums = a + b + [gap]
            rng.shuffle(nums)
            return {"nums": nums}


def even_values_odd_half(n):
    # Every value even and the total 2 more than a multiple of 4: half the
    # total is odd, so no group of even values reaches it. The total is even,
    # so only a real search finds that out.
    nums = [2 * rng.randint(1, 500) for _ in range(n)]
    if sum(nums) % 4 == 0:
        nums[0] = nums[0] + 2 if nums[0] < 1000 else nums[0] - 2
    rng.shuffle(nums)
    return {"nums": nums}


tests = [
    {"nums": [1]},
    {"nums": [7, 7]},
    {"nums": [1, 2]},
    {"nums": [2, 2, 2, 2, 2]},
    {"nums": [1000] * 100},
    {"nums": [1000] * 99 + [998, 2]},
    # Greedy (give each item to whoever has less) fails on these.
    {"nums": [3, 3, 2, 2, 2]},
    {"nums": [5, 5, 4, 3, 3]},
    splittable(10, 50),
    splittable(100, 1000),
    splittable(100, 1000),
    # No split, with an even total: every subset has to be ruled out.
    {"nums": [2] * 99 + [1000]},
    even_values_odd_half(100),
    even_values_odd_half(60),
    {"nums": [rng.randint(1, 1000) for _ in range(100)]},
]
print(json.dumps(tests))
