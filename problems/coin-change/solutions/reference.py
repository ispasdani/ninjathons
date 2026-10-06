from collections import deque

def coin_change(coins: list[int], amount: int) -> int:
    # Breadth-first search over amounts: the first time we reach 0, we used the fewest coins.
    steps = {amount: 0}
    queue = deque([amount])
    while queue:
        a = queue.popleft()
        if a == 0:
            return steps[a]
        for c in coins:
            if c <= a and a - c not in steps:
                steps[a - c] = steps[a] + 1
                queue.append(a - c)
    return -1
