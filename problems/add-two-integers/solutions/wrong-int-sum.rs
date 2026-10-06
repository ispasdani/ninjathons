// The classic typed-language bug: the sum is computed in 32 bits (it wraps in
// release mode), then widened.
impl Solution {
    pub fn add(a: i32, b: i32) -> i64 {
        a.wrapping_add(b) as i64
    }
}
