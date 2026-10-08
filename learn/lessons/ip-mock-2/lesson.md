The second mock is harder: one hard problem in 45 minutes. Hard problems in interviews are often graph problems in disguise, and this is one. You won't be told it's a graph; noticing is part of the test.

## Set up

Same as the first mock: a **45-minute** timer before you open the problem, nothing open but the problem and the Docs tab, and your thinking out loud or in comments.

## Hints on the process, not the answer

- **Model it.** When a problem talks about moving from one state to another by small steps (changing a letter, flipping a switch, moving a piece), ask: what are the nodes, and what makes two of them neighbours? Write that down before anything else.
- **What kind of shortest?** If every step costs the same, the fewest steps is a breadth-first search. If steps cost different amounts, it's Dijkstra. Which is this?
- **Neighbours are the expensive part.** With thousands of words, comparing every pair is slow. Think about how to *generate* candidate neighbours of a word instead, and how to check them quickly.
- **Count carefully.** Read again what the answer counts. Steps and words differ by one, and that's an easy bug to ship.
- **Plan the no-answer case** before coding: when is there no ladder at all?

## Timing guide

| Minutes | Goal |
|---|---|
| 0–5 | Problem restated, examples worked by hand, the graph model written down |
| 5–12 | Plan agreed with yourself: search type, how neighbours are found, complexity |
| 12–35 | Code |
| 35–42 | Trace an example, test edge cases, Run, Submit |
| 42–45 | Complexity, and what you'd improve with more time |

If you're stuck at minute 12 without a model, take the hint for the model (the first hint on the problem) and carry on: in a real interview you'd ask, and a hint taken early leaves time to finish.

## Review

Score yourself as in the first mock, and add one question: **did I spot the hidden structure, and how long did it take?** Recognising graphs, intervals, or DP inside an ordinary-sounding story is the skill hard problems test most. The more you practise, the sooner you see it.

When you've finished both mocks, keep going: pick an unsolved medium or hard problem from the library twice a week, timed, and review each one the same way.
