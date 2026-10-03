# Uses the same element twice when target is double a number.
def two_sum(nums: list[int], target: int) -> list[int]:
    index = {x: i for i, x in enumerate(nums)}
    for i, x in enumerate(nums):
        if target - x in index:
            return [i, index[target - x]]
    return []
