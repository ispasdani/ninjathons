String problems look varied, but most reduce to a handful of ideas. The trick is noticing what about the strings actually matters, and throwing the rest away.

## Clues and the patterns they suggest

| The problem is about… | Reach for… |
|---|---|
| Which characters appear, and how often | Counting: an array of 26, or a hash map |
| Strings that are "the same" up to some rearrangement or change | A **canonical form**: a key that's equal exactly when the strings count as the same |
| The longest/shortest substring with a property | Sliding window with counts |
| Reading the string the same from both ends | Two pointers from the ends |
| Nested or matching characters (brackets, tags) | A stack |
| Comparing two strings position by position, with edits | Dynamic programming over prefixes |
| Parsing text with rules | Step by step, one rule at a time (see *Edge cases*) |

## Canonical forms

Many grouping and matching problems become easy once you find the right **key**: a value computed from each string, equal for exactly the strings that should match. Then a hash map from key to group does the rest, in one pass.

Example: group words that are **rotations** of each other, like `"abcd"`, `"bcda"` and `"cdab"`. Every rotation of a word has the same smallest rotation, so that's a canonical key:

```javascript
function smallestRotation(word) {
  let best = word;
  for (let i = 1; i < word.length; i++) {
    const rotated = word.slice(i) + word.slice(0, i);
    if (rotated < best) best = rotated;
  }
  return best;
}

function groupRotations(words) {
  const groups = new Map();
  for (const w of words) {
    const key = smallestRotation(w);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(w);
  }
  return [...groups.values()];
}
```

The questions to ask about any key:

- **Is it exact?** Equal keys must mean "same", and different keys "different". A key that's too loose merges groups that should be separate. For anagrams, the *set* of letters is too loose: "aab" and "abb" have the same set.
- **What does it cost?** Building each key costs something (here O(L²) per word of length L; a sorted copy is O(L log L); 26 counts are O(L)). Multiply by the number of strings.

The exercise below is the classic anagram version: decide on an exact key and what it costs. Then read the statement's rules for the output order carefully, since they're part of the answer.

## Character counts as arrays

When the alphabet is small and known (26 lowercase letters), an array of 26 counts is faster and simpler than a hash map: `count[ch.charCodeAt(0) - 97]++` in JavaScript, `count[ord(ch) - ord("a")] += 1` in Python. To use the counts as a hash map key, join them into a string, such as `count.join(",")`.
