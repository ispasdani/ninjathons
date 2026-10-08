## Hint

Think of each word as a node, joined to the words one letter away. The shortest ladder is a shortest path, and with every step costing the same, that's breadth-first search.

## Hint

Comparing every pair of words to find neighbours is O(n² × L). Instead, for each position of a word, try all 26 letters and look the result up in a set of the remaining words.

## Hint

Remove a word from the set as soon as you queue it, so it's never queued twice. And count words, not steps: a ladder of one step has two words.
