## Hint

Trying every candidate from the smaller number downwards works, but with numbers near two billion that's billions of steps.

## Hint

Euclid's algorithm: the common divisors of `a` and `b` are the same as those of `b` and `a % b`. Replace `(a, b)` with `(b, a % b)` until `b` is 0; then `a` is the answer.
