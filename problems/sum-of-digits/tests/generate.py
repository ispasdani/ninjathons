"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

tests = [{"n": n} for n in [0, 1, 9, 10, 11, 99, 100, 909, 1000000, 999999999, 2147483647]]
tests += [{"n": rng.randint(0, 2147483647)} for _ in range(10)]
print(json.dumps(tests))
