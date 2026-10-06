"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

tests = [
    {"coins": [1, 3, 4], "amount": 6},
    {"coins": [2], "amount": 1},
    {"coins": [3, 7], "amount": 5},
    {"coins": [5, 10], "amount": 0},
    {"coins": [10000], "amount": 10000},
    {"coins": [186, 419, 83, 408], "amount": 6249},
    {"coins": [1, 2, 5], "amount": 10000},
    {"coins": [2, 4, 6, 8], "amount": 9999},
    {"coins": [7, 13, 29, 31], "amount": 9997},
    {"coins": rng.sample(range(1, 200), 12), "amount": 10000},
    {"coins": rng.sample(range(50, 5000), 5), "amount": 9876},
    {"coins": [9999, 10000], "amount": 9998},
]
print(json.dumps(tests))
