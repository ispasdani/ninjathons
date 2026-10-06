def product_except_self(nums: list[int]) -> list[int]:
    zeros = nums.count(0)
    if zeros > 1:
        return [0] * len(nums)
    product = 1
    for x in nums:
        if x != 0:
            product *= x
    if zeros == 1:
        return [product if x == 0 else 0 for x in nums]
    return [product // x for x in nums]
