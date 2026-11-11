import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface FieldShellProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

function FieldMessage({ hint, error, id }: { hint?: string; error?: string; id: string }) {
  if (error) {
    return (
      <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-error">
        {error}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
        {hint}
      </p>
    );
  }
  return null;
}

type InputProps = FieldShellProps & InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, required, id, className, ...rest }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={fieldId} className="mb-1.5 block text-[13px] font-medium text-ink">
            {label}
            {required && <span className="ml-0.5 text-error">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={cn(
            'h-11 w-full rounded-xl border bg-canvas px-3.5 text-sm text-ink transition',
            'placeholder:text-muted focus:outline-none focus:ring-4',
            error
              ? 'border-error focus:border-error focus:ring-error/15'
              : 'border-line focus:border-brand focus:ring-brand/15',
            className,
          )}
          {...rest}
        />
        <FieldMessage hint={hint} error={error} id={fieldId} />
      </div>
    );
  },
);
Input.displayName = 'Input';

type TextareaProps = FieldShellProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, required, id, className, ...rest }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={fieldId} className="mb-1.5 block text-[13px] font-medium text-ink">
            {label}
            {required && <span className="ml-0.5 text-error">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={!!error}
          className={cn(
            'min-h-24 w-full rounded-xl border bg-canvas px-3.5 py-2.5 text-sm text-ink transition',
            'placeholder:text-muted focus:outline-none focus:ring-4',
            error
              ? 'border-error focus:border-error focus:ring-error/15'
              : 'border-line focus:border-brand focus:ring-brand/15',
            className,
          )}
          {...rest}
        />
        <FieldMessage hint={hint} error={error} id={fieldId} />
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

type SelectProps = FieldShellProps & SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, required, id, className, children, ...rest }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={fieldId} className="mb-1.5 block text-[13px] font-medium text-ink">
            {label}
            {required && <span className="ml-0.5 text-error">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={fieldId}
            required={required}
            aria-invalid={!!error}
            className={cn(
              'h-11 w-full appearance-none rounded-xl border bg-canvas px-3.5 pr-9 text-sm text-ink transition',
              'focus:outline-none focus:ring-4',
              error
                ? 'border-error focus:border-error focus:ring-error/15'
                : 'border-line focus:border-brand focus:ring-brand/15',
              className,
            )}
            {...rest}
          >
            {children}
          </select>
          <svg
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <FieldMessage hint={hint} error={error} id={fieldId} />
      </div>
    );
  },
);
Select.displayName = 'Select';
