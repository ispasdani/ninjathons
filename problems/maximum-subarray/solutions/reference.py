def max_sub_array(nums: list[int]) -> int:
    # Best sum = largest (prefix[j] - smallest prefix before j).
    best = nums[0]
    prefix = 0
    smallest = 0
    for x in nums:
        prefix += x
        best = max(best, prefix - smallest)
        smallest = min(smallest, prefix)
    return best
