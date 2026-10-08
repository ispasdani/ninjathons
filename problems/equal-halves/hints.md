## Hint

Handing each item to whoever has less so far doesn't always work: try `[3, 3, 2, 2, 2]`.

## Hint

If the total is odd, it's impossible. Otherwise the question is whether some of the items add up to exactly half the total. Trying every subset is 2^100 tries.

## Hint

Keep a table `reachable[s]`: can some of the items seen so far add up to `s`? Start with only 0 reachable, and for each item `x` mark `s + x` for every reachable `s`, going from high `s` to low so the item isn't used twice. The answer is `reachable[total / 2]`.
