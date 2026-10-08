A row of balloons each carries a number, `balloons[i]`. You pop them one at a time, in any order you like, until none are left.

Popping a balloon earns `left × it × right` coins, where `it` is that balloon's number and `left` and `right` are the numbers of the balloons **currently** next to it. Once a balloon is popped, its neighbours become next to each other. Past either end of the row, count the missing neighbour as a 1.

Return the most coins you can earn.

## Constraints

- `1 <= balloons.length <= 200`
- `0 <= balloons[i] <= 100`
