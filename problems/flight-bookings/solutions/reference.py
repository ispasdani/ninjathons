from itertools import accumulate


def seats_booked(bookings: list[list[int]], n: int) -> list[int]:
    diff = [0] * (n + 1)
    for first, last, seats in bookings:
        diff[first - 1] += seats
        diff[last] -= seats
    return list(accumulate(diff[:n]))
