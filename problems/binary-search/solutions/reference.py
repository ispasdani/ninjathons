from bisect import bisect_left

def search(nums: list[int], queries: list[int]) -> list[int]:
    out = []
    for q in queries:
        i = bisect_left(nums, q)
        out.append(i if i < len(nums) and nums[i] == q else -1)
    return out
