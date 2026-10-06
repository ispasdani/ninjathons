def max_profit(prices: list[int]) -> int:
    best, lowest = 0, prices[0]
    for p in prices:
        if p < lowest:
            lowest = p
        elif p - lowest > best:
            best = p - lowest
    return best
