from functools import cache

@cache
def climb_stairs(n: int) -> int:
    return 1 if n <= 1 else climb_stairs(n - 1) + climb_stairs(n - 2)
