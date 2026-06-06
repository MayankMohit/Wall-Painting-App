import { InputHTMLAttributes, forwardRef } from 'react';

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  trailing?: React.ReactNode;
  locked?: boolean; // green verified state
}

const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ label, error, hint, trailing, locked, style, ...inputProps }, ref) => {
    return (
      <div>
        {label && (
          <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">
            {label}
          </div>
        )}
        <div
          className={[
            'flex items-center gap-2 h-12 rounded-(--r) border px-3.5 transition-[border-color] duration-150',
            locked ? 'bg-(--approved-soft) border-(--approved)' : 'bg-(--surface)',
            error ? 'border-(--rejected)' : locked ? 'border-(--approved)' : 'border-(--border-2)',
          ].join(' ')}
        >
          <input
            ref={ref}
            {...inputProps}
            style={style}
            className="flex-1 h-full border-none outline-none bg-transparent text-[15px] text-(--ink) font-(--font) tracking-[-0.005em]"
          />
          {trailing}
        </div>
        {(error || hint) && (
          <p className={`mt-1.5 text-[11px] ${error ? 'text-(--rejected)' : 'text-(--ink-3)'}`}>
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

AuthField.displayName = 'AuthField';
export default AuthField;
