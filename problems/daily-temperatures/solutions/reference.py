def daily_temperatures(temperatures: list[int]) -> list[int]:
    # Walk backwards, keeping the first later day for each temperature 31..101.
    n = len(temperatures)
    answer = [0] * n
    next_day = [None] * 102
    for i in range(n - 1, -1, -1):
        t = temperatures[i]
        days = [d for d in next_day[t + 1:] if d is not None]
        answer[i] = min(days) - i if days else 0
        next_day[t] = i
    return answer
