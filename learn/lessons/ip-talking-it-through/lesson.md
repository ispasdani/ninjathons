In an interview, a correct answer reached in silence scores worse than a nearly correct one explained clearly. The interviewer can't give credit for reasoning they can't see, and can't help you if they don't know where you're stuck. Thinking out loud is a skill, and like any skill it needs practice.

## What to say

You don't need to narrate every keystroke. Say what a colleague pairing with you would want to know:

- **What you're about to do and why**: "I'll keep a pointer into each list, since both are sorted."
- **What you've noticed**: "Both inputs are sorted, so the smallest overall is at the front of one of them."
- **What you're unsure about**: "I'm not sure whether duplicates should appear twice; I'll assume yes and check with you."
- **When you change your mind**: "Actually, this breaks when one list is empty. Let me handle that first."

## Example: merging two sorted lists of meeting times

Here's how talking through a related problem might sound, for two lists of start times, each already sorted:

> "Both lists are sorted, so I never need to look back. I'll keep an index into each. At each step the earliest remaining time is at one of the two indices, so I compare those two, take the smaller, and move that index on. When one list runs out, the rest of the other is already in order, so I can append it in one go. That's one pass over each list: O(n + m) time, and the output is the only extra memory."

Notice what that does: it states the key observation (sorted, so never look back), the step that repeats, the case where one side runs out, and the cost. An interviewer hearing that knows you've got it before you write a line.

## When you're stuck

Silence is the worst option. Instead:

1. **Say where you are**: "I have an O(n²) idea; I'm looking for something faster."
2. **Go back to examples**: work a new one by hand and watch what you do. Your hands often know a shortcut your head hasn't noticed yet.
3. **Simplify**: solve an easier version (sorted input, no duplicates, only two items), then extend it.
4. **Ask for a hint**, plainly. Using one well is a good signal, not a failure.

## Being asked "why?"

Interviewers ask "why does that work?" or "what's the complexity?" to see that you understand your own solution, not that you've memorised it. Answer with the reason, not the name: "because each item enters and leaves the window at most once, so it's linear", not just "it's a sliding window".

## Practise it

For the exercise below, before writing code, say (or type, as a comment) your plan in three or four sentences the way the example above does: the observation, the repeated step, the edge case, the cost. Then write the code to match.
