// Forgets the leading zero: 65 seconds comes out as "1:5".
function formatTime(seconds) {
  return `${Math.floor(seconds / 60)}:${seconds % 60}`;
}
