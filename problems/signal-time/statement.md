A network has `n` servers, numbered `0` to `n - 1`. Each link `[from, to, ms]` carries a signal one way, from server `from` to server `to`, taking `ms` milliseconds.

Server `source` sends a signal at time 0, and every server passes it on along all its outgoing links as soon as it arrives.

Return how many milliseconds it takes until every server has the signal, or `-1` if some server never gets it.

## Constraints

- `1 <= n <= 100000`
- `0 <= links.length <= 200000`
- `0 <= from, to, source < n`, `from != to`
- `1 <= ms <= 10^4`
