/** Result returned by server actions to forms using useActionState. */
export interface FormState {
  status: "idle" | "error" | "success";
  message?: string;
  /** Field path (dot notation) to error message. */
  fieldErrors?: Record<string, string>;
}

export const INITIAL_FORM_STATE: FormState = { status: "idle" };

export function fieldErrorsFrom(issues: readonly { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    errors[key] ??= issue.message;
  }
  return errors;
}
