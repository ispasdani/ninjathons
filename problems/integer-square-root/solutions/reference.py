from math import isqrt


def integer_sqrt(xs: list[int]) -> list[int]:
    return [isqrt(x) for x in xs]
