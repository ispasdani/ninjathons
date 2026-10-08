Almost every interview ends with "what's the time and space complexity?" A confident, correct answer takes ten seconds and shows you understand your own code. A hesitant one undoes some of the good work before it. It's worth practising until it's automatic.

## How to work it out

1. **Name the inputs**: n for the length of a list, m for a second one, k for a parameter, L for the length of words.
2. **Find the loops**: one pass over n is O(n); a loop inside a loop is O(n × m), or O(n²).
3. **Count the hidden work**: sorting is O(n log n); slicing or copying a list is O(n); `in` on a list is O(n), on a set O(1).
4. **Add the pieces, keep the biggest**: a sort then a pass is O(n log n + n) = O(n log n).
5. **Space**: count what you create that grows with the input: a set of seen items is O(n), a few counters O(1), a copy of the input O(n). Say whether you count the output.

## Say it with the reason

Not just "O(n)", but why:

> "Sorting is O(n log n), then one pass over the sorted list is O(n), so O(n log n) overall. Space is O(n) for the sorted copy; I could sort in place to make it O(1) extra, if I'm allowed to change the input."

The reason is what the interviewer is listening for, and it protects you when your first answer is slightly off: they can see where.

## Simplifying

- Drop constants: O(2n) is O(n), O(n/2) is O(n).
- Keep separate inputs separate: O(n + m), not O(n), when two lists have unrelated sizes.
- Keep the dominant term: O(n² + n) is O(n²).
- Watch for values, not just sizes: a loop that runs `k` times where `k` can be a billion is O(k), whatever n is, unless you reduce `k` first.

## Example: shifting a list

Moving every item of a list `k` places to the right, wrapping round the end:

- Doing it one step at a time (move the last item to the front, `k` times) is O(n × k), and with `k` up to a billion that's hopeless. The first fix is noticing that `k` steps and `k % n` steps give the same result: now it's O(n × (k mod n)), at most O(n²).
- Computing each item's final position directly, `(i + k) % n`, writes each item once: O(n) time, O(n) space for the new list.
- There's also an in-place trick (three reversals) that keeps O(n) time with O(1) extra space.

Three solutions, three complexity statements, and a clear reason to prefer each. Being able to lay out options like that, with their costs, is exactly what the follow-up questions test. The exercise below is this problem: before you code, state the complexity of the approach you choose, and of the one you rejected.
