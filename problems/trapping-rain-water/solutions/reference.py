def trap(height: list[int]) -> int:
    n = len(height)
    right = [0] * n
    best = 0
    for i in range(n - 1, -1, -1):
        best = max(best, height[i])
        right[i] = best
    water = left = 0
    for i, h in enumerate(height):
        left = max(left, h)
        water += min(left, right[i]) - h
    return water
