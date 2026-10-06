def max_area(height: list[int]) -> int:
    # For each height h, the widest pair of lines that are both at least h tall.
    order = sorted(range(len(height)), key=lambda i: -height[i])
    lo = hi = order[0]
    best = 0
    for i in order[1:]:
        lo, hi = min(lo, i), max(hi, i)
        best = max(best, height[i] * max(i - lo, hi - i))
    return best
