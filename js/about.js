'use strict';

/* jQuery 3.7.1. Original plain-JS version: js/old-js/about.js (not loaded).
 * Rewrite 3 — FAQ filtering/rendering uses .val(), .empty(), .append(), .on()
 * instead of native selectors, createElement and addEventListener. Delegated
 * accordion clicks work after filtering; the short traversal is clearer here.
 * Rewrite 4 — form validation uses jQuery selectors/traversal and shared error
 * helpers. Validation rules remain ordinary JS; jQuery alone is not validation.
 */
$(function () {
  const B = window.Bonanza;
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180;
  const create = (tag, classes = '', text = '') => $('<' + tag + '>').addClass(classes).text(text);
  const FAQS = Object.freeze([
    { id: 'first-visit', question: 'Что взять с собой на первую тренировку?', answer: 'Возьмите удостоверение личности, спортивную форму, сменную обувь, полотенце и воду. Перед самостоятельной тренировкой ознакомьтесь с правилами клуба.', category: 'rules', link: 'branche.html#club-rules', linkText: 'Правила посещения' },
    { id: 'hours', question: 'В какое время работает клуб?', answer: 'Часы работы: ежедневно с 07:00 до 23:00. У дневного и вечернего тарифов есть отдельные ограничения по времени — они указаны в прайс-листе.', category: 'rules', link: 'services.html#price-list', linkText: 'Посмотреть условия тарифов' },
    { id: 'freeze', question: 'Можно ли заморозить абонемент?', answer: 'В квартальном тарифе предусмотрено 14 дней заморозки, в полугодовом — 30 дней. Детали оформления уточняйте у администратора клуба.', category: 'membership', link: 'services.html#price-list', linkText: 'Сравнить абонементы' },
    { id: 'age', question: 'С какого возраста доступна запись на сайте?', answer: 'Эта форма рассчитана на посетителей от 16 лет. Для занятий с детьми младше 16 лет сначала уточните условия у администратора по контактному телефону.', category: 'rules', link: 'index.html#contacts', linkText: 'Контакты клуба' },
    { id: 'facilities', question: 'Есть ли в клубе душевые и шкафчики?', answer: 'В клубе есть раздевалки со шкафчиками, душевые и финские сауны. Информацию о зонах клуба можно посмотреть на странице расписания.', category: 'services', link: 'branche.html#club-zones', linkText: 'Зоны клуба' },
    { id: 'trainer', question: 'Как выбрать персонального тренера?', answer: 'Выберите формат «С тренером» в форме записи. Доступность зависит от дня, времени и расписания выбранного тренера. Стоимость пакета с тренером указана на странице услуг.', category: 'services', link: 'booking.html#trainers-section', linkText: 'Выбрать тренера' },
    { id: 'group', question: 'Где посмотреть групповые занятия?', answer: 'На странице клуба отфильтруйте расписание по дню и направлению. Кнопка занятия перенесёт его в форму записи; полностью заполненные группы недоступны для выбора.', category: 'services', link: 'branche.html#group-schedule', linkText: 'Расписание групп' },
    { id: 'booking', question: 'Создаёт ли сайт настоящую запись или оплату?', answer: 'Это учебная демонстрация. Формы показывают итог выбранных услуг, но не отправляют данные на сервер, не резервируют места и не принимают оплату. Для реального визита используйте контакты клуба.', category: 'membership', link: 'index.html#contacts', linkText: 'Контакты клуба' }
  ]);

  const $cards = $('#faq-cards-container');
  if ($cards.length) {
    const $filters = create('div', 'row g-2 align-items-end mb-3').insertBefore($cards);
    const $searchCol = create('div', 'col-12 col-md-5').appendTo($filters);
    create('label', 'form-label small', 'Поиск в вопросах').attr('for', 'faq-search').appendTo($searchCol);
    const $search = create('input', 'form-control form-control-sm').attr({ id: 'faq-search', type: 'search', maxlength: 100, placeholder: 'Например: тренер, заморозка' }).appendTo($searchCol);
    const $categoryCol = create('div', 'col-12 col-sm-7 col-md-4').appendTo($filters);
    create('label', 'form-label small', 'Тема').attr('for', 'faq-category').appendTo($categoryCol);
    const $category = create('select', 'form-select form-select-sm').attr('id', 'faq-category').appendTo($categoryCol);
    [
      ['all', 'Все темы'], ['rules', 'Правила и визит'], ['services', 'Удобства и тренировки'], ['membership', 'Абонементы и запись']
    ].forEach(([value, label]) => $category.append(create('option', '', label).val(value)));
    const $resetCol = create('div', 'col-12 col-sm-5 col-md-3').appendTo($filters);
    const $reset = create('button', 'btn btn-outline-secondary btn-sm w-100', 'Сбросить фильтры').attr({ type: 'button', id: 'faq-reset' }).appendTo($resetCol);
    const $count = create('p', 'small text-muted mb-0').attr({ id: 'faq-count', 'aria-live': 'polite', 'aria-atomic': 'true' }).insertBefore($cards);

    function renderFaq(item) {
      const $col = create('div', 'col-12');
      const $card = create('article', 'border rounded bg-light p-3').attr('data-faq-id', item.id).appendTo($col);
      const $heading = create('h3', 'h6 mb-0').appendTo($card);
      create('button', 'btn btn-link text-dark fw-semibold text-start text-decoration-none p-0 w-100', item.question)
        .attr({ type: 'button', id: 'faq-question-' + item.id, 'data-faq-toggle': item.id, 'aria-expanded': 'false', 'aria-controls': 'faq-answer-' + item.id }).appendTo($heading);
      const $answer = create('div', 'pt-3').attr({ id: 'faq-answer-' + item.id, 'data-faq-answer': item.id, role: 'region', 'aria-labelledby': 'faq-question-' + item.id }).hide().appendTo($card);
      create('p', 'text-muted mb-2', item.answer).appendTo($answer);
      create('a', 'small fw-semibold', item.linkText).attr('href', item.link).appendTo($answer);
      return $col;
    }

    function renderList() {
      const query = $search.val().trim().toLocaleLowerCase('ru-RU');
      const topic = $category.val();
      const filtered = FAQS.filter((item) => (
        (topic === 'all' || topic === item.category) &&
        (item.question + ' ' + item.answer).toLocaleLowerCase('ru-RU').includes(query)
      ));
      $cards.empty();
      filtered.forEach((item) => $cards.append(renderFaq(item)));
      if (!filtered.length) {
        const $empty = create('div', 'col-12').appendTo($cards);
        const $box = create('div', 'border rounded p-3 bg-light').appendTo($empty);
        create('p', 'mb-2', 'Ответов по этим условиям нет. Измените запрос или задайте свой вопрос.').appendTo($box);
        create('a', 'btn btn-outline-dark btn-sm', 'Перейти к форме').attr('href', '#about-contact-section').appendTo($box);
      }
      $count.text('Найдено вопросов: ' + filtered.length + ' из ' + FAQS.length);
    }

    $search.on('input', renderList);
    $category.on('change', renderList);
    $reset.on('click', function () {
      $search.val('');
      $category.val('all');
      renderList();
    });
    // Delegation: filtering removes and recreates buttons, but this parent survives.
    $cards.on('click', 'button[data-faq-toggle]', function () {
      const $button = $(this);
      const $card = $button.closest('article');
      const opening = !$card.hasClass('is-selected');
      $card.toggleClass('is-selected', opening);
      $button.attr('aria-expanded', String(opening));
      // Traversal follows button -> heading -> answer; no extra ID lookup needed.
      $button.parent().siblings('[data-faq-answer]').stop(true, true).slideToggle(duration);
    });
    $cards.on('keydown', 'button[data-faq-toggle]', function (event) {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); // Arrow keys navigate accordion headings rather than scroll.
      const $buttons = $cards.find('button[data-faq-toggle]');
      const current = $buttons.index(this);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? $buttons.length - 1 :
        (current + (event.key === 'ArrowDown' ? 1 : -1) + $buttons.length) % $buttons.length;
      $buttons.eq(next).trigger('focus');
    });
    renderList();
  }

  const $form = $('#about-contact-form');
  const $status = $('#about-form-status');
  if (!$form.length || !$status.length) return;
  $form.prop('noValidate', true);
  // Keep native required/type constraints. Custom checks provide per-field messages;
  // browser validation alone would not replace validation on a real server.
  $('#about-contact-section > p').text('Задайте вопрос и проверьте заполнение формы. Это демонстрация: сообщение не отправляется клубу.');
  const $name = $('#about-name').attr({ autocomplete: 'name', minlength: 2, maxlength: 80 });
  const $email = $('#about-email').attr({ autocomplete: 'email', maxlength: 120 });
  const $phone = $('#about-phone').attr({ autocomplete: 'tel', inputmode: 'tel', maxlength: 24 });
  const $topic = $('#about-topic');
  const $message = $('#about-message').attr({ minlength: 10, maxlength: 2000, 'aria-describedby': 'about-character-count about-message-help' });
  const $charCount = create('p', 'small text-muted mt-1 mb-0').attr('id', 'about-character-count').insertAfter($message);
  const $messageHelp = create('p', 'small text-muted mt-1 mb-0').attr('id', 'about-message-help').insertAfter($charCount);
  $status.attr({ role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', tabindex: '-1' });
  $('#about-submit-btn').text('Проверить и отправить (демо)');
  create('button', 'btn btn-outline-secondary ms-2 mt-2 mt-sm-0', 'Очистить').attr({ type: 'reset', id: 'about-reset-btn' }).insertAfter($('#about-submit-btn'));
  // Attribute selector and traversal apply browser hints without changing labels.
  $form.find('input[required]').each(function () { $(this).attr('aria-required', 'true'); });
  const allowedTopics = $topic.find('option:not([value=""])').map(function () { return $(this).val(); }).get();

  function updateMessageHelp() {
    const minimum = $topic.val() === 'trainer' ? 20 : 10;
    $message.attr('minlength', minimum);
    $charCount.text($message.val().length + ' / 2000 символов');
    $messageHelp.text(minimum === 20 ? 'Для персонального тренинга опишите цель и удобное время: не менее 20 символов.' : 'Опишите вопрос: от 10 до 2000 символов.');
  }

  function clearOldSummary() {
    $status.stop(true, true).empty().removeClass('is-success is-error').show();
  }
  $form.on('input change', 'input, select, textarea', function () {
    B.clearError($(this));
    if (this.id === 'about-topic') B.clearError($message);
    clearOldSummary();
    updateMessageHelp();
  });
  $form.on('reset', function () {
    B.resetErrors($form);
    clearOldSummary();
    window.setTimeout(updateMessageHelp, 0);
  });

  $form.on('submit', function (event) {
    event.preventDefault(); // No navigation or POST to the static hosting server.
    B.resetErrors($form);
    clearOldSummary();
    const values = {
      name: $name.val().trim(), email: $email.val().trim(), phone: $phone.val().trim(),
      topic: $topic.val(), topicLabel: $topic.find('option:selected').text(), message: $message.val().trim()
    };
    const minimum = values.topic === 'trainer' ? 20 : 10;
    const checks = [
      [$name, B.validName(values.name), 'Укажите имя от 2 до 80 символов, содержащее буквы.'],
      [$email, B.validEmail(values.email), 'Введите корректный e-mail, например user@example.com.'],
      [$phone, B.validPhone(values.phone), 'Введите номер из 11 цифр, начинающийся с +7 или 8.'],
      [$topic, allowedTopics.includes(values.topic), 'Выберите тему обращения.'],
      [$message, values.message.length >= minimum && values.message.length <= 2000, 'Введите от ' + minimum + ' до 2000 символов без пробелов по краям.']
    ];
    const failed = checks.filter((check) => !check[1]);
    failed.forEach((check) => B.setError(check[0], check[2]));
    if (failed.length) {
      failed[0][0].trigger('focus');
      return;
    }
    const code = B.reference();
    $form.trigger('reset');
    // Chaining: finish old effect, clear content, assign success state, then hide
    // until the complete validated summary has been assembled safely with .text().
    $status.stop(true, true).empty().addClass('is-success').hide();
    create('h3', 'h5 mb-3', 'Демонстрационное обращение ' + code).appendTo($status);
    const $summary = create('dl', 'row mb-0').appendTo($status);
    [
      ['Имя', values.name], ['E-mail', values.email], ['Телефон', values.phone],
      ['Тема', values.topicLabel], ['Вопрос', values.message]
    ].forEach(([label, value]) => {
      create('dt', 'col-12 col-sm-3', label).appendTo($summary);
      create('dd', 'col-12 col-sm-9 text-break', value).appendTo($summary);
    });
    create('p', 'small mb-0 border-top pt-2 mt-2', 'Проверка пройдена. Данные не отправлены на сервер. Сообщение, реальная запись, заказ и оплата не созданы. Для связи используйте телефон или e-mail клуба.').appendTo($status);
    $status.fadeIn(duration, function () { $(this).trigger('focus'); });
  });
  updateMessageHelp();
});
