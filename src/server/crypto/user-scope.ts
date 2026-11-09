import "server-only";
import { currentUserDataScope, userDataScope } from "./sealed-columns";
import { userCipher } from "./user-data";

/** Runs `task` with the user's data key available to sealed columns (ADR 0010). */
export async function withUserData<T>(userId: string, task: () => Promise<T>): Promise<T> {
  const codec = await userCipher(userId);
  return userDataScope.run({ userId, codec }, task);
}

/** Id of the user whose data key is active: the owner of every row read or written. */
export function currentUserId(): string {
  return currentUserDataScope().userId;
}
