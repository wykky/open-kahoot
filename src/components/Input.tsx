import { forwardRef, useId } from 'react';
import { LucideIcon } from 'lucide-react';
import { accent } from '@/lib/palette';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  variant?: 'default' | 'center' | 'large';
  icon?: LucideIcon;
  actionButton?: {
    icon: LucideIcon;
    onClick: () => void;
    title?: string;
  };
}

/**
 * Generic input with a programmatically-associated label.
 *
 * The label and input are linked via a `useId()`-generated id so screen readers
 * announce the field name on focus. Caller-supplied `id` wins if provided.
 * Errors get their own id and are pointed to via aria-describedby/-invalid.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, variant = 'default', className = '', icon: Icon, actionButton, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? `input-${generatedId}`;
    const errorId = `${inputId}-error`;

    const baseClasses = `w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-black placeholder-gray-400 focus:outline-none focus:ring-2 ${accent.ringFocus} ${accent.borderFocus}`;

    const variantClasses = {
      default: "",
      center: "text-center text-4xl font-black",
      large: "text-xl"
    };

    const hasRightElement = Icon || actionButton;
    const rightPadding = hasRightElement ? (variant === 'center' ? 'px-12' : 'pr-12') : '';

    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={inputId} className="block text-black text-sm font-medium">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={`${baseClasses} ${variantClasses[variant]} ${rightPadding} ${className}`}
            {...props}
          />
          {Icon && (
            <Icon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
          )}
          {actionButton && (
            <button
              type="button"
              onClick={actionButton.onClick}
              aria-label={actionButton.title}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-gray-100 hover:bg-gray-200 rounded-md p-1.5 transition-colors"
              title={actionButton.title}
            >
              <actionButton.icon className="w-4 h-4 text-gray-600" aria-hidden="true" />
            </button>
          )}
        </div>
        {error && (
          <div id={errorId} role="alert" className="bg-red-500 border border-none rounded-lg p-3">
            <p className="text-white text-sm">{error}</p>
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
