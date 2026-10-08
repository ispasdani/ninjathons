Many interview problems are really a question about **which data structure** to use. Pick the one whose cheap operations are exactly the ones the problem does most, and the algorithm often writes itself.

## What each structure is good at

| Structure | Cheap (O(1) or O(log n)) | Expensive |
|---|---|---|
| Array / list | read by position, add at the end | search by value, insert or remove at the front |
| Hash set | "have I seen x?", add, remove | anything about order |
| Hash map | look up, count, group by key | anything about order |
| Sorted array | binary search, min and max | insert or remove (O(n)) |
| Stack | the most recent item | anything else |
| Queue / deque | the oldest item (and both ends, for a deque) | the middle |
| Heap | the smallest (or largest), add, remove the smallest | search, the k-th in general |

## Work backwards from the operations

List what your algorithm does, and how often:

1. "For each of n items, check whether I've seen its partner" → n lookups by value → **hash set or map**.
2. "Repeatedly take the earliest deadline, while new tasks keep arriving" → many min-removals among insertions → **heap**.
3. "Undo the most recent change" → last in, first out → **stack**.
4. "Process in order of arrival" → first in, first out → **queue**.

## Combining structures

Harder problems often need two structures working together, each covering the other's weak spot. A common pairing: a hash map for **counting**, then something else for **ordering by count**.

Example: the *k* most common words in a long text, most common first:

1. Count every word with a hash map: O(n).
2. Order the distinct words by count. Three options, with different costs:
   - **Sort** them all by count: O(d log d) for d distinct words. Simple, and fine for most inputs.
   - Keep a **min-heap of size k** while scanning the counts: O(d log k). Better when k is much smaller than d.
   - **Bucket** the words by count (a list per possible count, since a count is at most n), then read the buckets from the top: O(n). Best when counts are bounded.

Being able to offer all three with their costs, then choosing one for a reason ("k is small here, so the heap"), is exactly what interviewers want to hear.

## Ties

Whenever you order things, ask **what happens on a tie**. Statements often specify it (smaller value first, alphabetical, first seen), and a sort that ignores it gives a different answer from the one expected. Build the tie-break into the comparison: compare by the main key, and only if equal, by the second.

The exercise below is a counting-plus-ordering problem with a tie rule. Before coding, decide which of the three orderings you'll use, and say why.
