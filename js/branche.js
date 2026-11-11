/* Bonanza Gym — schedule, jQuery 3.7.1.
   Rewritten feature 2: compare js/old-js/branche.js (not linked to any page).
   .empty(), .append(), .val(), .prop(), .on() and traversal replace native DOM
   creation/listeners. Rendering is shorter; filtering and date maths stay plain JS. */
$(function () {
  'use strict';
  const B = window.Bonanza;
  const $section = $('#group-schedule');
  const $list = $('#schedule-list');
  if (!$section.length || !$list.length) return;
  const $status = $('#schedule-status');
  const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160;
  let pickedId = '';

  function localDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function nextDate(lesson) {
    const next = new Date(`${B.today()}T00:00:00`);
    const delta = (lesson.day - ((next.getDay() + 6) % 7) + 7) % 7;
    next.setDate(next.getDate() + delta);
    if (new Date(`${localDate(next)}T${lesson.time}:00`) <= new Date()) next.setDate(next.getDate() + 7);
    return localDate(next);
  }
  function addSelect(id, label, choices, $parent) {
    const $col = $('<div>').addClass('col-12 col-md-4').appendTo($parent);
    $('<label>').attr('for', id).addClass('form-label small fw-semibold').text(label).appendTo($col);
    const $select = $('<select>').attr('id', id).addClass('form-select').appendTo($col);
    choices.forEach(([value, text]) => $('<option>').val(value).text(text).appendTo($select));
    return $select;
  }

  $('<p>').addClass('small text-muted mb-3').text('Учебное недельное расписание: 60 минут, 2 500 ₸ за участника. Места — пример для проверки формы, а не актуальная загрузка клуба.').insertBefore($list);
  const $filters = $('<div>').addClass('border bg-light rounded-3 p-3 mb-3').insertBefore($list);
  const $row = $('<div>').addClass('row g-3 align-items-end').appendTo($filters);
  const $searchCol = $('<div>').addClass('col-12').appendTo($row);
  $('<label>').attr('for', 'schedule-search').addClass('form-label small fw-semibold').text('Поиск занятия, тренера или зала').appendTo($searchCol);
  const $search = $('<input>').attr({ id: 'schedule-search', type: 'search', placeholder: 'Например: йога или Андрей', maxlength: 80 }).addClass('form-control').appendTo($searchCol);
  const $day = addSelect('schedule-day', 'День недели', [['all', 'Все дни'], ...days.map((day, index) => [String(index), day])], $row);
  const $category = addSelect('schedule-category', 'Направление', [['all', 'Все направления'], ['mindbody', 'Йога и стретчинг'], ['power', 'Силовые и функциональные'], ['cardio', 'Кардио']], $row);
  const trainerNames = [...new Set(B.classes.map((lesson) => lesson.trainer))];
  const $trainer = addSelect('schedule-trainer', 'Тренер', [['all', 'Любой тренер'], ...trainerNames.map((name) => [name, name])], $row);
  const $controls = $('<div>').addClass('d-flex flex-wrap align-items-center justify-content-between gap-3 mt-3').appendTo($filters);
  const $availableWrap = $('<div>').addClass('form-check').appendTo($controls);
  const $available = $('<input>').attr({ type: 'checkbox', id: 'schedule-open' }).addClass('form-check-input').appendTo($availableWrap);
  $('<label>').attr('for', 'schedule-open').addClass('form-check-label small').text('Только со свободными местами').appendTo($availableWrap);
  const $reset = $('<button>').attr({ id: 'schedule-reset', type: 'button' }).addClass('btn btn-outline-dark btn-sm').text('Сбросить фильтры').appendTo($controls);
  const $counter = $('<p>').attr({ id: 'schedule-count', role: 'status', 'aria-live': 'polite' }).addClass('small text-muted mt-3 mb-0').appendTo($filters);
  const $chosen = $('<div>').attr({ id: 'schedule-selection', 'aria-live': 'polite' }).addClass('result-panel rounded p-3 mt-3 is-hidden').insertAfter($list);

  function filterClasses() {
    const query = $search.val().trim().toLocaleLowerCase('ru');
    return B.classes.filter((lesson) => {
      const searchable = `${lesson.name} ${lesson.trainer} ${lesson.room}`.toLocaleLowerCase('ru');
      return ($day.val() === 'all' || Number($day.val()) === lesson.day)
        && ($category.val() === 'all' || $category.val() === lesson.category)
        && ($trainer.val() === 'all' || $trainer.val() === lesson.trainer)
        && (!$available.prop('checked') || lesson.spots > 0)
        && (!query || searchable.includes(query));
    }).sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
  }

  function createClassCard(lesson) {
    const $col = $('<li>').addClass('col-12 col-md-6');
    const $card = $('<article>').attr('data-class', lesson.id).addClass('h-100 border rounded bg-light p-3 d-flex flex-column gap-2').appendTo($col);
    const $heading = $('<div>').addClass('d-flex flex-wrap justify-content-between align-items-start gap-2').appendTo($card);
    $('<h3>').addClass('h6 fw-bold mb-0').text(lesson.name).appendTo($heading);
    $('<span>').addClass(lesson.spots > 0 ? 'badge bg-success' : 'badge bg-secondary').text(lesson.spots > 0 ? `Мест в демо: ${lesson.spots}` : 'Мест нет').appendTo($heading);
    $('<p>').addClass('mb-0').text(`${days[lesson.day]}, ${lesson.time} · ${lesson.duration} мин`).appendTo($card);
    $('<p>').addClass('small text-muted mb-0').text(`${lesson.trainer} · ${lesson.room}`).appendTo($card);
    $('<p>').addClass('small fw-semibold mb-0').text(`${B.money(lesson.price)} / участник`).appendTo($card);
    $('<p>').addClass('small text-muted mb-1').text(`Ближайшее: ${B.dateLabel(nextDate(lesson))}`).appendTo($card);
    $('<button>').attr({ type: 'button', 'data-pick-class': lesson.id, 'aria-pressed': 'false', 'aria-controls': 'schedule-selection' }).prop('disabled', lesson.spots <= 0).addClass('btn btn-outline-dark mt-auto').text(lesson.spots > 0 ? 'Выбрать занятие' : 'Нет свободных мест').appendTo($card);
    return $col;
  }

  function render() {
    const filtered = filterClasses();
    pickedId = '';
    // Chaining: clear old items, remove the static indentation, apply the existing
    // Bootstrap responsive layout, then append cards generated from shared data.
    $list.empty().removeClass('ps-4').addClass('row list-unstyled g-3 my-3');
    if (filtered.length) filtered.forEach((lesson) => $list.append(createClassCard(lesson)));
    else {
      const $empty = $('<li>').addClass('col-12').appendTo($list);
      $('<p>').addClass('border rounded bg-light p-3 mb-0').text('Подходящих занятий нет. Измените поиск или сбросьте фильтры.').appendTo($empty);
    }
    $counter.text(`Найдено занятий: ${filtered.length} из ${B.classes.length}`);
    $chosen.stop(true, true).addClass('is-hidden').empty();
    $status.text('');
  }

  // Delegated handler: the cards are rebuilt by render(), so old per-card
  // listeners would disappear. closest() locates the clicked card reliably.
  $list.on('click', 'button[data-pick-class]', function () {
    const $button = $(this);
    const lesson = B.classes.find((item) => item.id === $button.attr('data-pick-class'));
    if (!lesson || lesson.spots <= 0) return;
    pickedId = lesson.id;
    $button.closest('li').siblings().find('article').removeClass('is-selected');
    $button.closest('article').addClass('is-selected');
    $list.find('button[data-pick-class]').attr('aria-pressed', 'false').text('Выбрать занятие');
    $list.find('button:disabled').text('Нет свободных мест');
    $button.attr('aria-pressed', 'true').text('Выбрано');
    $chosen.empty().removeClass('is-hidden');
    $('<h3>').addClass('h6 fw-bold').text('Выбранное занятие').appendTo($chosen);
    $('<p>').addClass('mb-2').text(`${lesson.name} · ${B.dateLabel(nextDate(lesson))}, ${lesson.time} · ${lesson.trainer}`).appendTo($chosen);
    $('<p>').addClass('small mb-2').text(`От ${B.money(lesson.price)} за 1 участника. Доступно ${lesson.spots} мест в демо. Количество можно изменить в форме.`).appendTo($chosen);
    $('<a>').attr({ id: 'schedule-booking-link', href: B.bookingHref({ class: pickedId, date: nextDate(lesson) }) }).addClass('btn btn-primary').text('Перейти к записи').appendTo($chosen);
    $('<p>').addClass('small text-muted mt-2 mb-0').text('Дата, время и занятие перейдут в форму. Этот выбор пока ничего не бронирует.').appendTo($chosen);
    // Purposeful reveal of the selected class and its next action.
    $chosen.stop(true, true).hide().fadeIn(motion);
    $status.text(`Выбрано: ${lesson.name}. Продолжите в форме записи.`);
  });

  $search.on('input', render);
  $day.add($category).add($trainer).add($available).on('change', render);
  $reset.on('click', function () {
    $search.val('');
    $day.add($category).add($trainer).val('all');
    $available.prop('checked', false);
    render();
    $status.text('Фильтры сброшены. Показано полное расписание.');
  });

  const $map = $('#club-map');
  const imageSource = $map.find('img').attr('src');
  if (imageSource) {
    $('<a>').attr({ href: imageSource, target: '_blank', rel: 'noopener' }).addClass('btn btn-outline-dark btn-sm mt-2').text('Открыть карту крупнее ↗').appendTo($map.find('figcaption'));
  }
  render();
});
