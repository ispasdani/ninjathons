## Hint

The answer is the largest number of meetings going on at the same moment.

## Hint

Walk along the timeline: each start takes a room and each end frees one. You only need to look at the moments where something starts or ends, in time order.

## Hint

Sort all the starts and, separately, all the ends. Move through the starts; before taking a room for a start, free every room whose meeting ends at or before it (that's why an end at minute 10 comes before a start at minute 10). Track the most rooms in use at once. A min-heap of end times works too.
