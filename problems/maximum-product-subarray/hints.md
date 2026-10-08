## Hint

Try the brute force first: every start, every end, multiply as you go. It's O(n²): fine to check your understanding, too slow here.

## Hint

Unlike sums, a very negative product can become the largest after one more negative number. So for each position, keep both the largest **and** the smallest product of a part ending there.

## Hint

A zero cuts everything: no part that crosses it can do better than starting fresh after it.
