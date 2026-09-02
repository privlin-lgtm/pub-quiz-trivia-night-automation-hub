import { customAlphabet } from "nanoid";

// No 0/O/1/I to avoid confusion when teams type the code in on a phone.
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const generateSessionCode = customAlphabet(alphabet, 5);
export const generateTeamToken = customAlphabet(
  "abcdefghijklmnopqrstuvwxyz0123456789",
  24
);
export const generateHostToken = customAlphabet(
  "abcdefghijklmnopqrstuvwxyz0123456789",
  32
);
