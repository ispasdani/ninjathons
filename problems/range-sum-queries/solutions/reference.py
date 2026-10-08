from itertools import accumulate


def range_sums(nums: list[int], queries: list[list[int]]) -> list[int]:
    prefix = [0, *accumulate(nums)]
    return [prefix[right + 1] - prefix[left] for left, right in queries]
