'use strict';

/*
 * jQuery 3.7.1 — tariffs, selection calculator and service cart.
 * The earlier native implementation is preserved in js/old-js/services.js.
 * querySelector/createElement/append became $()/$("<tag>")/.append();
 * addEventListener became .on(), with delegation for generated rows.
 * Delegation removes per-row listener setup; pricing/filter functions stay plain JS.
 * Existing Bootstrap and project classes provide all appearance and state changes.
 */

$(function () {
  const B = window.Bonanza;
  const $section = $('#price-list');
  const $body = $('#tariff-list');
  const $summary = $('#service-summary');
  if (!$section.length || !$body.length || !$summary.length) return;

  const tariffs = B.tariffs;
  const CART_KEY = 'bonanza:services-cart:v2';
  const MAX_CART_QUANTITY = 9;
  const MAX_CALC_QUANTITY = 6;
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160;
  const $status = $('#services-status');
  const $error = $('#services-error');
  const $booking = $('#services-booking');
  let selected = null;
  let quantityTouched = false;

  function element(tag, classes, text) {
    const $item = $('<' + tag + '>');
    if (classes) $item.addClass(classes);
    if (text !== undefined) $item.text(text);
    return $item;
  }

  function button(text, classes) {
    return element('button', classes, text).attr('type', 'button');
  }

  function findTariff(id) {
    return tariffs.find(item => item.id === id);
  }

  function readCart() {
    const result = new Map();
    const stored = B.safeRead(CART_KEY, []);
    if (!Array.isArray(stored)) return result;
    stored.slice(0, tariffs.length).forEach(item => {
      if (!item || !findTariff(item.id) || !Number.isInteger(item.quantity) || item.quantity < 1) return;
      result.set(item.id, Math.min(item.quantity, MAX_CART_QUANTITY));
    });
    return result;
  }
  const cart = readCart();

  function cartTotals() {
    return Array.from(cart).reduce((sum, [id, quantity]) => {
      sum.quantity += quantity;
      sum.price += findTariff(id).price * quantity;
      return sum;
    }, { quantity: 0, price: 0 });
  }

  function persistCart() {
    const content = Array.from(cart, ([id, quantity]) => ({ id, quantity }));
    if (!B.safeWrite(CART_KEY, content)) {
      $storageNotice.text('Сохранение в браузере недоступно. Корзина работает до закрытия страницы.').removeClass('d-none');
    }
  }

  // The old static table remains as the no-JavaScript fallback in the HTML file.
  // Every visible row now uses the same canonical data as the booking form.
  const $controls = element('div', 'border rounded-3 p-3 bg-light mt-3 mb-3').insertBefore('#prices-scroll');
  const $filterRow = element('div', 'row g-3 align-items-end').appendTo($controls);
  function filter(id, label, $field, classes) {
    const $wrap = element('div', classes).appendTo($filterRow);
    element('label', 'form-label small mb-1', label).attr('for', id).appendTo($wrap);
    return $field.attr('id', id).appendTo($wrap);
  }
  const $search = filter('service-search', 'Поиск тарифа', element('input', 'form-control').attr({ type: 'search', placeholder: 'Название или условие', maxlength: '80' }), 'col-12 col-md-4');
  const $category = filter('service-category', 'Категория', element('select', 'form-select'), 'col-12 col-sm-6 col-md-4');
  [['all', 'Все тарифы'], ['gym', 'Абонементы'], ['trainer', 'С тренером'], ['single', 'Разовые посещения']].forEach(([value, label]) => $category.append(element('option', '', label).val(value)));
  const $sort = filter('service-sort', 'Сортировка', element('select', 'form-select'), 'col-12 col-sm-6 col-md-4');
  [['default', 'Порядок прайс-листа'], ['asc', 'Стоимость: по возрастанию'], ['desc', 'Стоимость: по убыванию'], ['name', 'По названию']].forEach(([value, label]) => $sort.append(element('option', '', label).val(value)));
  const $filterFooter = element('div', 'd-flex flex-wrap gap-2 align-items-center justify-content-between mt-3').appendTo($controls);
  const $count = element('p', 'small text-muted mb-0').attr({ id: 'service-result-count', role: 'status' }).appendTo($filterFooter);
  const $reset = button('Сбросить фильтры', 'btn btn-outline-secondary btn-sm').attr('id', 'service-filter-reset').appendTo($filterFooter);
  $('#prices-table thead th').last().text('Стоимость пакета');
  $('#prices-caption').text('Стоимость одного пакета. Срок действия и условия указаны в каждой строке.');

  function filteredTariffs() {
    const query = String($search.val()).trim().toLocaleLowerCase('ru');
    const category = $category.val();
    const items = tariffs.filter(item => (category === 'all' || item.category === category) && [item.name, item.period, item.details].join(' ').toLocaleLowerCase('ru').includes(query));
    if ($sort.val() === 'asc') items.sort((a, b) => a.price - b.price);
    if ($sort.val() === 'desc') items.sort((a, b) => b.price - a.price);
    if ($sort.val() === 'name') items.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    return items;
  }

  function tariffRow(tariff) {
    const slug = tariff.id.replaceAll('_', '-');
    const chosen = selected !== null && selected.id === tariff.id;
    const $row = element('tr').attr({ id: 'tariff-' + slug, 'data-service': tariff.id, 'data-price-kzt': String(tariff.price) }).toggleClass('is-selected', chosen);
    const $title = element('th', '', tariff.name).attr('scope', 'row').appendTo($row);
    const $action = element('div', 'mt-2').appendTo($title);
    button(chosen ? 'Выбрано' : 'Выбрать', 'btn btn-outline-dark btn-sm').attr({ id: 'select-' + slug, 'data-service': tariff.id, 'aria-controls': 'service-summary', 'aria-label': 'Выбрать: ' + tariff.name, 'aria-pressed': String(chosen) }).appendTo($action);
    element('td', '', tariff.period).appendTo($row);
    element('td', '', tariff.details).appendTo($row);
    element('td', 'text-end text-nowrap fw-semibold', B.money(tariff.price)).attr('id', 'price-' + slug).appendTo($row);
    return $row;
  }

  function renderTariffs() {
    const items = filteredTariffs();
    $body.empty();
    items.forEach(item => $body.append(tariffRow(item)));
    if (items.length === 0) {
      $body.append(element('tr').append(element('td', 'text-center text-muted py-4', 'Подходящих тарифов нет. Измените запрос или сбросьте фильтры.').attr('colspan', '4')));
    }
    $count.text('Найдено тарифов: ' + items.length + ' из ' + tariffs.length);
  }

  // Reuse the existing summary and its IDs instead of adding duplicate price cards.
  $summary.insertBefore('#booking-next-step');
  $error.insertAfter($summary);
  $status.insertAfter($error);
  $summary.attr('tabindex', '-1');
  const $unitPrice = element('p', 'small text-muted mt-3 mb-0').attr('id', 'service-unit-price').appendTo($summary);
  const $calculator = element('div', 'row g-3 align-items-end mt-1').attr('id', 'membership-calculator').appendTo($summary);
  const $quantityWrap = element('div', 'col-12 col-sm-5').appendTo($calculator);
  element('label', 'form-label small mb-1', 'Пакетов для корзины').attr('for', 'service-quantity').appendTo($quantityWrap);
  const $quantity = element('input', 'form-control').attr({ id: 'service-quantity', type: 'number', min: '1', max: String(MAX_CALC_QUANTITY), step: '1', value: '1', required: 'required', inputmode: 'numeric', 'aria-describedby': 'service-quantity-help' }).appendTo($quantityWrap);
  const $calculatedWrap = element('div', 'col-12 col-sm-7').appendTo($calculator);
  element('p', 'small text-muted mb-1', 'Общая стоимость').appendTo($calculatedWrap);
  const $calculated = element('output', 'd-block h5 fw-bold mb-0').attr({ id: 'service-calculation', 'aria-live': 'polite', for: 'service-quantity' }).appendTo($calculatedWrap);
  element('p', 'small text-muted mt-2 mb-0', 'Один пакет — для одного посетителя. Здесь можно рассчитать от 1 до 6 пакетов; в корзине — до 9 пакетов одного тарифа.').attr('id', 'service-quantity-help').appendTo($summary);
  const $add = button('Добавить в корзину', 'btn btn-dark mt-3').attr('id', 'service-add-to-cart').appendTo($summary);

  $('#booking-link-help').text('Выбранный тариф автоматически появится в форме записи на одного посетителя. Несколько пакетов можно отдельно проверить в корзине. Данные не отправляются на сервер.');
  $booking.attr('href', B.bookingHref({}));

  function calculatorQuantity() {
    const raw = String($quantity.val()).trim();
    const value = Number(raw);
    return raw !== '' && Number.isInteger(value) && value >= 1 && value <= MAX_CALC_QUANTITY ? value : null;
  }

  function calculate(showError) {
    const quantity = calculatorQuantity();
    if (!selected) return;
    if (quantity === null) {
      $calculated.text('Укажите количество');
      $add.prop('disabled', true);
      if (showError) B.setError($quantity, 'Введите целое число от 1 до ' + MAX_CALC_QUANTITY + '.');
      return;
    }
    B.clearError($quantity);
    $calculated.text(quantity + ' × ' + B.money(selected.price) + ' = ' + B.money(quantity * selected.price));
    const available = MAX_CART_QUANTITY - (cart.get(selected.id) || 0);
    $add.prop('disabled', quantity > available).text(quantity > available ? 'Лимит корзины: ' + MAX_CART_QUANTITY + ' пакетов' : 'Добавить в корзину');
  }

  function chooseTariff(id) {
    const tariff = findTariff(id);
    if (!tariff) return;
    const wasHidden = $summary.prop('hidden');
    selected = tariff;
    $('#selected-service-name').text(tariff.name);
    $('#selected-service-period').text(tariff.period);
    $('#selected-service-options').text(tariff.details);
    $('#selected-service-total').text(B.money(tariff.price));
    if (tariff.months) {
      $unitPrice.text('В пересчёте: ≈ ' + B.money(Number((tariff.price / tariff.months).toFixed(2))) + ' за месяц. Полная стоимость пакета за ' + tariff.period + ' — ' + B.money(tariff.price) + '.');
    } else if (tariff.id === 'personal') {
      $unitPrice.text('В пересчёте: ≈ ' + B.money(Number((tariff.price / 12).toFixed(2))) + ' за занятие. Пакет включает 12 занятий; отдельно по этой цене занятие не продаётся.');
    } else {
      $unitPrice.text('Стоимость одного визита. Учитывайте часы входа и окончания посещения.');
    }
    $summary.prop('hidden', false);
    if (wasHidden) $summary.hide().slideDown(duration);
    calculate(quantityTouched);
    $body.find('tr[data-service]').each(function () {
      const active = $(this).attr('data-service') === tariff.id;
      // The row is the selection boundary; find() only updates its own button.
      $(this).toggleClass('is-selected', active).find('button[data-service]').attr('aria-pressed', String(active)).text(active ? 'Выбрано' : 'Выбрать');
    });
    $booking.attr('href', B.bookingHref({ service: tariff.id })).text('Записаться: ' + tariff.name);
    B.announce($status, 'Выбран «' + tariff.name + '». Проверьте стоимость ниже или перейдите к записи.', 'success');
    B.announce($error, '');
  }

  // Compact disclosure: only the cart the visitor opens consumes page height.
  const $cartSection = element('details', 'border rounded-3 p-3 mt-3 mb-3 bg-light').attr('id', 'services-cart').insertBefore('#booking-next-step');
  const $cartHeading = element('summary', 'fw-bold').attr('id', 'services-cart-heading').appendTo($cartSection);
  element('p', 'small text-muted mt-2 mb-3', 'Демонстрационный расчёт услуг. Покупка и оплата не выполняются. Количество обозначает отдельные пакеты, а не месяцы.').appendTo($cartSection);
  const $cartItems = element('div', 'd-flex flex-column gap-2').attr('id', 'services-cart-items').appendTo($cartSection);
  const $cartTotal = element('output', 'd-block fw-bold mt-3 mb-3').attr({ id: 'services-cart-total', 'aria-live': 'polite' }).appendTo($cartSection);
  const $cartActions = element('div', 'd-flex flex-wrap gap-2').appendTo($cartSection);
  const $checkout = button('Проверить выбранные услуги', 'btn btn-primary').attr('id', 'services-checkout').appendTo($cartActions);
  const $clear = button('Очистить корзину', 'btn btn-outline-secondary').attr('id', 'services-cart-clear').appendTo($cartActions);
  const $cartFeedback = element('p', 'small text-success mt-3 mb-0').attr({ id: 'services-cart-feedback', role: 'status' }).appendTo($cartSection);
  const $cartMessage = element('div', 'status-message mt-3').attr({ id: 'services-cart-message', role: 'status', 'aria-live': 'polite', tabindex: '-1' }).appendTo($cartSection);
  const $storageNotice = element('p', 'small text-muted mt-2 mb-0 d-none').attr('role', 'status').appendTo($cartSection);
  if (cart.size > 0) $cartSection.prop('open', true);

  function cartLine(id, quantity) {
    const item = findTariff(id);
    const $line = element('div', 'p-3 bg-white rounded border').attr('data-cart-id', id);
    const $title = element('div', 'd-flex flex-wrap justify-content-between gap-2').appendTo($line);
    element('strong', 'small', item.name).appendTo($title);
    element('span', 'small fw-bold', B.money(item.price * quantity)).appendTo($title);
    const $bottom = element('div', 'd-flex flex-wrap gap-2 align-items-center justify-content-between mt-2').appendTo($line);
    element('span', 'small text-muted', item.period + ' · ' + B.money(item.price) + ' за пакет').appendTo($bottom);
    const $actions = element('div', 'd-flex align-items-center gap-2').appendTo($bottom);
    button('−', 'btn btn-outline-secondary btn-sm').attr({ 'data-cart-action': 'minus', 'aria-label': 'Уменьшить количество: ' + item.name }).appendTo($actions);
    element('span', 'fw-bold small', String(quantity)).attr('aria-label', 'Пакетов: ' + quantity).appendTo($actions);
    button('+', 'btn btn-outline-secondary btn-sm').attr({ 'data-cart-action': 'plus', 'aria-label': 'Увеличить количество: ' + item.name }).prop('disabled', quantity >= MAX_CART_QUANTITY).appendTo($actions);
    button('Удалить', 'btn btn-outline-danger btn-sm').attr({ 'data-cart-action': 'remove', 'aria-label': 'Удалить: ' + item.name }).appendTo($actions);
    return $line;
  }

  function renderCart(focusId, focusAction) {
    const sum = cartTotals();
    $cartItems.empty();
    cart.forEach((quantity, id) => $cartItems.append(cartLine(id, quantity)));
    if (cart.size === 0) element('p', 'text-muted mb-0', 'Корзина пуста. Выберите тариф в таблице, укажите количество и добавьте его в корзину.').appendTo($cartItems);
    $cartHeading.text('Корзина · ' + sum.quantity + ' пак. · ' + B.money(sum.price));
    $cartTotal.text('Всего пакетов: ' + sum.quantity + ' · Итого: ' + B.money(sum.price));
    $checkout.prop('disabled', cart.size === 0);
    $clear.prop('disabled', cart.size === 0);
    calculate(quantityTouched);
    if (focusId) {
      const $row = $cartItems.children('[data-cart-id="' + focusId + '"]');
      let $focus = $row.find('[data-cart-action="' + focusAction + '"]:not(:disabled)');
      if (!$focus.length) $focus = $row.find('button:not(:disabled)').first();
      if (!$focus.length) $focus = $cartItems.find('button:not(:disabled)').first();
      ($focus.length ? $focus : $cartHeading).trigger('focus');
    }
  }

  function clearCartSummary() {
    $cartMessage.stop(true, true).empty().removeClass('alert alert-success').show();
  }

  $search.on('input', renderTariffs);
  $category.add($sort).on('change', renderTariffs);
  $reset.on('click', function () {
    $search.val('');
    $category.val('all');
    $sort.val('default');
    renderTariffs();
    $search.trigger('focus');
  });
  // Table rows are recreated during search/sort, so their listener belongs to tbody.
  $body.on('click', 'button[data-service]', function () {
    chooseTariff($(this).attr('data-service'));
  });
  $quantity.on('input change', function () {
    quantityTouched = true;
    calculate(true);
  });
  $add.on('click', function () {
    if (!selected) return;
    const quantity = calculatorQuantity();
    if (quantity === null) {
      quantityTouched = true;
      calculate(true);
      $quantity.trigger('focus');
      return;
    }
    const next = (cart.get(selected.id) || 0) + quantity;
    if (next > MAX_CART_QUANTITY) {
      B.announce($error, 'В корзине может быть не более ' + MAX_CART_QUANTITY + ' пакетов одного тарифа.', 'error');
      return;
    }
    cart.set(selected.id, next);
    clearCartSummary();
    persistCart();
    renderCart();
    $cartSection.prop('open', true);
    B.announce($status, 'Добавлено: «' + selected.name + '» × ' + quantity + '. Общая стоимость корзины — ' + B.money(cartTotals().price) + '.', 'success');
    $cartFeedback.text('Пакеты добавлены. Количество можно изменить здесь.');
  });
  // Dynamic cart buttons use a single delegated handler; rerenders keep it working.
  $cartItems.on('click', '[data-cart-action]', function () {
    const id = $(this).closest('[data-cart-id]').attr('data-cart-id');
    const action = $(this).attr('data-cart-action');
    const quantity = cart.get(id);
    if (!quantity) return;
    if (action === 'remove' || (action === 'minus' && quantity === 1)) cart.delete(id);
    else if (action === 'minus') cart.set(id, quantity - 1);
    else if (action === 'plus' && quantity < MAX_CART_QUANTITY) cart.set(id, quantity + 1);
    clearCartSummary();
    persistCart();
    renderCart(id, action);
    $cartFeedback.text(cart.has(id) ? 'Количество обновлено.' : 'Пакет удалён из корзины.');
    B.announce($status, '');
  });
  $clear.on('click', function () {
    cart.clear();
    clearCartSummary();
    persistCart();
    renderCart();
    $cartFeedback.text('Корзина очищена.');
    B.announce($status, '');
    $cartHeading.trigger('focus');
  });
  $checkout.on('click', function () {
    if (cart.size === 0) return;
    const sum = cartTotals();
    $cartMessage.empty().addClass('alert alert-success').hide();
    element('h3', 'h6 fw-bold mb-2', 'Демонстрационный расчёт ' + B.reference()).appendTo($cartMessage);
    const $list = element('ul', 'ps-3 mb-2').appendTo($cartMessage);
    cart.forEach((quantity, id) => {
      const tariff = findTariff(id);
      element('li', 'small', tariff.name + ' (' + tariff.period + ') · ' + quantity + ' × ' + B.money(tariff.price) + ' = ' + B.money(quantity * tariff.price)).appendTo($list);
    });
    element('p', 'fw-bold mb-2', 'Всего: ' + sum.quantity + ' пак. · ' + B.money(sum.price)).appendTo($cartMessage);
    element('p', 'small mb-0', 'Данные не отправлены на сервер. Реальные заказ, бронирование и оплата не созданы. Корзина очищена; состав расчёта сохранён выше до следующего изменения.').appendTo($cartMessage);
    cart.clear();
    persistCart();
    renderCart();
    B.announce($status, '');
    $cartFeedback.empty();
    $cartMessage.fadeIn(duration, function () { $(this).trigger('focus'); });
  });

  // Existing trainer cards get a useful next action, preserving their original layout.
  $('#trainer-list .trainer-card').each(function (index) {
    const trainer = B.trainers[index];
    if (!trainer) return;
    const $content = $(this).children('div').last();
    const $actions = element('div', 'mt-3').appendTo($content);
    element('a', 'btn btn-outline-dark btn-sm', 'Записаться к тренеру').attr('href', B.bookingHref({ service: 'personal', trainer: trainer.id })).appendTo($actions);
  });
  $('#additional-services .zone-item').eq(1).empty().append(
    element('strong', '', 'Посещения с 16 лет: '),
    element('span', '', 'онлайн-форма предназначена для посетителей от 16 до 90 лет. Другие форматы уточняйте в клубе.')
  );

  renderTariffs();
  renderCart();
  const incoming = new URLSearchParams(window.location.search).get('service');
  if (incoming && findTariff(incoming)) chooseTariff(incoming);
});
