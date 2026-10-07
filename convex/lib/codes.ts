/**
 * Short codes people read out loud and type by hand: group invites and
 * challenge links. Case-insensitive; stored upper case.
 */

// No 0/O, 1/I/L.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

/** The stored form of a code someone typed or pasted. */
export function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

/** A random code; the caller checks it isn't taken. */
export function randomCode() {
  // Bytes past the last whole multiple of the alphabet are skipped, so every
  // character is equally likely.
  const limit = 256 - (256 % CODE_ALPHABET.length);
  let code = "";
  while (code.length < CODE_LENGTH) {
    for (const b of crypto.getRandomValues(new Uint8Array(CODE_LENGTH))) {
      if (b < limit && code.length < CODE_LENGTH) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
    }
  }
  return code;
}
