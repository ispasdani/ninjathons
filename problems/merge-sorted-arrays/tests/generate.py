"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

tests = [{"a": a, "b": b} for a, b in [([], []), ([1], []), ([], [1]), ([1, 1], [1]), ([5], [1, 2, 3, 4]), ([1, 2, 3, 4], [5]), ([-3, 0], [-3, 0])]]
def sorted_list(n):
    return sorted(rng.randint(-10**9, 10**9) for _ in range(n))
for _ in range(6):
    tests.append({"a": sorted_list(rng.randint(0, 20)), "b": sorted_list(rng.randint(0, 20))})
tests.append({"a": sorted_list(100000), "b": sorted_list(100000)})
tests.append({"a": sorted_list(100000), "b": []})
print(json.dumps(tests))
