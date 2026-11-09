interface StatusMessageProps {
  message?: string | null;
  tone?: "error" | "success";
  id?: string;
}

/** Announces form results to screen readers without moving focus. */
export function StatusMessage({ message, tone = "error", id }: StatusMessageProps) {
  return (
    <p
      id={id}
      role={tone === "error" ? "alert" : "status"}
      className={message ? (tone === "error" ? "error-text" : "font-semibold text-accent") : "sr-only"}
    >
      {message ?? ""}
    </p>
  );
}
