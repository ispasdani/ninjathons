# Never lets the sum drop below 0, as if the subarray could be empty.
def max_sub_array(nums: list[int]) -> int:
    best = current = 0
    for x in nums:
        current = max(0, current + x)
        best = max(best, current)
    return best
