/* Shared phone defaults for the booking and nutrition forms. */
$(function () {
  'use strict';

  function normalize(value) {
    const clean = String(value || '').trim();
    if (!clean || clean === '+') return '+7';
    // Keep incomplete or invalid input intact so validation can explain it.
    if (!/^\+?[\d\s()\-]+$/.test(clean)) return clean;
    let digits = clean.replace(/\D/g, '');
    if (digits.length === 11 && /^[78]/.test(digits)
        && (!clean.startsWith('+') || clean.startsWith('+7'))) {
      digits = digits.slice(1);
    } else if (digits.length !== 10 || clean.startsWith('+')) {
      return clean;
    }
    return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`;
  }

  $('[data-kz-phone]').each(function () {
    const field = this;
    const $field = $(field);
    field.defaultValue = '+7';
    $field.val(normalize($field.val()));

    $field.on('focus', function () {
      if (!$field.val().trim()) $field.val('+7');
      if ($field.val() === '+7') field.setSelectionRange(2, 2);
    });
    $field.on('input', function () {
      if (!$field.val().trim() || $field.val().trim() === '+') $field.val('+7');
    });
    $field.on('beforeinput', function (event) {
      const input = event.originalEvent || event;
      if (!String(input.inputType || '').startsWith('delete') || !field.value.startsWith('+7')) return;
      const start = field.selectionStart;
      const end = field.selectionEnd;
      const backward = input.inputType.includes('Backward');
      if (start === end && (start < 2 || (backward && start === 2))) {
        event.preventDefault();
        field.setSelectionRange(2, 2);
      } else if (start < 2 && end > start) {
        // Clearing a selection may remove the number, but keeps the country code.
        event.preventDefault();
        $field.val('+7' + field.value.slice(Math.max(end, 2))).trigger('input');
        field.setSelectionRange(2, 2);
      }
    });
    $field.on('blur change', function () {
      $field.val(normalize($field.val()));
    });
    $field.on('paste', function (event) {
      const clipboard = (event.originalEvent || event).clipboardData;
      if (!clipboard) return;
      const pasted = clipboard.getData('text').trim();
      const normalized = normalize(pasted);
      event.preventDefault();
      // A whole phone number replaces the default +7 instead of duplicating it.
      if (/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/.test(normalized)) {
        $field.val(normalized).trigger('input');
        field.setSelectionRange(normalized.length, normalized.length);
      } else {
        // Insert the whole paste, including invalid digits. Native maxlength
        // truncation could otherwise turn an oversized number into a valid one.
        const start = field.selectionStart;
        const end = field.selectionEnd;
        $field.val(field.value.slice(0, start) + pasted + field.value.slice(end)).trigger('input');
        field.setSelectionRange(start + pasted.length, start + pasted.length);
      }
    });

    $(field.form).on('submit', function () {
      $field.val(normalize($field.val()));
    }).on('reset', function () {
      window.setTimeout(function () { $field.val('+7'); }, 0);
    });
  });
});
