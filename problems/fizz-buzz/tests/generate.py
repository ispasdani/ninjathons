"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

tests = [{"n": n} for n in [1, 2, 4, 6, 10, 16, 30, 31, 99, 1000, 99999, 100000]]
print(json.dumps(tests))
