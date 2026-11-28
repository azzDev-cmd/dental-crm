import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  UZ_PHONE_PREFIX,
  extractUzbekPhoneLocalDigits,
  formatDateInput,
  formatTelegramUsernameInput,
  formatUzbekPhoneInput,
  isoToDisplayDate,
  isValidUzbekPhone,
  parseDisplayDateToIso,
} from '../utils/inputFormatters';

const BASE_INPUT_CLASSES =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:bg-slate-800';

const getCursorPositionForDigitCount = (formattedValue, digitCount, minIndex = 0) => {
  if (digitCount <= 0) return minIndex;
  let seen = 0;
  for (let i = minIndex; i < formattedValue.length; i += 1) {
    if (/\d/.test(formattedValue[i])) {
      seen += 1;
      if (seen === digitCount) {
        return i + 1;
      }
    }
  }
  return formattedValue.length;
};

/**
 * Reusable Telegram username input that keeps a single '@' prefix while editing
 * and avoids double '@@' on paste or manual '@' entry.
 */
export function TelegramUsernameInput({
  value = '',
  onChange,
  onFocus,
  onBlur,
  onClick,
  onKeyDown,
  className = '',
  placeholder = '@username',
  ...props
}) {
  const inputRef = useRef(null);
  const pendingCursorRef = useRef(null);
  const displayValue = value ? formatTelegramUsernameInput(value, { keepPrefixWhenEmpty: true }) : '';

  useLayoutEffect(() => {
    if (pendingCursorRef.current !== null && inputRef.current) {
      const pos = Math.max(1, pendingCursorRef.current);
      inputRef.current.setSelectionRange(pos, pos);
      pendingCursorRef.current = null;
    }
  });

  const clampSelection = (target) => {
    if (!target || !target.value.startsWith('@')) return;
    if (target.selectionStart === 0 && target.selectionEnd === 0) {
      target.setSelectionRange(1, 1);
    }
  };

  const handleFocus = (event) => {
    if (!displayValue) {
      pendingCursorRef.current = 1;
      onChange?.('@');
    } else {
      window.requestAnimationFrame(() => clampSelection(inputRef.current));
    }
    onFocus?.(event);
  };

  const handleBlur = (event) => {
    if (displayValue === '@') {
      onChange?.('');
    }
    onBlur?.(event);
  };

  const handleClick = (event) => {
    clampSelection(event.currentTarget);
    onClick?.(event);
  };

  const handleKeyDown = (event) => {
    const target = event.currentTarget;
    const { selectionStart, selectionEnd } = target;
    if (target.value.startsWith('@')) {
      if (
        (event.key === 'Backspace' && selectionStart <= 1 && selectionEnd <= 1) ||
        (event.key === 'Delete' && selectionStart === 0 && selectionEnd === 0) ||
        (event.key === 'ArrowLeft' && selectionStart <= 1 && selectionEnd <= 1)
      ) {
        event.preventDefault();
        return;
      }
      if (event.key === 'Home') {
        event.preventDefault();
        target.setSelectionRange(1, 1);
        return;
      }
    }
    onKeyDown?.(event);
  };

  const handleChange = (event) => {
    const raw = event.target.value;
    const cursorBefore = event.target.selectionStart ?? raw.length;
    const formatted = formatTelegramUsernameInput(raw, { keepPrefixWhenEmpty: true });

    if (formatted === '@') {
      pendingCursorRef.current = 1;
    } else if (cursorBefore <= 1) {
      pendingCursorRef.current = formatted.length;
    } else {
      const textBefore = raw.slice(0, cursorBefore).replace(/^@+/, '').replace(/[^a-zA-Z0-9_]/g, '');
      pendingCursorRef.current = Math.min(formatted.length, 1 + textBefore.length);
    }

    onChange?.(formatted);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="text"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      placeholder={placeholder}
      value={displayValue}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      className={`${BASE_INPUT_CLASSES} ${className}`.trim()}
      {...props}
    />
  );
}

/**
 * Reusable Uzbek phone input enforcing the "+998 XX XXX XX XX" mask.
 */
export function UzbekPhoneInput({
  value = '',
  onChange,
  onFocus,
  onClick,
  onKeyDown,
  required = false,
  invalidMessage = '',
  className = '',
  placeholder = '+998 90 123 45 67',
  ...props
}) {
  const inputRef = useRef(null);
  const pendingCursorRef = useRef(null);
  const displayValue = formatUzbekPhoneInput(value);
  const minCursor = UZ_PHONE_PREFIX.length;

  useEffect(() => {
    if (!inputRef.current) return;
    const localDigits = extractUzbekPhoneLocalDigits(displayValue);
    const shouldValidate = required || localDigits.length > 0;
    if (shouldValidate && !isValidUzbekPhone(displayValue)) {
      inputRef.current.setCustomValidity(invalidMessage || 'Please enter a valid +998 phone number.');
    } else {
      inputRef.current.setCustomValidity('');
    }
  }, [displayValue, required, invalidMessage]);

  useLayoutEffect(() => {
    if (pendingCursorRef.current !== null && inputRef.current) {
      const pos = Math.max(minCursor, Math.min(displayValue.length, pendingCursorRef.current));
      inputRef.current.setSelectionRange(pos, pos);
      pendingCursorRef.current = null;
    }
  });

  const clampSelection = (target) => {
    if (!target) return;
    if (target.selectionStart < minCursor && target.selectionEnd < minCursor) {
      target.setSelectionRange(target.value.length, target.value.length);
    } else if (target.selectionStart < minCursor) {
      target.setSelectionRange(minCursor, target.selectionEnd);
    }
  };

  const handleFocus = (event) => {
    window.requestAnimationFrame(() => clampSelection(inputRef.current));
    onFocus?.(event);
  };

  const handleClick = (event) => {
    clampSelection(event.currentTarget);
    onClick?.(event);
  };

  const handleKeyDown = (event) => {
    const target = event.currentTarget;
    const { selectionStart, selectionEnd } = target;

    if (event.key === 'Backspace') {
      if (selectionStart === selectionEnd && selectionStart <= minCursor) {
        event.preventDefault();
        return;
      }
      if (selectionStart === selectionEnd && selectionStart > minCursor && displayValue[selectionStart - 1] === ' ') {
        event.preventDefault();
        const digitsBefore = extractUzbekPhoneLocalDigits(displayValue.slice(0, selectionStart)).length;
        const currentDigits = extractUzbekPhoneLocalDigits(displayValue);
        if (digitsBefore > 0) {
          const nextDigits =
            currentDigits.slice(0, digitsBefore - 1) + currentDigits.slice(digitsBefore);
          const nextFormatted = formatUzbekPhoneInput(nextDigits);
          pendingCursorRef.current = getCursorPositionForDigitCount(
            nextFormatted,
            digitsBefore - 1,
            minCursor
          );
          onChange?.(nextFormatted);
        }
        return;
      }
    }

    if (event.key === 'ArrowLeft' && selectionStart <= minCursor && selectionEnd <= minCursor) {
      event.preventDefault();
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      target.setSelectionRange(minCursor, minCursor);
      return;
    }

    onKeyDown?.(event);
  };

  const handleChange = (event) => {
    const raw = event.target.value;
    const cursor = event.target.selectionStart ?? raw.length;
    const nextFormatted = formatUzbekPhoneInput(raw);

    let nextCursor;
    if (cursor <= minCursor) {
      nextCursor = nextFormatted.length;
    } else {
      const prefixSegment = raw.slice(0, cursor);
      const localDigitsBefore = extractUzbekPhoneLocalDigits(prefixSegment).length;
      nextCursor = getCursorPositionForDigitCount(
        nextFormatted,
        localDigitsBefore,
        minCursor
      );
    }

    if (nextFormatted === displayValue) {
      window.requestAnimationFrame(() => {
        if (inputRef.current) {
          const clamped = Math.max(minCursor, Math.min(nextFormatted.length, nextCursor));
          inputRef.current.setSelectionRange(clamped, clamped);
        }
      });
      return;
    }

    pendingCursorRef.current = nextCursor;
    onChange?.(nextFormatted);
  };

  return (
    <input
      ref={inputRef}
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      placeholder={placeholder}
      value={displayValue}
      onFocus={handleFocus}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      className={`${BASE_INPUT_CLASSES} ${className}`.trim()}
      {...props}
    />
  );
}

/**
 * Reusable DD.MM.YYYY date input with automatic '.' insertion, auto-advance from
 * DD -> MM -> YYYY, invalid day/month protection, and YYYY-MM-DD API output.
 */
export function DateInput({
  value = '',
  onChange,
  onBlur,
  onKeyDown,
  onValidityChange,
  required = false,
  allowFuture = false,
  minYear = 1900,
  maxYear = new Date().getFullYear(),
  invalidMessage = 'DD.MM.YYYY',
  className = '',
  placeholder = 'DD.MM.YYYY',
  ...props
}) {
  const inputRef = useRef(null);
  const pendingCursorRef = useRef(null);
  const lastEmittedIsoRef = useRef(value || '');
  const [displayValue, setDisplayValue] = useState(() => isoToDisplayDate(value));
  const [touched, setTouched] = useState(false);

  const dateOptions = { minYear, maxYear, allowFuture };
  const parsedIso = parseDisplayDateToIso(displayValue, dateOptions);
  const hasIncompleteOrInvalid = Boolean(displayValue) && parsedIso === null;

  useEffect(() => {
    const normalizedProp = value || '';
    if (normalizedProp !== lastEmittedIsoRef.current) {
      lastEmittedIsoRef.current = normalizedProp;
      setDisplayValue(isoToDisplayDate(normalizedProp));
      setTouched(false);
    }
  }, [value]);

  useEffect(() => {
    const isValid = !hasIncompleteOrInvalid && (!required || Boolean(parsedIso));
    if (inputRef.current) {
      if (hasIncompleteOrInvalid) {
        inputRef.current.setCustomValidity(invalidMessage);
      } else if (required && !parsedIso) {
        inputRef.current.setCustomValidity(invalidMessage);
      } else {
        inputRef.current.setCustomValidity('');
      }
    }
    onValidityChange?.(isValid);
  }, [hasIncompleteOrInvalid, parsedIso, required, invalidMessage, onValidityChange]);

  useLayoutEffect(() => {
    if (pendingCursorRef.current !== null && inputRef.current) {
      const pos = Math.max(0, Math.min(displayValue.length, pendingCursorRef.current));
      inputRef.current.setSelectionRange(pos, pos);
      pendingCursorRef.current = null;
    }
  });

  const handleKeyDown = (event) => {
    const target = event.currentTarget;
    const { selectionStart, selectionEnd } = target;

    if (
      event.key === 'Backspace' &&
      selectionStart === selectionEnd &&
      selectionStart > 0 &&
      displayValue[selectionStart - 1] === '.' &&
      selectionStart < displayValue.length
    ) {
      event.preventDefault();
      target.setSelectionRange(selectionStart - 1, selectionStart - 1);
      return;
    }

    onKeyDown?.(event);
  };

  const handleChange = (event) => {
    const raw = event.target.value;
    const cursor = event.target.selectionStart ?? raw.length;
    const nextDisplay = formatDateInput(raw, displayValue);

    if (nextDisplay === displayValue && raw !== displayValue) {
      const fallbackPos = Math.max(0, Math.min(displayValue.length, cursor - 1));
      window.requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(fallbackPos, fallbackPos);
        }
      });
      return;
    }

    const isAppendingAtEnd = cursor >= raw.length && nextDisplay.length >= displayValue.length;
    if (isAppendingAtEnd) {
      pendingCursorRef.current = nextDisplay.length;
    } else {
      const digitsBefore = raw.slice(0, cursor).replace(/\D/g, '').length;
      pendingCursorRef.current = getCursorPositionForDigitCount(nextDisplay, digitsBefore, 0);
    }

    setDisplayValue(nextDisplay);
    const nextIso = parseDisplayDateToIso(nextDisplay, dateOptions) || '';
    if (nextIso !== lastEmittedIsoRef.current) {
      lastEmittedIsoRef.current = nextIso;
      onChange?.(nextIso);
    }
  };

  const handleBlur = (event) => {
    setTouched(true);
    onBlur?.(event);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        maxLength={10}
        placeholder={placeholder}
        value={displayValue}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-invalid={touched && hasIncompleteOrInvalid ? 'true' : undefined}
        className={`${BASE_INPUT_CLASSES} ${
          touched && hasIncompleteOrInvalid
            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100 dark:border-rose-500'
            : ''
        } ${className}`.trim()}
        {...props}
      />
      {touched && hasIncompleteOrInvalid && (
        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{invalidMessage}</p>
      )}
    </div>
  );
}
