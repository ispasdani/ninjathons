# Curriculum (phase 7 content)

Outline for the Learn content, agreed 8 Oct 2026: about 20 tutorials, 3 roadmaps, and the new problems they need. Rules are in [decisions §17](decisions.md#17-learn): a lesson ends in 1 to 3 exercises (at least one outside the weekly sets), a roadmap has 4 to 6 modules of 2 to 4 lessons, tutorials can be reused in any module, a roadmap lesson lives in one module, and only the first module is free.

Marks: **(new)** is a problem to write; \* is in a weekly set, so it joins its lesson only once its week has started.

## Tutorials (20, free)

Standalone, each on one technique, code in JavaScript and Python. Slugs are the folder names in `learn/lessons/`. A tutorial's worked examples are close cousins of its exercises, never their solutions: the lesson explains the idea, and the exercises are where it's applied.

| # | Tutorial | Exercises |
|---|---|---|
| 1 | `big-o-in-practice`: Big O in practice ✅ | Missing Number, Majority Element |
| 2 | `hash-maps-and-sets`: Hash maps and sets ✅ | Contains Duplicate, Two Sum, Valid Anagram |
| 3 | `two-pointers`: Two pointers ✅ | Valid Palindrome, Move Zeroes, Container With Most Water |
| 4 | `sliding-window`: Sliding windows ✅ | Longest Substring Without Repeats, Sliding Window Maximum |
| 5 | `prefix-sums`: Prefix sums ✅ | Product of Array Except Self, Range Sum Queries\*, Subarray Sum Equals K\* |
| 6 | `binary-search`: Binary search ✅ | Binary Search, First and Last Position ✅, Integer Square Root\* |
| 7 | `binary-search-on-the-answer`: Binary search on the answer ✅ | Smallest Divisor ✅, Minimum Reading Speed\*, Delivery Capacity\* |
| 8 | `stacks`: Stacks and monotonic stacks ✅ | Valid Parentheses, Daily Temperatures |
| 9 | `sorting-and-intervals`: Sorting and intervals ✅ | Merge Intervals, Can Attend All\*, Rooms Needed\* |
| 10 | `heaps`: Heaps and priority queues ✅ | Last Stone Weight ✅, Kth Largest\*, Running Median\* |
| 11 | `grids-bfs-and-dfs`: Grids: BFS and DFS ✅ | Number of Islands, Grid Shortest Path |
| 12 | `graphs`: Graphs from edge lists ✅ | Path Exists ✅, Connected Components\*, Fewest Terms\* |
| 13 | `dynamic-programming`: Dynamic programming, the basics ✅ | Climbing Stairs, Coin Change, House Robber\* |
| 14 | `dp-on-sequences`: DP on strings and sequences ✅ | Longest Increasing Subsequence, Edit Distance |
| 15 | `greedy`: Greedy choices ✅ | Best Time to Buy and Sell Stock, Maximum Subarray, Most Meetings\* |
| 16 | `matrices`: Working with matrices ✅ | Rotate Image, Spiral Order ✅ |
| 17 | `reading-input`: Reading input and printing output ✅ | Sum of a List, Word Frequency |
| 18 | `number-tricks`: Primes, divisors and number tricks ✅ | Count Primes, Greatest Common Divisor ✅ |
| 19 | `html-first-page`: Your first web page (HTML) ✅ | Shopping List, Links and Images ✅ |
| 20 | `css-layout-basics`: CSS: the box model and flexbox ✅ | Profile Card, Nav Bar ✅ |

## Roadmap 1: Programming basics ✅ written 8 Oct 2026

For someone who has never programmed. Every lesson shows JavaScript and Python side by side. Ends with a first web page. Badge: Basics done.

| Module | Lessons | Exercises |
|---|---|---|
| 1. First steps (free) | `pb-values-and-variables`: Values, variables and printing | Add Two Integers, Seconds to Minutes **(new)** |
| | `pb-making-decisions`: Making decisions with if | Fizz Buzz, Grade Letter **(new)** |
| 2. Loops and lists | `pb-loops`: Repeating with loops | Count Evens **(new)**, Sum of Digits **(new)** |
| | `pb-lists`: Lists and arrays | Largest in List **(new)**, Second Largest **(new)** |
| | `pb-strings`: Working with strings | Count Vowels **(new)**, Reverse Words **(new)** |
| 3. Functions and collections | `pb-functions`: Writing functions | Celsius to Fahrenheit **(new)**, Leap Year **(new)** |
| | Tutorial 2: Hash maps and sets | |
| | Tutorial 17: Reading input and printing output | |
| 4. Solving problems | `pb-debugging`: Finding and fixing bugs | Average of a List **(new)** |
| | `pb-testing-with-examples`: Testing your code with examples | Is Sorted **(new)** |
| | Tutorial 1: Big O in practice | |
| 5. Your first web page | Tutorial 19: Your first web page | |
| | Tutorial 20: CSS: the box model and flexbox | |
| | `pb-forms`: Forms | Sign-up Form **(new, HTML)** |

## Roadmap 2: Data structures and algorithms ✅ written 8 Oct 2026

The techniques interviews and contests lean on, mostly tutorials put in order, with one lesson of its own. Badge: Algorithmist.

| Module | Lessons |
|---|---|
| 1. Arrays and hashing (free) | Tutorials 1 (Big O), 2 (hash maps), 3 (two pointers), 5 (prefix sums) |
| 2. Searching and sorting | Tutorials 6 (binary search), 7 (on the answer), 9 (intervals) |
| 3. Stacks, windows and heaps | Tutorials 8 (stacks), 4 (sliding windows), 10 (heaps) |
| 4. Graphs | Tutorials 11 (grids), 12 (graphs); `dsa-shortest-paths`: Shortest paths with Dijkstra: Lowest-Cost Path ✅, Signal Time\* |
| 5. Dynamic programming and greedy | Tutorials 13 (DP basics), 14 (DP on sequences), 15 (greedy) |

## Roadmap 3: Interview prep ✅ written 8 Oct 2026

How to work through a problem with someone watching. Assumes roadmap 2. Its exercises are new problems, so finishing tutorials doesn't finish these lessons at the same time. Badge: Interview ready.

| Module | Lessons | Exercises |
|---|---|---|
| 1. How interviews work (free) | `ip-step-by-step`: The coding interview, step by step | First Unique Character ✅ |
| | `ip-talking-it-through`: Thinking out loud | Merge Sorted Arrays ✅ |
| 2. Edge cases and complexity | `ip-edge-cases`: Finding the edge cases first | String to Integer ✅ |
| | `ip-complexity-out-loud`: Stating time and space | Rotate Array ✅ |
| 3. Spotting the pattern | `ip-array-patterns`: Which pattern? Arrays | Trapping Rain Water |
| | `ip-string-patterns`: Which pattern? Strings | Group Anagrams ✅ |
| | `ip-choosing-a-structure`: Choosing the data structure | Top K Frequent ✅ |
| 4. From brute force to optimal | `ip-brute-force-first`: Start with brute force | Maximum Product Subarray ✅ |
| | `ip-hard-problems`: Breaking down a hard problem | Minimum Window Substring ✅ |
| 5. Mock interviews | `ip-mock-1`: Mock interview: one medium in 30 minutes | Valid Sudoku ✅ |
| | `ip-mock-2`: Mock interview: one hard in 45 minutes | Word Ladder ✅ |

## Totals

- **Lessons:** 20 tutorials + 9 Programming basics + 1 DSA + 11 Interview prep = **41**.
- **New problems: 32**, which takes the library from 56 to 88:
  - Programming basics, 12 (all easy, function mode): Seconds to Minutes, Grade Letter, Count Evens, Sum of Digits, Largest in List, Second Largest, Count Vowels, Reverse Words, Celsius to Fahrenheit, Leap Year, Average of a List, Is Sorted.
  - HTML and CSS, 3: Links and Images, Nav Bar, Sign-up Form.
  - Tutorials, 6: First and Last Position, Smallest Divisor, Last Stone Weight, Path Exists, Spiral Order, Greatest Common Divisor.
  - DSA, 1: Lowest-Cost Path.
  - Interview prep, 10: First Unique Character, Merge Sorted Arrays, String to Integer, Rotate Array, Group Anagrams, Top K Frequent, Maximum Product Subarray, Minimum Window Substring, Valid Sudoku, Word Ladder.
- **Not covered, for lack of types:** linked lists and trees. The function-mode signatures have no ListNode or TreeNode yet (decisions §8, as built in phase 2), so they wait for those types.

## Order of writing

1. ✅ The 12 Programming basics problems and its 9 lessons, so one roadmap is complete end to end (with tutorials 1, 17, 19, 20 and the 3 HTML and CSS challenges).
2. ✅ The 6 tutorial problems, the remaining tutorials (15 after step 1), and the DSA roadmap (1 lesson + 1 problem).
3. ✅ The 10 Interview prep problems and its 11 lessons.
4. The 3 HTML and CSS challenges go with their lessons, in steps 1 and 2.
