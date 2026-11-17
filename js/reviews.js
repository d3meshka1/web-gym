'use strict';

/* Reviews page: safe text rendering, local persistence, search and rating filters.
 * bonanza.reviews.v1 is unchanged so previously saved reviews stay available.
 */
$(function () {
  const B = window.Bonanza;
  const $reviews = $('#reviews');
  if (!B || !$reviews.length) return;
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180;
  const create = (tag, classes = '', text = '') => $('<' + tag + '>').addClass(classes).text(text);

  const seedReviews = Object.freeze([
    { id: 'seed-tilegen', name: 'Tilegen Z.', rating: 5, text: 'Хороший зал, хорошие спокойные дружелюбные тренера👍', date: '2026-03-21', role: 'постоянный клиент', avatar: 'avatar/photo_2026-09-16_14-52-00.jpg' },
    { id: 'seed-sokolovskiy', name: 'Sokolovskiy Z.', rating: 5, text: 'Отличный зал. Отзывчивый персонал. На просьбы и вопросы обращают внимание.', date: '2026-04-25', role: 'постоянный клиент', avatar: 'avatar/photo_2026-09-16_14-51-57.jpg' },
    { id: 'seed-margarite', name: 'Margarite L.', rating: 5, text: 'Персонал молодцы. Понравилось.', date: '2026-07-10', role: 'член кроссфит группы', avatar: 'avatar/photo_2026-09-16_14-52-03.jpg' }
  ]);
  const storageKey = 'bonanza.reviews.v1';
  const $list = $('#reviews-list');
  const $status = $('#reviews-status').attr({ role: 'status', 'aria-live': 'polite', tabindex: '-1' });
  const saved = B.safeRead(storageKey, []);
  // Storage is untrusted input too. Keep only bounded, validated, known fields.
  let localReviews = (Array.isArray(saved) ? saved : []).filter((item) => (
    item && typeof item.id === 'string' && /^local-[a-z0-9-]{1,60}$/i.test(item.id) &&
    typeof item.name === 'string' && B.validName(item.name) &&
    typeof item.text === 'string' && item.text.trim().length >= 20 && item.text.length <= 1000 &&
    Number.isInteger(item.rating) && item.rating >= 1 && item.rating <= 5 &&
    typeof item.date === 'string' && Number.isFinite(Date.parse(item.date)) && Date.parse(item.date) <= Date.now() + 60000
  )).slice(0, 20).map((item) => ({
    id: item.id, name: item.name.trim(), text: item.text.trim(), rating: item.rating, date: item.date,
    role: 'ваш отзыв · в этом браузере', own: true
  }));
  localReviews = localReviews.filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index);

  const $filters = create('div', 'row g-2 align-items-end mb-3');
  const $searchCol = create('div', 'col-12 col-md-6');
  $searchCol.append(create('label', 'form-label small', 'Поиск в отзывах').attr('for', 'review-search'));
  const $search = create('input', 'form-control form-control-sm').attr({ id: 'review-search', type: 'search', maxlength: 100, placeholder: 'Имя или текст отзыва' });
  $searchCol.append($search);
  const $ratingCol = create('div', 'col-12 col-sm-7 col-md-3');
  $ratingCol.append(create('label', 'form-label small', 'Оценка').attr('for', 'review-filter-rating'));
  const $ratingFilter = create('select', 'form-select form-select-sm').attr('id', 'review-filter-rating');
  $ratingFilter.append(create('option', '', 'Все оценки').val('all'));
  [5, 4, 3, 2, 1].forEach((rating) => $ratingFilter.append(create('option', '', rating + ' из 5').val(String(rating))));
  $ratingCol.append($ratingFilter);
  const $resetCol = create('div', 'col-12 col-sm-5 col-md-3');
  const $resetFilters = create('button', 'btn btn-outline-secondary btn-sm w-100', 'Сбросить фильтры').attr({ type: 'button', id: 'review-reset-filters' });
  $resetCol.append($resetFilters);
  $filters.append($searchCol, $ratingCol, $resetCol).insertBefore($list);
  const $count = create('p', 'small text-muted mb-3').attr({ id: 'reviews-count', 'aria-live': 'polite', 'aria-atomic': 'true' }).insertBefore($list);

  const $form = $('#review-form');
  const $name = $('#review-name');
  const $score = $('#review-rating');
  const $text = $('#review-text');
  const $charCount = $('#review-character-count');
  $('#review-submit').prop('disabled', false);

  function characterCount() {
    $charCount.text(String($text.val().length) + ' / 1000 символов');
  }

  function renderReview(review) {
    const $column = create('div', 'col-12 col-md-6 col-lg-4');
    const $card = create('article', 'review-card h-100 d-flex flex-column').attr('data-review-id', review.id).appendTo($column);
    create('h3', 'visually-hidden', 'Отзыв: ' + review.name).appendTo($card);
    const $head = create('div', 'd-flex flex-wrap align-items-center gap-3 mb-3').appendTo($card);
    if (review.avatar) create('img', 'review-avatar img-fluid').attr({ src: review.avatar, alt: 'Аватар клиента ' + review.name, width: 56, height: 56, loading: 'lazy', decoding: 'async' }).appendTo($head);
    create('span', 'rating fw-bold', '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating))
      .attr('aria-label', 'Оценка: ' + review.rating + ' из 5').appendTo($head);
    const $quote = create('blockquote', 'review-content flex-grow-1 m-0 mb-3').appendTo($card);
    create('q', 'd-block text-break', review.text).appendTo($quote);
    const $footer = create('footer', 'small text-start').appendTo($card);
    create('strong', 'd-block text-break', review.name).appendTo($footer);
    create('cite', 'd-block', review.role).appendTo($footer);
    const date = new Date(review.date.length === 10 ? review.date + 'T12:00:00' : review.date);
    const dateOptions = review.own ? { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'long', year: 'numeric' };
    create('time', 'd-block', date.toLocaleString('ru-RU', dateOptions)).attr('datetime', review.date).appendTo($footer);
    if (review.own) create('button', 'btn btn-outline-secondary btn-sm mt-3 align-self-start', 'Удалить мой отзыв')
      .attr({ type: 'button', 'data-remove-review': review.id, 'aria-label': 'Удалить мой отзыв: ' + review.name }).appendTo($card);
    return $column;
  }

  function showReviews() {
    const all = [...localReviews, ...seedReviews];
    const query = $search.val().trim().toLocaleLowerCase('ru-RU');
    const rating = $ratingFilter.val();
    const filtered = all.filter((review) => (
      (rating === 'all' || review.rating === Number(rating)) &&
      (review.name + ' ' + review.text).toLocaleLowerCase('ru-RU').includes(query)
    ));
    $list.empty();
    filtered.forEach((review) => $list.append(renderReview(review)));
    if (!filtered.length) {
      const $empty = create('div', 'col-12').appendTo($list);
      create('p', 'border rounded bg-light p-3 mb-0', 'Отзывов по этим условиям нет. Измените запрос или сбросьте фильтры.').appendTo($empty);
    }
    const mean = all.reduce((sum, review) => sum + review.rating, 0) / all.length;
    $count.text('Показано ' + filtered.length + ' из ' + all.length + ' · Средняя оценка: ' + mean.toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' из 5');
  }

  function showStatus(message, success = true) {
    // Chaining: stop an old effect, set text, switch status classes, then reveal.
    $status.stop(true, true).text(message).removeClass('is-error is-success').addClass(success ? 'is-success' : 'is-error').hide().fadeIn(duration);
  }

  $search.on('input', showReviews);
  $ratingFilter.on('change', showReviews);
  $resetFilters.on('click', function () {
    $search.val('');
    $ratingFilter.val('all');
    showReviews();
  });
  $form.on('input change', 'input, textarea, select', function () {
    B.clearError($(this));
    $status.stop(true, true).empty().removeClass('is-success is-error').show();
    characterCount();
  });
  $form.on('reset', function () {
    B.resetErrors($form);
    window.setTimeout(characterCount, 0);
  });

  // Delegation is necessary: these remove buttons are created again on each render.
  $list.on('click', 'button[data-remove-review]', function () {
    const id = $(this).attr('data-remove-review');
    localReviews = localReviews.filter((review) => review.id !== id);
    const persisted = B.safeWrite(storageKey, localReviews);
    showReviews();
    showStatus(persisted ? 'Ваш отзыв удалён из этого браузера.' : 'Отзыв удалён с этой страницы. Браузер не разрешил обновить локальное сохранение.');
    $status.trigger('focus');
  });

  $form.on('submit', function (event) {
    event.preventDefault(); // Without this the browser would navigate/reload the page.
    B.resetErrors($form);
    $status.stop(true, true).empty().removeClass('is-success is-error').show();
    const author = $name.val().trim();
    const message = $text.val().trim();
    const score = Number($score.val());
    const checks = [
      [$name, B.validName(author), 'Введите имя от 2 до 80 символов, содержащее буквы.'],
      [$score, Number.isInteger(score) && score >= 1 && score <= 5, 'Выберите оценку от 1 до 5.'],
      [$text, message.length >= 20 && message.length <= 1000, 'Отзыв должен содержать от 20 до 1000 символов без пробелов по краям.']
    ];
    const failed = checks.filter((check) => !check[1]);
    failed.forEach((check) => B.setError(check[0], check[2]));
    if (failed.length) { failed[0][0].trigger('focus'); return; }
    if (localReviews.length >= 20) { showStatus('В этом браузере уже сохранено 20 отзывов. Удалите один из своих отзывов, чтобы добавить новый.', false); return; }
    if (localReviews.some((review) => review.name.toLocaleLowerCase() === author.toLocaleLowerCase() && review.text === message && review.rating === score)) {
      B.setError($text, 'Такой отзыв уже добавлен. Измените текст или оценку.');
      $text.trigger('focus');
      return;
    }
    const review = {
      id: 'local-' + Date.now().toString(36) + '-' + B.reference().toLowerCase(),
      name: author, text: message, rating: score, date: new Date().toISOString(),
      role: 'ваш отзыв · в этом браузере', own: true
    };
    localReviews.unshift(review);
    const persisted = B.safeWrite(storageKey, localReviews);
    $search.val('');
    $ratingFilter.val('all');
    showReviews();
    $form.trigger('reset');
    showStatus(persisted ? 'Отзыв добавлен и сохранён только в этом браузере. Клубу он не отправлен.' : 'Отзыв добавлен только на эту страницу. Браузер запретил сохранение: после обновления он исчезнет. Клубу он не отправлен.');
    $status.trigger('focus');
  });
  characterCount();
  showReviews();
  if (window.location.hash === '#review-form') {
    window.requestAnimationFrame(function () {
      $form[0].scrollIntoView({ block: 'start', behavior: 'instant' });
      $name.trigger('focus');
    });
  }
});
