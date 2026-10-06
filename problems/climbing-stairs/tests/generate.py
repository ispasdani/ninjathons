"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

tests = [{"n": n} for n in [1, 4, 5, 10, 20, 30, 44, 45, 46, 60, 70, 74, 75]]
print(json.dumps(tests))
