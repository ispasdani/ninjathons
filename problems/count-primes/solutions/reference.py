import sys

n = int(sys.stdin.read())
if n < 2:
    print(0)
else:
    sieve = bytearray([1]) * (n + 1)
    sieve[0] = sieve[1] = 0
    i = 2
    while i * i <= n:
        if sieve[i]:
            sieve[i * i :: i] = bytes(len(range(i * i, n + 1, i)))
        i += 1
    print(sum(sieve))
