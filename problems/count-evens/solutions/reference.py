def count_evens(nums: list[int]) -> int:
    return sum(1 for x in nums if x % 2 == 0)
