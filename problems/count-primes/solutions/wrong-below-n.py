# Counts primes strictly below n, missing n when n is prime.
import sys

n = int(sys.stdin.read())
sieve = [True] * max(n, 2)
sieve[0] = sieve[1] = False
for i in range(2, int(n ** 0.5) + 1):
    if sieve[i]:
        for j in range(i * i, n, i):
            sieve[j] = False
print(sum(sieve[:n]))
