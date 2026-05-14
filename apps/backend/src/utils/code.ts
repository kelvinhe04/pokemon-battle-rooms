import { customAlphabet } from "nanoid";

// uppercase alphanumeric, 6 chars - easy to share verbally
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const generateRoomCode = customAlphabet(alphabet, 6);
