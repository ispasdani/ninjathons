def second_largest(nums: list[int]) -> int:
    top = max(nums)
    rest = [x for x in nums if x < top]
    return max(rest) if rest else -1
