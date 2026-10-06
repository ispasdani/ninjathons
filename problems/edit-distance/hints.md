## Hint

Compare the last characters. If they match, no edit is needed for them; otherwise the last edit was an insert, a delete or a replace.

## Hint

Let d[i][j] be the distance between the first i characters of word1 and the first j of word2. Then d[i][0] = i, d[0][j] = j, and each cell depends on its left, upper and upper-left neighbours.

## Hint

Fill the table row by row; you only ever need the previous row.
