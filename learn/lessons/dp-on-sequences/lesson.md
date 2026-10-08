The DP basics tutorial worked on one row of items. Many classic problems compare **two** sequences (two words, two lists), or ask about **subsequences**: items taken in order but not necessarily next to each other. The same four questions (state, transition, base cases, answer) carry over, with a two-dimensional table.

## Two strings, one table

When a problem compares strings `a` and `b`, the usual state is a pair of prefixes:

> `dp[i][j]` = the answer for the first `i` characters of `a` and the first `j` characters of `b`.

The transition looks at the **last characters**, `a[i - 1]` and `b[j - 1]`: do they match, and if not, which one do you drop? The table has `(len(a) + 1) × (len(b) + 1)` entries. Row 0 and column 0 are the empty prefixes, which are usually the easy base cases.

## Example: longest common subsequence

The longest sequence of characters that appears, in order, in both strings. For `"abcde"` and `"ace"` it's `"ace"`, length 3.

- If the last characters match, they extend a common subsequence of the shorter prefixes: `dp[i][j] = dp[i - 1][j - 1] + 1`.
- If not, at least one of them isn't used: `dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])`.
- Base cases: anything with an empty string is 0.

```python
def lcs(a, b):
    dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[len(a)][len(b)]
```

```javascript
function lcs(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}
```

O(len(a) × len(b)) time and space. Each row only uses the row before it, so two rows are enough if memory is tight.

## Edit distance: the same table, three moves

*Edit Distance* asks for the fewest inserts, deletes and replaces that turn one word into another. It's the same table: at `dp[i][j]`, if the last characters match, they cost nothing; otherwise the last edit was one of three, and each corresponds to a neighbouring cell: up (delete), left (insert) or diagonal (replace). The base cases are no longer zeros: turning `i` characters into nothing takes `i` deletes. Work out what each neighbour means before writing the code; it's the whole problem.

## Longest increasing subsequence

The longest subsequence whose values strictly increase. The textbook DP:

> `dp[i]` = the length of the longest increasing subsequence that **ends** at item `i`; it's 1 plus the best `dp[j]` over earlier `j` with a smaller value.

That's O(n²). It's correct, but too slow for 100,000 items.

The faster idea keeps, for each length `L`, the **smallest possible last value** of an increasing subsequence of length `L`. Call that list `tails`. It's always sorted, and each new value either extends the longest subsequence (it's bigger than every tail) or improves one tail: it replaces the first tail that is at least as big. That position is found by **binary search**, so each item costs O(log n). The length of `tails` at the end is the answer.

`tails` isn't itself a valid subsequence; it's a summary that's just enough to answer the question. Work through `[3, 1, 4, 1, 5, 9, 2, 6]` by hand to see it.

## Reading a sequence problem

- "Subsequence" (in order, gaps allowed): DP over positions, often with a pair of indices.
- "Substring" or "subarray" (no gaps): usually a sliding window or prefix sums, not DP.
- Two inputs compared position by position: a 2D table indexed by prefixes.
