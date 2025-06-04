
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateTextInput, isValidEmail, isValidPhone } from '@/utils/inputValidation';
import { cn } from '@/lib/utils';

interface SecureFormInputProps {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'phone' | 'password';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  className?: string;
  error?: string;
  disabled?: boolean;
}

export const SecureFormInput = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  maxLength = 1000,
  className,
  error,
  disabled = false
}: SecureFormInputProps) => {
  const [validationError, setValidationError] = React.useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Basic sanitization and length validation
    const sanitizedValue = validateTextInput(inputValue, maxLength);
    
    // Type-specific validation
    let typeError = '';
    if (inputValue && type === 'email' && !isValidEmail(inputValue)) {
      typeError = 'Please enter a valid email address';
    } else if (inputValue && type === 'phone' && !isValidPhone(inputValue)) {
      typeError = 'Please enter a valid phone number';
    }
    
    setValidationError(typeError);
    onChange(sanitizedValue);
  };

  const displayError = error || validationError;
  const hasError = Boolean(displayError);

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={cn(required && "after:content-['*'] after:text-red-500 after:ml-1")}>
        {label}
      </Label>
      <Input
        id={id}
        type={type === 'phone' ? 'tel' : type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        disabled={disabled}
        className={cn(
          className,
          hasError && "border-red-500 focus:border-red-500 focus:ring-red-500"
        )}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${id}-error` : undefined}
      />
      {hasError && (
        <p id={`${id}-error`} className="text-sm text-red-600" role="alert">
          {displayError}
        </p>
      )}
    </div>
  );
};
