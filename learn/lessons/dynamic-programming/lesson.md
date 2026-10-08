Dynamic programming (DP) has a fearsome reputation, but the idea is simple: when a problem breaks into smaller versions of itself, and the **same** smaller versions come up again and again, solve each one once and remember the answer.

## The problem with plain recursion

Fibonacci numbers: each is the sum of the two before it, `fib(n) = fib(n - 1) + fib(n - 2)`. Written directly:

```python
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)
```

`fib(50)` takes hours. `fib(50)` calls `fib(49)` and `fib(48)`; `fib(49)` calls `fib(48)` again; the same values are recomputed an exponential number of times.

## Fix 1: remember answers (memoisation)

Keep a table of answers already worked out, and look there first:

```python
from functools import cache

@cache
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)
```

```javascript
const memo = new Map();
function fib(n) {
  if (n < 2) return n;
  if (!memo.has(n)) memo.set(n, fib(n - 1) + fib(n - 2));
  return memo.get(n);
}
```

Now each `fib(k)` is computed once: O(n).

## Fix 2: build up from the bottom (tabulation)

Or skip recursion altogether: fill a table from the smallest case upwards, so everything you need is ready by the time you need it:

```javascript
function fib(n) {
  const f = [0, 1];
  for (let i = 2; i <= n; i++) f[i] = f[i - 1] + f[i - 2];
  return f[n];
}
```

When each entry only uses the last few, keep just those few variables instead of the whole table: O(1) memory. Tabulation also avoids the recursion-depth limits that memoised recursion hits on big inputs.

## How to design one

Every DP solution answers four questions. Write them down before any code:

1. **The state.** What does `dp[i]` mean, exactly, in words? "The number of ways to make amount `i`", "the best total using the first `i` items".
2. **The transition.** How does `dp[i]` follow from smaller states? Usually by asking *what's the last decision?*
3. **The base cases.** The smallest states, whose answers you know directly: `dp[0]`, often.
4. **The answer.** Which state (or the best of which states) answers the question.

## Example: the cheapest way to climb

Each step of a staircase has a cost `cost[i]` to stand on. From a step you climb 1 or 2 steps. You start below the first step and want to get past the last one. What's the least you can pay?

1. State: `dp[i]` = the least cost to **stand on** step `i`.
2. Transition: the last move reached step `i` from `i - 1` or `i - 2`, so `dp[i] = cost[i] + min(dp[i - 1], dp[i - 2])`.
3. Base cases: `dp[0] = cost[0]`, `dp[1] = cost[1]` (you can start on either).
4. Answer: you leave from one of the last two steps, so `min(dp[n - 1], dp[n - 2])`.

```python
def cheapest_climb(cost):
    a, b = cost[0], cost[1]  # dp[i-2], dp[i-1]
    for c in cost[2:]:
        a, b = b, c + min(a, b)
    return min(a, b)
```

## Example: the fewest squares

What's the fewest perfect squares (1, 4, 9, 16, …) that add up to `n`? For 12 it's 3 (4 + 4 + 4); greedily taking the biggest square first gives 9 + 1 + 1 + 1, which is 4.

1. State: `dp[m]` = the fewest squares that add up to `m`.
2. Transition: the last square used was some `s × s <= m`, so `dp[m] = 1 + min(dp[m - s × s])` over every such `s`.
3. Base case: `dp[0] = 0`.
4. Answer: `dp[n]`.

```python
def fewest_squares(n):
    dp = [0] + [float("inf")] * n
    for m in range(1, n + 1):
        s = 1
        while s * s <= m:
            dp[m] = min(dp[m], dp[m - s * s] + 1)
            s += 1
    return dp[n]
```

O(n√n). Paying an amount with the fewest coins has exactly the same shape, with the coin values in place of the squares; the difference is that some amounts can't be made at all, so decide what "impossible" looks like in your table.

## Choosing or skipping

Many DP problems are a row of items where each is taken or skipped, under some rule. The transition then compares the two choices for the last item: `best(i) = max(skip it: best(i - 1), take it: value[i] + best(of whatever is still allowed))`.
