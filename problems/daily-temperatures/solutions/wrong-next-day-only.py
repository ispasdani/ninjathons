# Only compares with the next day.
def daily_temperatures(temperatures: list[int]) -> list[int]:
    n = len(temperatures)
    return [1 if i + 1 < n and temperatures[i + 1] > temperatures[i] else 0 for i in range(n)]
