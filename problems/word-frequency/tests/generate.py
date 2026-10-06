"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

import string

vocab = ["".join(rng.choice(string.ascii_letters) for _ in range(rng.randint(1, 8))) for _ in range(2000)]
weights = [1 / (i + 1) for i in range(len(vocab))]

def text(words, width=80):
    picked = rng.choices(vocab, weights=weights, k=words)
    out, line = [], []
    for w in picked:
        line.append(w + rng.choice(["", "", ",", ".", "!", "'s", " -"]))
        if sum(len(x) + 1 for x in line) > width:
            out.append(" ".join(line))
            line = []
    out.append(" ".join(line))
    return "\n".join(out) + "\n"

tests = [
    "\n",
    "123 456 !!!\n",
    "a\n",
    "A a A\n",
    "b a\n",
    "zeta Alpha zeta alpha beta\nBETA gamma\n",
    "one-two three_four five6six\n",
    text(500),
    text(150000),
    "x " * 400000 + "\n",
]
print(json.dumps(tests))
