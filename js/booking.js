/* Bonanza Gym — booking, jQuery 3.7.1 (full build for effects).
   The uploaded booking.js already used jQuery; it is preserved in old-js/booking.js.
   This version repairs validation and completes the visit flow without claiming
   an additional native-to-jQuery rewrite. Scheduling rules remain plain JS. */
$(function () {
  'use strict';
  const B = window.Bonanza;
  const $form = $('#booking-form');
  if (!$form.length) return;
  const $status = $('#booking-form-status');
  const $date = $('#visit-date');
  const $time = $('#visit-time');
  const $tariff = $('#membership-type');
  const $trainer = $('#trainer-select');
  const $trainerBox = $trainer.closest('.trainer-select-container');
  const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180;
  let resettingAfterSuccess = false;
  let previousFormat = '';

  function localDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function parseDate(value) { return new Date(`${value}T00:00:00`); }
  function dayNumber(value) { return (parseDate(value).getDay() + 6) % 7; }
  function maxDate() {
    const last = parseDate(B.today());
    last.setDate(last.getDate() + 90);
    return localDate(last);
  }
  function minutes(value) {
    if (!/^\d{2}:\d{2}$/.test(value)) return NaN;
    const [hours, mins] = value.split(':').map(Number);
    return hours < 24 && mins < 60 ? hours * 60 + mins : NaN;
  }
  function nextClassDate(lesson) {
    const next = parseDate(B.today());
    const delta = (lesson.day - ((next.getDay() + 6) % 7) + 7) % 7;
    next.setDate(next.getDate() + delta);
    if (new Date(`${localDate(next)}T${lesson.time}:00`) <= new Date()) next.setDate(next.getDate() + 7);
    return localDate(next);
  }
  function format() { return $form.find('input[name="visit_format"]:checked').val(); }
  function selectedLesson() { return B.classes.find((item) => item.id === $class.val()); }
  function selectedTariff() { return B.tariffs.find((item) => item.id === $tariff.val()); }
  function safeParticipants() {
    const count = Number($participants.val());
    return Number.isInteger(count) && count > 0 && count <= Number($participants.attr('max')) ? count : 0;
  }

  // Remove the contradictory 50%-off promise through DOM, preserving its banner.
  $('#booking-promo-alert').empty().append(
    $('<strong>').text('Планируйте тренировку заранее. '),
    $('<span>').text('Выберите тариф или занятие из расписания. Здесь можно проверить выбор и получить демонстрационный номер заявки.')
  );
  $('#booking-info-section .page-intro').text('Выберите самостоятельный визит, персональную тренировку или групповое занятие. Форма проверяет стоимость, дату, время и доступность в учебном расписании. Для реальной записи свяжитесь с клубом.');
  $('#trainers-section > p').text('Выберите наставника. График и свободные места ниже — демонстрационные данные, а не онлайн-доступность клуба.');
  $('#booking-form-section > h2').text('Запланируйте свой визит');
  $('#booking-form-section > p').text('Заполните данные и проверьте итог. Информация не отправляется на сервер, реальная запись и оплата не создаются.');
  $('#booking-submit-btn').text('Проверить и оформить демо-заявку');
  $('label[for="agreement"]').text('Я понимаю, что это демонстрационная заявка без реального бронирования');
  $form.attr('novalidate', 'novalidate'); // Keep required/min/max/type; show all errors beside fields.
  $('#fullname').attr({ autocomplete: 'name', minlength: 2, maxlength: 80 });
  $('#email').attr({ autocomplete: 'email', maxlength: 120 });
  $('#phone').attr({ autocomplete: 'tel', inputmode: 'tel', maxlength: 24 });
  $('#age').attr({ min: 16, max: 90, step: 1 });
  $('#comments').attr({ maxlength: 500, placeholder: 'Например: хочу познакомиться с залом. Не указывайте медицинские или другие чувствительные сведения.' });
  $date.attr({ min: B.today(), max: maxDate() });
  $time.attr({ min: '07:00', max: '22:00', step: 1800 });
  const $dateHelp = $('<p>').attr('id', 'booking-date-help').addClass('small text-muted mt-1 mb-0').text('Сегодня или в течение 90 дней. Для группы день недели должен совпадать с расписанием.').appendTo($date.parent());
  $date.attr('aria-describedby', $dateHelp.attr('id'));
  const $timeHelp = $('<p>').attr('id', 'booking-time-help').addClass('small text-muted mt-1 mb-0').appendTo($time.parent());
  $time.attr('aria-describedby', $timeHelp.attr('id'));

  const $groupRadioBox = $('<div>').addClass('form-check form-check-inline mt-2');
  const $groupRadio = $('<input>').attr({ id: 'visit-group', type: 'radio', name: 'visit_format', value: 'group' }).addClass('form-check-input').appendTo($groupRadioBox);
  $('<label>').attr('for', 'visit-group').addClass('form-check-label fw-medium').text('Групповое занятие').appendTo($groupRadioBox);
  $('#visit-solo').closest('.form-check').after($groupRadioBox);

  const $classBox = $('<div>').addClass('col-12 col-md-6 is-hidden');
  $('<label>').attr('for', 'booking-class').addClass('form-label fw-bold').text('Занятие из расписания:').appendTo($classBox);
  const $class = $('<select>').attr({ id: 'booking-class', name: 'class_id' }).addClass('form-select').appendTo($classBox);
  $('<option>').val('').text('Выберите занятие').appendTo($class);
  B.classes.slice().sort((a, b) => a.day - b.day || a.time.localeCompare(b.time)).forEach((lesson) => {
    $('<option>').val(lesson.id).text(`${weekdays[(lesson.day + 1) % 7]}, ${lesson.time} · ${lesson.name} · ${lesson.spots > 0 ? `${lesson.spots} мест` : 'мест нет'}`).prop('disabled', lesson.spots <= 0).appendTo($class);
  });
  $trainerBox.before($classBox);

  const $participantsBox = $('<div>').addClass('col-12 col-md-6');
  $('<label>').attr('for', 'booking-participants').addClass('form-label fw-bold').text('Количество участников:').appendTo($participantsBox);
  const $participants = $('<input>').attr({ type: 'number', id: 'booking-participants', name: 'participants', min: 1, max: 6, step: 1, required: true }).val('1').addClass('form-control').appendTo($participantsBox);
  const $participantHelp = $('<p>').attr('id', 'booking-participants-help').addClass('small text-muted mt-1 mb-0').appendTo($participantsBox);
  $participants.attr('aria-describedby', 'booking-participants-help');
  $tariff.parent().after($participantsBox);

  const $studentBox = $('<div>').addClass('col-12 is-hidden');
  const $studentCheck = $('<div>').addClass('form-check').appendTo($studentBox);
  const $student = $('<input>').attr({ id: 'booking-student', name: 'student_status', type: 'checkbox' }).addClass('form-check-input').appendTo($studentCheck);
  $('<label>').attr('for', 'booking-student').addClass('form-check-label').text('У всех участников есть действующий студенческий билет (возраст от 16 лет)').appendTo($studentCheck);
  $participantsBox.after($studentBox);

  const $summary = $('<section>').attr({ id: 'booking-summary', 'aria-label': 'Предварительный расчёт', 'aria-live': 'polite', 'aria-atomic': 'true' }).addClass('result-panel p-3 rounded mt-4');
  $form.find('fieldset').after($summary);
  const $commentCount = $('<p>').attr('id', 'booking-comment-count').addClass('small text-muted mt-1 mb-0').appendTo($('#comments').parent());
  $('#comments').attr('aria-describedby', 'booking-comment-count');

  $trainer.empty().append($('<option>').val('any').text('Любой подходящий по графику тренер'));
  B.trainers.forEach((trainer) => {
    $('<option>').val(trainer.id).text(`${trainer.name} · ${trainer.days.map((day) => weekdays[day]).join(', ')} ${trainer.start}–${trainer.end}`).prop('disabled', trainer.slots <= 0).appendTo($trainer);
  });

  function reveal($target, visible, animate) {
    const wasHidden = $target.hasClass('is-hidden');
    if (visible) {
      $target.removeClass('is-hidden');
      // Purposeful slideDown reveals controls needed for the selected format.
      if (wasHidden && animate) $target.stop(true, true).hide().slideDown(motion);
    } else {
      $target.stop(true, true).addClass('is-hidden');
    }
  }

  function rebuildTariffs() {
    const current = $tariff.val();
    const kind = format();
    $tariff.empty();
    if (kind === 'group') {
      $('<option>').val('group-class').text('Групповое занятие — 2 500 ₸ / участник').appendTo($tariff);
      $tariff.prop('disabled', true);
    } else {
      $tariff.prop('disabled', false);
      $('<option>').val('').text('Выберите тариф').appendTo($tariff);
      const options = B.tariffs.filter((item) => kind === 'trainer' ? item.id === 'personal' : item.id !== 'personal');
      options.forEach((item) => $('<option>').val(item.id).text(`${item.name} — ${B.money(item.price)} / ${item.period}`).appendTo($tariff));
      if (options.some((item) => item.id === current)) $tariff.val(current);
      else if (kind === 'trainer') $tariff.val('personal');
    }
  }

  function trainerAvailable(trainer, date, time) {
    const start = minutes(time);
    if (!B.validDate(date) || !Number.isFinite(start) || trainer.slots <= 0) return false;
    if (!trainer.days.includes(parseDate(date).getDay()) || start < minutes(trainer.start) || start + 60 > minutes(trainer.end)) return false;
    // A coach teaching a group cannot conduct a personal session at the same time.
    return !B.classes.some((lesson) => lesson.trainerId === trainer.id && lesson.day === dayNumber(date)
      && start < minutes(lesson.time) + lesson.duration && start + 60 > minutes(lesson.time));
  }

  function resolvedTrainer() {
    const candidates = $trainer.val() === 'any' ? B.trainers : B.trainers.filter((item) => item.id === $trainer.val());
    return candidates.find((item) => trainerAvailable(item, $date.val(), $time.val()));
  }

  function synchronize(animate = true) {
    const kind = format();
    if (kind !== previousFormat) {
      previousFormat = kind;
      rebuildTariffs();
      if (kind !== 'group') $time.prop('readonly', false);
      B.resetErrors($form);
    }
    const lesson = selectedLesson();
    const isGroup = kind === 'group';
    const isTrainer = kind === 'trainer';
    reveal($trainerBox, isTrainer, animate);
    reveal($classBox, isGroup, animate);
    $trainer.prop({ disabled: !isTrainer, required: isTrainer });
    $class.prop({ disabled: !isGroup, required: isGroup });
    const isStudent = !isGroup && $tariff.val() === 'student';
    reveal($studentBox, isStudent, animate);
    $student.prop({ disabled: !isStudent, required: isStudent });
    if (!isStudent) {
      $student.prop('checked', false);
      B.clearError($student);
    }
    const limit = isTrainer ? 1 : (isGroup ? (lesson ? Math.max(lesson.spots, 1) : 1) : 6);
    $participants.attr('max', limit).prop('readonly', isTrainer);
    if (isTrainer) $participants.val('1');
    $participantHelp.text(isTrainer ? 'Персональная тренировка рассчитана на одного человека.' : (isGroup ? `Доступно ${lesson ? lesson.spots : 0} мест по учебному расписанию.` : 'От 1 до 6 человек. Каждый участник оплачивает выбранный тариф.'));
    const tariff = selectedTariff();
    const close = tariff && B.validDate($date.val()) && parseDate($date.val()).getDay() === 0 && tariff.sundayEnd ? tariff.sundayEnd : (tariff ? tariff.end : B.openingHours.end);
    const minTime = tariff && tariff.start ? tariff.start : B.openingHours.start;
    const lastStart = minutes(close || B.openingHours.end) - 60;
    const maxTime = `${String(Math.floor(lastStart / 60)).padStart(2, '0')}:${String(lastStart % 60).padStart(2, '0')}`;
    $time.prop('readonly', isGroup).attr({ min: minTime, max: maxTime });
    if (isGroup && lesson) {
      $time.val(lesson.time);
      $timeHelp.text(`Начало по расписанию: ${lesson.time}. Продолжительность: ${lesson.duration} минут.`);
    } else if (isTrainer) {
      const trainer = B.trainers.find((item) => item.id === $trainer.val());
      $timeHelp.text(trainer ? `60 минут. График: ${trainer.days.map((day) => weekdays[day]).join(', ')}, ${trainer.start}–${trainer.end}; без пересечения с групповыми занятиями.` : '60 минут. Подберём тренера по дате и времени; начало с шагом 30 минут.');
    } else {
      $timeHelp.text(`Начало с ${minTime} до ${maxTime}, шаг 30 минут. Для расчёта времени визит длится 60 минут.`);
    }
    renderSummary();
  }

  function summaryLines() {
    const kind = format();
    const lesson = selectedLesson();
    const tariff = selectedTariff();
    const participants = safeParticipants();
    const date = B.validDate($date.val()) ? B.dateLabel($date.val()) : 'дата не выбрана';
    const time = $time.val() || 'время не выбрано';
    const item = kind === 'group' ? lesson : tariff;
    const lines = [kind === 'group' ? `Группа: ${lesson ? lesson.name : 'выберите занятие'}` : `Тариф: ${tariff ? `${tariff.name} · ${tariff.period}` : 'выберите тариф'}`, `Визит: ${date}, ${time}`, `Участников: ${participants || 'укажите допустимое количество'}`];
    if (kind === 'trainer') {
      const trainer = resolvedTrainer();
      lines.push(`Тренер: ${trainer ? trainer.name : 'нужны подходящие дата и время'}`);
      lines.push('Стоимость пакета за 12 занятий; в форме выбирается дата первого занятия.');
    }
    if (kind === 'group' && lesson) lines.push(`Тренер: ${lesson.trainer}. ${lesson.room}. Длительность: ${lesson.duration} минут.`);
    const total = item && participants ? item.price * participants : 0;
    return { lines, total, item, participants, kind };
  }

  function renderSummary() {
    const data = summaryLines();
    $summary.empty().append($('<h3>').addClass('h6 fw-bold').text('Ваш выбор'));
    const $list = $('<ul>').addClass('small ps-3 mb-2').appendTo($summary);
    data.lines.forEach((line) => $('<li>').text(line).appendTo($list));
    $('<p>').attr('id', 'booking-total').addClass('fw-bold mb-1').text(data.item && data.participants ? `Итого: ${B.money(data.total)}` : 'Итого: выберите тариф и количество участников').appendTo($summary);
    $('<p>').addClass('small text-muted mb-0').text('Предварительный расчёт. Места не резервируются, деньги не списываются.').appendTo($summary);
    $commentCount.text(`${$('#comments').val().length} / 500 символов`);
  }

  function collectErrors() {
    const errors = [];
    const add = ($field, condition, message) => { if (!condition) errors.push({ $field, message }); };
    const kind = format();
    const lesson = selectedLesson();
    const tariff = selectedTariff();
    const age = Number($('#age').val());
    const count = Number($participants.val());
    const date = $date.val();
    const time = $time.val();
    const start = minutes(time);
    const dateOkay = B.validDate(date) && date >= B.today() && date <= maxDate();
    const validFormat = ['solo', 'trainer', 'group'].includes(kind);
    add($('#fullname'), B.validName($('#fullname').val().trim()), 'Введите имя: от 2 до 80 символов, с буквами.');
    add($('#email'), B.validEmail($('#email').val().trim()), 'Введите e-mail в формате name@example.com.');
    add($('#phone'), B.validPhone($('#phone').val().trim()), 'Введите номер Казахстана: +7 (7XX) XXX-XX-XX или 8 (7XX) XXX-XX-XX.');
    add($('#age'), Number.isInteger(age) && age >= 16 && age <= 90, 'Возраст должен быть целым числом от 16 до 90.');
    add($date, dateOkay, 'Выберите дату от сегодняшнего дня до 90 дней вперёд.');
    add($('#visit-solo'), validFormat, 'Выберите формат посещения.');
    const baseTimeOkay = Number.isFinite(start) && start >= 7 * 60 && start + 60 <= 23 * 60 && start % 30 === 0;
    add($time, baseTimeOkay, 'Выберите начало с 07:00 до 22:00 с шагом 30 минут. Визит длится 60 минут.');
    if (baseTimeOkay && dateOkay) add($time, new Date(`${date}T${time}:00`) > new Date(), 'Это время уже прошло. Выберите более позднее время или другую дату.');
    if (kind === 'group') {
      add($class, Boolean(lesson && lesson.spots > 0), 'Выберите групповое занятие со свободными местами.');
      if (lesson && dateOkay) add($date, dayNumber(date) === lesson.day, `Это занятие проводится в ${weekdays[(lesson.day + 1) % 7]}. Выберите подходящую дату.`);
      if (lesson) add($time, time === lesson.time, `Занятие начинается в ${lesson.time}.`);
    } else {
      add($tariff, Boolean(tariff && (kind === 'trainer' ? tariff.id === 'personal' : tariff.id !== 'personal')), 'Выберите тариф, соответствующий формату тренировки.');
      if (tariff && baseTimeOkay) {
        const windowStart = tariff.start || B.openingHours.start;
        const windowEnd = dateOkay && parseDate(date).getDay() === 0 && tariff.sundayEnd ? tariff.sundayEnd : (tariff.end || B.openingHours.end);
        add($time, start >= minutes(windowStart) && start + 60 <= minutes(windowEnd), `Этот тариф действует ${windowStart}–${windowEnd}. Визит длится 60 минут и должен полностью входить в этот интервал.`);
      }
      if (kind === 'trainer' && dateOkay && baseTimeOkay) add($trainer, Boolean(resolvedTrainer()), 'Тренер недоступен: проверьте рабочие дни, время или выберите другого. Групповые занятия тоже занимают его время.');
      if (tariff && tariff.id === 'student') add($student, $student.prop('checked'), 'Подтвердите наличие студенческого билета у всех участников.');
    }
    const limit = kind === 'trainer' ? 1 : (kind === 'group' ? (lesson ? lesson.spots : 0) : 6);
    add($participants, Number.isInteger(count) && count >= 1 && count <= limit, limit > 0 ? `Укажите целое число от 1 до ${limit}.` : 'Сначала выберите занятие со свободными местами.');
    add($('#comments'), $('#comments').val().trim().length <= 500, 'Сократите пожелания до 500 символов.');
    add($('#agreement'), $('#agreement').prop('checked'), 'Подтвердите, что понимаете демонстрационный характер заявки.');
    return errors;
  }

  function initializeDefaults() {
    $('#booking-prefill-note').remove();
    B.resetErrors($form);
    $('#visit-solo').prop('checked', true);
    $groupRadio.prop('checked', false);
    $tariff.val('');
    $trainer.val('any');
    $class.val('');
    $participants.val('1');
    $student.prop('checked', false);
    $time.val('').prop('readonly', false);
    $date.attr({ min: B.today(), max: maxDate() });
    previousFormat = '';
    synchronize(false);
  }

  // .on() is delegated: new class, participant and student controls are created above.
  // Binding to the form also works after a control is replaced; direct old-node listeners would not.
  $form.on('input change', 'input, select, textarea', function () {
    const $field = $(this);
    $('#booking-prefill-note').remove();
    B.clearError($field);
    $status.stop(true, true).addClass('is-hidden').empty();
    if ($field.is('#booking-class') && selectedLesson()) {
      $date.val(nextClassDate(selectedLesson()));
      $time.val(selectedLesson().time);
      $participants.val('1');
      B.clearError($participants);
    }
    if ($field.is('#membership-type') && $field.val() === 'personal') $('#visit-trainer').prop('checked', true);
    if ($field.is('#visit-date, #visit-time, #membership-type, #booking-class, #trainer-select')) {
      B.clearError($date);
      B.clearError($time);
      B.clearError($trainer);
    }
    synchronize();
  });

  $form.on('reset', function () {
    // Native reset restores field values after the event; defer dependent recalculation.
    window.setTimeout(() => {
      initializeDefaults();
      if (!resettingAfterSuccess) {
        $status.stop(true, true).removeClass('is-hidden alert-success').addClass('alert alert-info').text('Форма очищена. Выберите новые параметры визита.').show();
      }
      resettingAfterSuccess = false;
    }, 0);
  });

  $form.on('submit', function (event) {
    event.preventDefault(); // Without this, method=POST would reload the page and send the form.
    $status.stop(true, true).empty().addClass('is-hidden');
    B.resetErrors($form);
    $('#fullname, #email, #phone, #comments').each(function () { $(this).val($(this).val().trim()); });
    const errors = collectErrors();
    if (errors.length) {
      const reported = new Set();
      errors.forEach(({ $field, message }) => {
        if (!reported.has($field.attr('id'))) {
          B.setError($field, message);
          reported.add($field.attr('id'));
        }
      });
      errors[0].$field.trigger('focus');
      return;
    }
    const summary = summaryLines();
    const code = B.reference();
    $status.removeClass('is-hidden alert-info alert-danger').addClass('alert alert-success').attr({ tabindex: -1, role: 'status' });
    $('<h3>').addClass('h5 fw-bold mb-2').text(`Демо-заявка ${code}`).appendTo($status);
    $('<p>').addClass('mb-2').text(`${$('#fullname').val()}, проверка заполнения пройдена.`).appendTo($status);
    const $list = $('<ul>').addClass('ps-3 mb-2').appendTo($status);
    summary.lines.forEach((line) => $('<li>').text(line).appendTo($list));
    $('<li>').text(`Контакты для проверки: ${$('#email').val()} · ${$('#phone').val()}`).appendTo($list);
    if ($('#comments').val()) $('<li>').text(`Пожелания: ${$('#comments').val()}`).appendTo($list);
    $('<p>').addClass('fw-bold mb-2').text(`Расчёт: ${B.money(summary.total)}`).appendTo($status);
    $('<p>').addClass('small mb-0').text('Данные не отправлены на сервер. Реальное бронирование и оплата не созданы. Для записи позвоните +7 777 473 94 38.').appendTo($status);
    // Purposeful fadeIn + completion callback brings keyboard focus to the finished result.
    $status.hide().fadeIn(motion, function () { $(this).trigger('focus'); });
    resettingAfterSuccess = true;
    $form[0].reset();
  });

  // These two existing cards select the correct coach rather than only scrolling.
  $('#trainers-section .card-custom').each(function (index) {
    const trainer = B.trainers.find((item) => item.id === (index === 0 ? 'sokolovsky' : 'mosoyan'));
    if (!trainer) return;
    $(this).find('.badge').last().text(`Места в демо: ${trainer.slots}`);
    $(this).find('a[href="#booking-form-section"]').attr('data-trainer', trainer.id);
  });
  $('#trainers-section').on('click', 'a[data-trainer]', function () {
    const id = $(this).attr('data-trainer');
    $('#booking-prefill-note').remove();
    $('#visit-trainer').prop('checked', true);
    $trainer.val(id);
    B.clearError($trainer);
    B.clearError($time);
    $status.stop(true, true).addClass('is-hidden').empty();
    synchronize();
    $date.trigger('focus');
  });

  initializeDefaults();
  const query = new URLSearchParams(window.location.search);
  const requestedClass = query.get('class');
  const requestedService = query.get('service');
  const requestedTrainer = query.get('trainer');
  let selectionMessage = '';
  if (requestedClass) {
    const lesson = B.classes.find((item) => item.id === requestedClass && item.spots > 0);
    if (lesson) {
      $groupRadio.prop('checked', true);
      $class.val(lesson.id);
      const requestedDate = query.get('date');
      const dateUsable = B.validDate(requestedDate) && requestedDate >= B.today() && requestedDate <= maxDate() && dayNumber(requestedDate) === lesson.day && new Date(`${requestedDate}T${lesson.time}:00`) > new Date();
      $date.val(dateUsable ? requestedDate : nextClassDate(lesson));
      $time.val(lesson.time);
      selectionMessage = `Выбрано занятие «${lesson.name}». Проверьте дату и количество участников.`;
      if (requestedDate && !dateUsable) selectionMessage += ' Дата из ссылки недоступна: подставлено ближайшее будущее занятие.';
    } else selectionMessage = 'Занятие из ссылки недоступно. Выберите другой вариант в форме или расписании.';
  } else if (requestedService || requestedTrainer) {
    const tariff = B.tariffs.find((item) => item.id === requestedService);
    const trainer = B.trainers.find((item) => item.id === requestedTrainer && item.slots > 0);
    if ((tariff && tariff.id === 'personal') || trainer) $('#visit-trainer').prop('checked', true);
    synchronize(false);
    if (tariff && (!trainer || tariff.id === 'personal')) $tariff.val(tariff.id);
    if (trainer) $trainer.val(trainer.id);
    if ((requestedService && !tariff) || (requestedTrainer && !trainer)) selectionMessage = 'Часть параметров ссылки устарела. Проверьте выбранный тариф и тренера.';
    else selectionMessage = 'Выбор из предыдущей страницы перенесён. Укажите дату и время визита.';
  }
  synchronize(false);
  if (selectionMessage) $('<p>').attr({ id: 'booking-prefill-note', role: 'status' }).addClass('alert alert-info mb-3').text(selectionMessage).insertBefore($form);
});
