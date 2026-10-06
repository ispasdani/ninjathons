# Always takes the largest coin that fits.
def coin_change(coins: list[int], amount: int) -> int:
    count = 0
    for c in sorted(coins, reverse=True):
        count += amount // c
        amount %= c
    return count if amount == 0 else -1
