"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

tests = [f"{n}\n" for n in [0, 2, 3, 4, 97, 100, 1000, 7919, 65536, 999983, 5000000, 9999991, 10000000]]
print(json.dumps(tests))
