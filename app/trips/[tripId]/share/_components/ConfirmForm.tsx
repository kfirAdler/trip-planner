"use client";

export function ConfirmForm({
  action,
  confirmMessage,
  label,
  tone = "default",
}: {
  action: () => void | Promise<void>;
  confirmMessage: string;
  label: string;
  tone?: "default" | "danger";
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className={`rounded-full border px-3 py-1 text-xs font-bold ${
          tone === "danger"
            ? "border-accent text-accent"
            : "border-border text-foreground-muted"
        }`}
      >
        {label}
      </button>
    </form>
  );
}
