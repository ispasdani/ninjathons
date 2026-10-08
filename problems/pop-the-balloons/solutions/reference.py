def max_coins(balloons: list[int]) -> int:
    v = [1, *balloons, 1]
    n = len(v)
    best = [[0] * n for _ in range(n)]
    for gap in range(2, n):
        for left in range(n - gap):
            right = left + gap
            ends = v[left] * v[right]
            row, col = best[left], [best[k][right] for k in range(left + 1, right)]
            best[left][right] = max(
                row[k] + ends * v[k] + col[k - left - 1] for k in range(left + 1, right)
            )
    return best[0][n - 1]
