# Sorts by count only, so tied words come out in the order they first appeared.
import re
import sys
from collections import Counter

counts = Counter(w.lower() for w in re.findall(r"[A-Za-z]+", sys.stdin.read()))
for word, count in sorted(counts.items(), key=lambda item: -item[1]):
    print(word, count)
