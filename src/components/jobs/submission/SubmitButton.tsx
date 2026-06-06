import { Send } from "@/components/jobs/shared/icons";

interface SubmitButtonProps {
  busy: boolean;
  step: string;
  label?: string;
}

export function SubmitButton({ busy, step, label = "Submit" }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={busy}
      className={[
        "w-full h-[52px] rounded-full border-0 text-white text-[16px] font-semibold tracking-[-0.005em] flex items-center justify-center gap-2 font-(--font)",
        busy ? "bg-(--ink-3) cursor-not-allowed" : "bg-(--ink) cursor-pointer",
      ].join(" ")}
    >
      {busy ? (
        <>
          <div className="landing-spinner" style={{ width: 16, height: 16 }} />
          {step}
        </>
      ) : (
        <>
          {label}
          <Send size={18} weight={2.2} />
        </>
      )}
    </button>
  );
}
