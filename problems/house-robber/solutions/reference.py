def rob(houses: list[int]) -> int:
    best = [0] * (len(houses) + 1)
    best[1] = houses[0]
    for i in range(2, len(houses) + 1):
        best[i] = max(best[i - 1], best[i - 2] + houses[i - 1])
    return best[-1]
