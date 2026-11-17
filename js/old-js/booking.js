/* 
  jQuery Version: 3.7.1
  Page: Online Booking (booking.html)
*/

$(function () {
  'use strict';

  const TRAINERS = Object.freeze([
    { id: 'sokolovsky', name: 'Соколовский Андрей', spec: 'Силовой тренинг', schedule: 'Пн, Ср, Пт (09:00–21:00)', slots: 2 },
    { id: 'mosoyan', name: 'Мосоян Злата', spec: 'Похудение и нутрициология', schedule: 'Вт, Чт, Сб (10:00–20:00)', slots: 4 },
    { id: 'ahmetov', name: 'Кайрат Ахметов', spec: 'Тяжелая атлетика', schedule: 'Пн, Вт, Чт (10:00–22:00)', slots: 1 },
    { id: 'ospanova', name: 'Диана Оспанова', spec: 'Стретчинг и фитнес', schedule: 'Ср, Пт, Сб (08:00–16:00)', slots: 5 },
    { id: 'aliev', name: 'Руслан Алиев', spec: 'Кроссфит и реабилитация', schedule: 'Ежедневно (12:00–20:00)', slots: 3 },
    { id: 'zhumagali', name: 'Арман Жумагалиев', spec: 'Бокс и кардио', schedule: 'Пн, Ср, Пт (15:00–22:00)', slots: 2 }
  ]);

  function isValidPhone(phone) {
    return /^\+?[0-9\s\-\(\)]{10,18}$/.test(phone.trim());
  }

  function isFutureDate(dateStr) {
    if (!dateStr) return false;
    const selected = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selected >= today;
  }

  const $form = $('#booking-form');
  const $status = $('#booking-form-status');
  const $trainerSelect = $('#trainer-select');
  const $radioSolo = $('#visit-solo');
  const $radioTrainer = $('#visit-trainer');
  const $trainerContainer = $('.trainer-select-container');

  if ($trainerSelect.length) {
    $trainerSelect.empty();
    $('<option>').val('any').text('-- Любой свободный тренер --').appendTo($trainerSelect);
    $.each(TRAINERS, function (_, t) {
      $('<option>').val(t.id).text(`${t.name} (${t.schedule}) — свободных мест: ${t.slots}`).appendTo($trainerSelect);
    });
  }

  function toggleTrainerVisibility() {
    if ($radioSolo.is(':checked')) {
      $trainerContainer.slideUp(200); // Effect: .slideUp()
    } else {
      $trainerContainer.slideDown(200); // Effect: .slideDown()
    }
  }

  $radioSolo.add($radioTrainer).on('change', toggleTrainerVisibility);

  // BOOKING FORM VALIDATION
  $form.on('submit', function (e) {
    e.preventDefault();

    $form.find('.field-error-msg').remove();
    $form.find('.is-invalid').removeClass('is-invalid');

    const $fullname = $('#fullname');
    const $email = $('#email');
    const $phone = $('#phone');
    const $date = $('#visit-date');
    const $time = $('#visit-time');
    const $agree = $('#agreement');

    let isValid = true;
    let $firstErr = null;

    if ($.trim($fullname.val()).length < 3) {
      isValid = false;
      $fullname.addClass('is-invalid');
      $('<div>').addClass('field-error-msg text-danger small mt-1').text('Укажите ФИО (не менее 3 символов)').appendTo($fullname.parent()).hide().slideDown(150);
      if (!$firstErr) $firstErr = $fullname;
    }

    if (!$.trim($email.val()).includes('@')) {
      isValid = false;
      $email.addClass('is-invalid');
      $('<div>').addClass('field-error-msg text-danger small mt-1').text('Введите e-mail').appendTo($email.parent()).hide().slideDown(150);
      if (!$firstErr) $firstErr = $email;
    }

    if (!isValidPhone($phone.val())) {
      isValid = false;
      $phone.addClass('is-invalid');
      $('<div>').addClass('field-error-msg text-danger small mt-1').text('Формат: +7 (777) 000-00-00').appendTo($phone.parent()).hide().slideDown(150);
      if (!$firstErr) $firstErr = $phone;
    }

    if (!isFutureDate($date.val())) {
      isValid = false;
      $date.addClass('is-invalid');
      $('<div>').addClass('field-error-msg text-danger small mt-1').text('Выберите сегодняшнюю или будущую дату').appendTo($date.parent()).hide().slideDown(150);
      if (!$firstErr) $firstErr = $date;
    }

    if (!$time.val()) {
      isValid = false;
      $time.addClass('is-invalid');
      $('<div>').addClass('field-error-msg text-danger small mt-1').text('Укажите время').appendTo($time.parent()).hide().slideDown(150);
      if (!$firstErr) $firstErr = $time;
    }

    // .prop() check for checkbox
    if (!$agree.prop('checked')) {
      isValid = false;
      $agree.addClass('is-invalid');
      $('<div>').addClass('field-error-msg text-danger small mt-1').text('Подтвердите согласие').appendTo($agree.parent()).hide().slideDown(150);
      if (!$firstErr) $firstErr = $agree;
    }

    if (!isValid) {
      if ($firstErr) $firstErr.focus();
      return;
    }

    const code = 'DEMO-' + Math.floor(100000 + Math.random() * 900000);
    $status.empty().attr('class', 'status-message alert alert-success mt-4 p-4 rounded-3 shadow-sm').hide();

    $('<h4>').addClass('alert-heading h5 fw-bold mb-2').text(`✅ Заявка ${code} забронирована!`).appendTo($status);
    $('<p>').addClass('mb-2').text(`Уважаемый(ая) ${$.trim($fullname.val())}, ваш визит зарегистрирован.`).appendTo($status);
    $('<p>').addClass('small text-muted mb-0 border-top pt-2 mt-2').text('ℹ️ Демонстрационная запись. Оплата не взимается.').appendTo($status);

    $status.slideDown(300);
    $form[0].reset();
    toggleTrainerVisibility();
    const btn = document.createElement('button');
btn.type = 'button'
btn.className = 'btn btn-dark btn-sm fw-bold w-100 py-2 btn-add-to-cart'
card.appendChild(btn);
  });
});
