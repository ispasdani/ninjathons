"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

import string
tests = [
    {"begin": "ab", "end": "cd", "words": ["ad", "cd"]},
    {"begin": "ab", "end": "cd", "words": ["cd"]},
    {"begin": "hot", "end": "dog", "words": ["hot", "dog"]},
    {"begin": "hot", "end": "dog", "words": ["hot", "dot", "dog"]},
    {"begin": "red", "end": "tax", "words": ["ted", "tex", "red", "tax", "tad", "den", "rex", "pee"]},
    {"begin": "lost", "end": "cost", "words": ["most", "fist", "lost", "cost", "fish"]},
]
def neighbours_chain(length, steps):
    word = "".join(rng.choice("abc") for _ in range(length))
    chain = [word]
    seen = {word}
    while len(chain) <= steps:
        w = list(chain[-1])
        i = rng.randrange(length)
        w[i] = rng.choice(string.ascii_lowercase)
        w = "".join(w)
        if w not in seen:
            seen.add(w)
            chain.append(w)
    return chain
for _ in range(5):
    chain = neighbours_chain(rng.randint(2, 4), rng.randint(2, 8))
    noise = ["".join(rng.choice("abcde") for _ in range(len(chain[0]))) for _ in range(rng.randint(0, 20))]
    words = list(dict.fromkeys(chain[1:] + noise))
    tests.append({"begin": chain[0], "end": chain[-1], "words": words})
chain = neighbours_chain(5, 40)
noise = set()
while len(noise) < 4900:
    noise.add("".join(rng.choice("abcdefgh") for _ in range(5)))
words = list(dict.fromkeys(chain[1:] + sorted(noise)))[:5000]
if chain[-1] not in words:
    words[-1] = chain[-1]
tests.append({"begin": chain[0], "end": chain[-1], "words": words})
words = sorted({"".join(rng.choice(string.ascii_lowercase) for _ in range(10)) for _ in range(5000)})
tests.append({"begin": "aaaaaaaaaa", "end": words[0], "words": words})
print(json.dumps(tests))
