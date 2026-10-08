"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

import string
alphabet = string.ascii_letters + string.digits + " .,!?"
tests = [{"s": s} for s in ["", "a", "B", "rhythm", "AEIOUaeiou", "Yy", "Programming Is Fun!", "xyz123"]]
tests += [{"s": "".join(rng.choice(alphabet) for _ in range(rng.randint(1, 60)))} for _ in range(8)]
tests.append({"s": "".join(rng.choice(alphabet) for _ in range(100000))})
print(json.dumps(tests))
