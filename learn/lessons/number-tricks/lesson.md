A few pieces of number theory come up again and again in programming problems: divisibility, primes, and greatest common divisors. Each has a classic algorithm that turns a hopelessly slow brute force into something instant.

## Checking one number for primality

A prime has no divisors other than 1 and itself. To check `n`, you only need to try divisors up to **√n**: if `n = a × b`, one of `a` and `b` is at most √n.

```javascript
function isPrime(n) {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}
```

```python
def is_prime(n):
    if n < 2:
        return False
    d = 2
    while d * d <= n:
        if n % d == 0:
            return False
        d += 1
    return True
```

O(√n) instead of O(n): for a number around a billion, about 30,000 steps instead of a billion. Writing `d * d <= n` instead of `d <= Math.sqrt(n)` avoids floating-point rounding.

## Many primes at once: the sieve

To find **every** prime up to `n`, testing each number one by one is O(n√n). The **sieve of Eratosthenes** crosses out multiples instead:

1. Start with every number from 2 to `n` marked as prime.
2. Take the smallest number still marked, `p`. It's prime. Cross out its multiples, starting at `p × p` (smaller multiples were already crossed out by smaller primes).
3. Repeat while `p × p <= n`.

It runs in O(n log log n), practically linear. For ten million numbers, use a compact array: `Uint8Array` in JavaScript, or `bytearray` in Python, where slice assignment `is_prime[p*p::p] = bytes(len(range(p*p, n+1, p)))` crosses out a whole row of multiples in one fast step.

## Greatest common divisor: Euclid

The greatest common divisor (GCD) of two numbers is the largest number dividing both. Trying every candidate is slow for big numbers. Euclid's algorithm, over 2,000 years old, rests on one fact: **any number dividing both `a` and `b` also divides `a % b`**, and the other way round. So the GCD doesn't change when you replace the pair `(a, b)` with `(b, a % b)`, and the numbers shrink fast: at least halving every two steps. When the second number reaches 0, the first is the answer, since every number divides 0.

The code is three lines; working out that loop is the exercise. Python also has `math.gcd`, but write it yourself first.

**Least common multiple** follows from it: `lcm(a, b) = a / gcd(a, b) * b`. Divide before multiplying, so the intermediate value doesn't overflow.

## Modular arithmetic

When answers get astronomically large, problems ask for them "modulo 10⁹ + 7". Take the remainder after **every** addition and multiplication, not just at the end, so numbers never grow out of range: `(a + b) % M` and `(a * b) % M`. In JavaScript, `a * b` of two numbers near 10⁹ exceeds 2⁵³ and loses precision before the `%`: use `BigInt` for that multiplication, or split it up.
