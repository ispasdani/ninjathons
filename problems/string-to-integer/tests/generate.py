"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

import string
cases = ["", " ", "+", "-", "+-12", "-+12", "  +0 123", "00000000000000000001", "-2147483648", "-2147483649", "2147483647", "2147483648",
         "words 123", "3.14159", ".5", "  -0012a42", "-91283472332", "1" * 200, "-" + "9" * 50, "   +", "0-1", "12 34"]
tests = [{"s": c} for c in cases]
alphabet = string.digits * 3 + " +-.ab"
for _ in range(10):
    tests.append({"s": "".join(rng.choice(alphabet) for _ in range(rng.randint(0, 30)))})
print(json.dumps(tests))
