// Forgets the last exception, so 2000 isn't a leap year.
function isLeapYear(year) {
  return year % 4 === 0 && year % 100 !== 0;
}
