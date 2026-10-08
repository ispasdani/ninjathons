## Hint

In the first term you can take exactly the courses with no prerequisites. Once those are passed, which courses open up?

## Hint

Count each course's prerequisites still to pass (its in-degree). Take every course at 0 in one term, then lower the count of each course that follows them; the ones that reach 0 make the next term. That's a breadth-first topological sort, one level per term.

## Hint

If the terms run out before every course is taken, the rest are stuck in a cycle: return -1. Scanning all courses each term to find the ready ones is too slow when there are 100,000 terms in a chain.
