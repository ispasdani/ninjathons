"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

def case(nums):
    return f"{len(nums)}\n{' '.join(map(str, nums))}\n"

n = 200000
tests = [
    case([0]),
    case([7]),
    case([-5, 5]),
    case([10**9] * 3),
    case([rng.randint(-100, 100) for _ in range(100)]),
    case([rng.randint(-10**9, 10**9) for _ in range(n)]),
    case([10**9] * n),
    case([-10**9] * n),
    case([rng.randint(0, 10**9) for _ in range(n)]),
    case([2**31 - 1, 1]),
]
print(json.dumps(tests))
