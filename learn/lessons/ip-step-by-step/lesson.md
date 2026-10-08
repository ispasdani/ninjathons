A coding interview isn't a test of whether you've seen the problem before. Interviewers are watching how you work: whether you understand the question, find a correct approach, write working code and check it, all while explaining yourself. A clear process, used every time, does most of the work.

## The shape of 45 minutes

A typical round has one problem, sometimes two, in 35 to 45 minutes. Spend it roughly like this:

| Step | Time | What you do |
|---|---|---|
| 1. Understand | 3–5 min | Restate the problem, ask questions, agree on examples |
| 2. Plan | 5–10 min | A brute force first, then something better; agree the plan before coding |
| 3. Code | 15–20 min | Write it cleanly, talking as you go |
| 4. Test | 5 min | Walk through an example by hand; try the edge cases |
| 5. Improve | the rest | Complexity, alternatives, follow-up questions |

The most common way to fail isn't a hard problem: it's jumping straight to code, solving a slightly different problem, and running out of time.

## 1. Understand

Say the problem back in your own words. Then ask about everything the statement leaves open:

- **Inputs**: How big can it get? Can it be empty? Negative numbers? Duplicates? Upper and lower case?
- **Output**: What if there's no answer? What if there are several?
- **Assumptions**: Is it sorted? Can I change the input?

Work one small example by hand, out loud. If your answer and the interviewer's differ, you've found a misunderstanding cheaply.

## 2. Plan

Start with the **brute force**, even if it's obviously slow, and state its complexity: "Checking every pair is O(n²)." This proves you can solve it, and gives you something to improve.

Then look for the waste in it. What is being recomputed? What could be remembered? Is the input sorted, or could sorting help? The tutorials' "when to reach for it" sections are the patterns to try.

Say the plan in a few sentences and **check the interviewer agrees** before writing code. They will often nudge you if you're heading somewhere difficult.

## 3. Code

- Use clear names (`seen`, `count`, `left`), not `a`, `b`, `tmp2`.
- Write helper functions for separate jobs, even small ones.
- Keep talking, briefly: "Now I count the characters… then a second pass to find the first one with a count of one."
- If you're unsure of a library function's exact name, say so and say what you'd use. Interviewers rarely mind; they mind silence.

## 4. Test

Don't announce "done". Walk your code through your earlier example, line by line, tracking the variables. Then the edge cases: empty, one item, all the same, the largest values. You'll often find a bug, and finding your own bug is a good sign, not a bad one.

## 5. Improve

State the final time and space complexity, and whether you could do better. Mention trade-offs: "This uses O(n) extra memory; if memory were tight, sorting first would avoid it at O(n log n) time."

## Practising here

Practise the steps on the exercise below as if someone were watching: write your questions and your plan as comments before the code, and test by hand before pressing Submit. It feels slow at first. With practice the process becomes automatic, and that frees your attention for the problem.
