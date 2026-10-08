**Dynamic programming** is remembering answers to smaller questions so you never work them out twice. The hard part is choosing the smaller question: the best up to this house, the paths into this cell, the totals reachable with the items so far, the most from the balloons between two that are still standing.

Each problem this week has an honest brute force that tries every choice and grows exponentially. Find what it keeps recomputing, and store it.
