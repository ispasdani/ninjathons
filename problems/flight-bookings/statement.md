An airline runs `n` flights, numbered `1` to `n`. Each booking `[first, last, seats]` reserves `seats` seats on every flight from `first` to `last`, both included.

Return an array `answer` of length `n` where `answer[i]` is the total number of seats booked on flight `i + 1`.

## Constraints

- `1 <= n <= 100000`
- `1 <= bookings.length <= 100000`
- `1 <= first <= last <= n`
- `1 <= seats <= 10000`
