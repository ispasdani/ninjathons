// The classic typed-language bug: the sum is computed in 32 bits, then widened.
class Solution {
    public long add(int a, int b) {
        return a + b;
    }
}
