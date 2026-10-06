# Starts the sequence one place too early: returns ways(n - 1).
def climb_stairs(n: int) -> int:
    a, b = 0, 1
    for _ in range(n - 1):
        a, b = b, a + b
    return b
