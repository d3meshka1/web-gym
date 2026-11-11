'use strict';

/*
 * jQuery 3.7.1 — Nutrition catalogue, cart and request form.
 * Rewrite 1: querySelector/createElement/addEventListener catalogue became
 * $(), .append(), .find(), .on() and a delegated card handler.
 * Rewrite 2: native cart row listeners became one delegated .on() on its stable
 * parent; rendering is shorter, while the price/state calculations stay plain JS.
 * Rewrite 3: native form validation became .val(), .prop(), .addClass() and .on().
 * The original implementation is kept in js/old-js and is not loaded.
 * No custom CSS or inline styles: existing Bootstrap / project classes are reused.
 */

$(function () {
  const B = window.Bonanza;
  const $section = $('#supplements-section');
  const $form = $('#nutrition-question-form');
  if (!$section.length || !$form.length) return;

  const PRODUCTS = Object.freeze([
    { id: 'creatine', name: 'Креатин моногидрат', category: 'power', price: 8500, image: 'images/creatine-monohydrate.jpg', description: 'Две фасовки. Выберите нужный объём упаковки.', variants: [{ id: '300', label: '300 г', price: 8500 }, { id: '500', label: '500 г', price: 13500 }] },
    { id: 'protein', name: 'Сывороточный протеин', category: 'protein', price: 14500, image: 'images/protein.jpeg', description: 'Порошковый продукт. Вкус можно указать в пожеланиях.', variants: [{ id: '900', label: '900 г', price: 14500 }, { id: '1800', label: '1 800 г', price: 27000 }] },
    { id: 'vitamins', name: 'Комплекс Витамины & Омега-3', category: 'other', price: 6900, image: 'images/d3.jpg', description: 'Упаковки по 60 или 120 капсул. Иллюстрация категории.', variants: [{ id: '60', label: '60 капсул', price: 6900 }, { id: '120', label: '120 капсул', price: 12800 }] },
    { id: 'bcaa', name: 'BCAA 2:1:1 Аминокислоты', category: 'protein', price: 9200, image: 'images/protein.jpeg', description: 'Две фасовки. Фото иллюстрирует категорию товара.', variants: [{ id: '400', label: '400 г', price: 9200 }, { id: '800', label: '800 г', price: 17400 }] },
    { id: 'preworkout', name: 'Предтренировочный комплекс', category: 'power', price: 11000, image: 'images/creatine-monohydrate.jpg', description: 'Укажите фасовку. Фото иллюстрирует категорию товара.', variants: [{ id: '300', label: '300 г', price: 11000 }, { id: '600', label: '600 г', price: 20500 }] },
    { id: 'isotonic', name: 'Изотоник Hydrate Bar', category: 'other', price: 4500, image: 'images/d3.jpg', description: 'Напиток в двух объёмах. Иллюстрация категории.', variants: [{ id: '500', label: '500 мл', price: 4500 }, { id: '1000', label: '1 000 мл', price: 8000 }] }
  ]);
  const STORAGE_KEY = 'bonanza:nutrition-cart:v2';
  const MAX_QUANTITY = 9;
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180;
  const selectedVariants = new Map();
  const $status = $('#nutri-form-status').attr({ role: 'status', tabindex: '-1' });
  const $cards = $section.children('.row').first().attr('id', 'nutrition-catalog');
  const $name = $('#nutri-name').attr({ maxlength: '80', minlength: '2', autocomplete: 'name' });
  const $phone = $('#nutri-phone').attr({ autocomplete: 'tel', maxlength: '24', inputmode: 'tel' });
  const $question = $('#nutri-question').attr({ maxlength: '1000', minlength: '10', 'aria-describedby': 'nutri-character-count' });
  const $product = $('#nutri-product-select');
  const $submit = $('#nutri-submit-btn').removeClass('btn-dark').addClass('btn-primary');
  let formSubmitted = false;
  let completingRequest = false;
  let cartExpanded = true;

  function element(tag, classes, text) {
    const $node = $('<' + tag + '>');
    if (classes) $node.addClass(classes);
    if (text !== undefined) $node.text(text);
    return $node;
  }

  function button(text, classes) {
    return element('button', classes, text).attr('type', 'button');
  }

  function productById(id) {
    return PRODUCTS.find(item => item.id === id);
  }

  function variantById(product, id) {
    return product && product.variants.find(variant => variant.id === id);
  }

  function cartKey(productId, variantId) {
    return productId + ':' + variantId;
  }

  function readCart() {
    const result = new Map();
    const stored = B.safeRead(STORAGE_KEY, []);
    if (!Array.isArray(stored)) return result;
    stored.slice(0, PRODUCTS.length * 2).forEach(entry => {
      if (!entry || typeof entry !== 'object') return;
      const product = productById(entry.product);
      const variant = variantById(product, entry.variant);
      if (!variant || !Number.isInteger(entry.quantity) || entry.quantity < 1) return;
      const key = cartKey(product.id, variant.id);
      result.set(key, { product: product.id, variant: variant.id, quantity: Math.min(entry.quantity, MAX_QUANTITY) });
    });
    return result;
  }

  const cart = readCart();

  function totals() {
    return Array.from(cart.values()).reduce((result, item) => {
      const variant = variantById(productById(item.product), item.variant);
      result.quantity += item.quantity;
      result.price += variant.price * item.quantity;
      return result;
    }, { quantity: 0, price: 0 });
  }

  function forgetConfirmation() {
    $status.stop(true, true).empty().removeClass('alert alert-success is-success is-error').show();
  }

  function saveCart() {
    if (!B.safeWrite(STORAGE_KEY, Array.from(cart.values()))) {
      $storageNotice.text('Браузер не разрешил сохранение: корзина работает до закрытия этой страницы.').removeClass('d-none');
    }
  }

  // Keep the original section layout, but remove unverified health/discount claims.
  const $basics = $('#nutrition-basics-section');
  $basics.children('h2').text('Как выбрать товары фитнес-бара');
  $basics.children('.page-intro').text('Сравните категории, фасовки и стоимость. Выбранные упаковки попадут в корзину, где можно изменить количество и проверить общую сумму.');
  const $table = $('#nutrition-kbzhu-table');
  $table.find('caption').text('На что обратить внимание при выборе');
  const headings = ['Категория', 'Что сравнить', 'Фасовка', 'Пожелания'];
  $table.find('thead th').each(function (index) { $(this).text(headings[index]); });
  const comparisons = [
    ['Порошковые продукты', 'Название и состав на упаковке', 'Вес в граммах', 'Предпочтения по вкусу'],
    ['Капсулы', 'Название и маркировка', 'Количество в упаковке', 'Уточнения о товаре'],
    ['Напитки', 'Название и объём', 'Объём в миллилитрах', 'Количество упаковок']
  ];
  $table.find('tbody').empty();
  comparisons.forEach(row => {
    const $row = element('tr');
    row.forEach((value, index) => $row.append(element(index === 0 ? 'th' : 'td', '', value).attr(index === 0 ? { scope: 'row' } : {})));
    $table.find('tbody').append($row);
  });
  $basics.find('.col-md-8 p').eq(0).text('Цена относится к выбранной фасовке, а количество в корзине — к числу упаковок.');
  $basics.find('.col-md-8 p').eq(1).text('Фотографии иллюстрируют категории. Данные каталога учебные; наличие и состав реального товара нужно уточнять в клубе.');
  $section.children('p').first().text('Выберите категорию и фасовку. Цены и варианты используются для демонстрации каталога, реальные покупки здесь не оформляются.');
  $('#promo-banner-wrapper').empty().append(element('p', 'm-0', 'Один товар в разных фасовках — отдельные позиции корзины. Все суммы пересчитываются автоматически.'));
  const $promo = $('#nutrition-promo-alert');
  $promo.empty().append(
    element('strong', '', 'Фитнес-бар Bonanza Gym. '),
    element('span', '', 'Соберите свой список товаров и сравните итоговую стоимость. '),
    element('a', 'alert-link ms-2', 'Перейти к каталогу →').attr('href', '#supplements-section'),
    button('', 'btn-close').attr({ 'data-bs-dismiss': 'alert', 'aria-label': 'Закрыть уведомление' })
  );

  // Filters are linked: one predicate combines category and text, then sorting.
  const $filters = element('div', 'p-3 bg-light rounded-3 border mb-3');
  const $filterRow = element('div', 'row g-3 align-items-end').appendTo($filters);
  function filterControl(id, title, $control, classes) {
    const $wrap = element('div', classes).appendTo($filterRow);
    element('label', 'form-label small mb-1', title).attr('for', id).appendTo($wrap);
    $control.attr('id', id).appendTo($wrap);
    return $control;
  }
  const $search = filterControl('nutrition-search', 'Поиск', element('input', 'form-control').attr({ type: 'search', placeholder: 'Название товара', maxlength: '80' }), 'col-12 col-md-4');
  const $category = filterControl('nutrition-category', 'Категория', element('select', 'form-select'), 'col-12 col-sm-6 col-md-4');
  [['all', 'Все товары'], ['protein', 'Протеин и аминокислоты'], ['power', 'Креатин и комплексы'], ['other', 'Витамины и напитки']].forEach(([value, label]) => $category.append(element('option', '', label).val(value)));
  const $sort = filterControl('nutrition-sort', 'Сортировка', element('select', 'form-select'), 'col-12 col-sm-6 col-md-4');
  [['default', 'Порядок каталога'], ['price-up', 'Базовая цена: по возрастанию'], ['price-down', 'Базовая цена: по убыванию'], ['name', 'По названию']].forEach(([value, label]) => $sort.append(element('option', '', label).val(value)));
  const $filterFooter = element('div', 'd-flex flex-wrap justify-content-between gap-2 align-items-center mt-3').appendTo($filters);
  const $count = element('p', 'small text-muted mb-0').attr({ id: 'nutrition-result-count', role: 'status' }).appendTo($filterFooter);
  const $resetFilters = button('Сбросить фильтры', 'btn btn-outline-secondary btn-sm').attr('id', 'nutrition-filter-reset').appendTo($filterFooter);
  $filters.insertBefore($cards);
  const $catalogStatus = element('p', 'small text-success mb-3').attr({ id: 'nutrition-catalog-status', role: 'status', 'aria-live': 'polite' }).insertAfter($filters);

  function filteredProducts() {
    const query = String($search.val()).trim().toLocaleLowerCase('ru');
    const category = $category.val();
    const items = PRODUCTS.filter(product => (category === 'all' || product.category === category) && product.name.toLocaleLowerCase('ru').includes(query));
    if ($sort.val() === 'price-up') items.sort((a, b) => a.price - b.price);
    if ($sort.val() === 'price-down') items.sort((a, b) => b.price - a.price);
    if ($sort.val() === 'name') items.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    return items;
  }

  function createProductCard(product) {
    const variant = variantById(product, selectedVariants.get(product.id)) || product.variants[0];
    const $column = element('div', 'col-12 col-md-6 col-lg-4');
    const $card = element('article', 'card-custom p-3 rounded-3 bg-light h-100 d-flex flex-column gap-2').attr('data-product-id', product.id).appendTo($column);
    element('img', 'img-fluid rounded mb-2 card-img-custom').attr({ src: product.image, alt: product.name, loading: 'lazy' }).appendTo($card);
    element('h3', 'h5 fw-bold mb-0', product.name).appendTo($card);
    element('p', 'small text-muted mb-1', product.description).appendTo($card);
    const $choice = element('div', 'mt-auto').appendTo($card);
    element('label', 'form-label small mb-1', 'Фасовка').attr('for', 'variant-' + product.id).appendTo($choice);
    const $variant = element('select', 'form-select form-select-sm product-variant').attr('id', 'variant-' + product.id).appendTo($choice);
    product.variants.forEach(item => $variant.append(element('option', '', item.label + ' — ' + B.money(item.price)).val(item.id)));
    $variant.val(variant.id);
    element('p', 'h5 fw-bold mb-1 mt-2 product-price', B.money(variant.price)).appendTo($card);
    button('В корзину', 'btn btn-primary btn-sm fw-bold w-100 py-2 btn-add-to-cart').attr('aria-label', 'Добавить: ' + product.name + ', ' + variant.label).appendTo($card);
    element('p', 'small text-success mb-0 product-cart-state').attr('aria-live', 'polite').appendTo($card);
    return $column;
  }

  function updateCardStates() {
    $cards.find('[data-product-id]').each(function () {
      const $card = $(this);
      const key = cartKey($card.attr('data-product-id'), $card.find('.product-variant').val());
      const item = cart.get(key);
      $card.toggleClass('is-selected', Boolean(item));
      $card.find('.product-cart-state').text(item ? 'Эта фасовка в корзине: ' + item.quantity + ' уп.' : '');
      $card.find('.btn-add-to-cart').text(item ? 'Добавить ещё' : 'В корзину').prop('disabled', Boolean(item && item.quantity >= MAX_QUANTITY));
    });
  }

  function renderCatalog() {
    const items = filteredProducts();
    $cards.empty();
    items.forEach(product => $cards.append(createProductCard(product)));
    if (items.length === 0) {
      const $empty = element('div', 'col-12 text-center py-4').appendTo($cards);
      element('p', 'fw-semibold mb-1', 'Товары не найдены').appendTo($empty);
      element('p', 'text-muted small mb-0', 'Попробуйте другое название или сбросьте фильтры.').appendTo($empty);
    }
    $count.text('Показано товаров: ' + items.length + ' из ' + PRODUCTS.length);
    updateCardStates();
  }

  // Embedded cart cannot cover Back to Top or the mobile navigation.
  const $cartSection = element('div', 'border rounded-3 p-3 mt-4 bg-light').attr('id', 'nutrition-cart').insertAfter($cards);
  const $cartHead = element('div', 'd-flex flex-wrap align-items-center justify-content-between gap-2').appendTo($cartSection);
  element('h3', 'h5 m-0', 'Корзина').appendTo($cartHead);
  const $cartToggle = button('Скрыть корзину', 'btn btn-outline-dark btn-sm').attr({ id: 'nutrition-cart-toggle', 'aria-controls': 'nutrition-cart-body', 'aria-expanded': 'true' }).appendTo($cartHead);
  const $cartStats = element('p', 'small text-muted mb-0 mt-2').attr({ id: 'nutrition-cart-total', 'aria-live': 'polite' }).appendTo($cartSection);
  const $cartBody = element('div', 'mt-3').attr('id', 'nutrition-cart-body').appendTo($cartSection);
  const $cartItems = element('div', 'd-flex flex-column gap-2').attr('id', 'nutrition-cart-items').appendTo($cartBody);
  const $cartActions = element('div', 'd-flex flex-wrap gap-2 mt-3').appendTo($cartBody);
  const $checkout = button('Перейти к заявке', 'btn btn-primary fw-semibold').attr('id', 'nutrition-checkout').appendTo($cartActions);
  const $clear = button('Очистить корзину', 'btn btn-outline-secondary').attr('id', 'nutrition-cart-clear').appendTo($cartActions);
  const $cartStatus = element('p', 'small mb-0 mt-2 text-success').attr({ id: 'nutrition-cart-status', role: 'status' }).appendTo($cartSection);
  const $storageNotice = element('p', 'small text-muted mt-2 mb-0 d-none').attr('role', 'status').appendTo($cartSection);

  function cartLine(item, key) {
    const product = productById(item.product);
    const variant = variantById(product, item.variant);
    const $line = element('div', 'border rounded bg-white p-3').attr('data-cart-key', key);
    const $top = element('div', 'd-flex flex-wrap justify-content-between gap-2').appendTo($line);
    element('strong', 'small', product.name + ' · ' + variant.label).appendTo($top);
    element('span', 'fw-bold', B.money(variant.price * item.quantity)).appendTo($top);
    const $bottom = element('div', 'd-flex flex-wrap align-items-center justify-content-between gap-2 mt-2').appendTo($line);
    element('span', 'text-muted small', B.money(variant.price) + ' за упаковку').appendTo($bottom);
    const $controls = element('div', 'd-flex gap-2 align-items-center').appendTo($bottom);
    button('−', 'btn btn-outline-secondary btn-sm').attr({ 'data-cart-action': 'minus', 'aria-label': 'Уменьшить количество: ' + product.name + ', ' + variant.label }).appendTo($controls);
    element('span', 'small fw-bold', String(item.quantity)).attr('aria-label', 'Упаковок: ' + item.quantity).appendTo($controls);
    button('+', 'btn btn-outline-secondary btn-sm').attr({ 'data-cart-action': 'plus', 'aria-label': 'Увеличить количество: ' + product.name + ', ' + variant.label }).prop('disabled', item.quantity >= MAX_QUANTITY).appendTo($controls);
    button('Удалить', 'btn btn-outline-danger btn-sm').attr({ 'data-cart-action': 'remove', 'aria-label': 'Удалить: ' + product.name + ', ' + variant.label }).appendTo($controls);
    return $line;
  }

  function renderCart(focusKey, focusAction) {
    const sum = totals();
    $cartItems.empty();
    cart.forEach((item, key) => $cartItems.append(cartLine(item, key)));
    if (cart.size === 0) {
      element('p', 'text-muted text-center mb-0 py-3', 'Корзина пуста. Выберите товар и фасовку в каталоге.').appendTo($cartItems);
    }
    $cartStats.text(sum.quantity + ' уп. · ' + B.money(sum.price) + ' · до ' + MAX_QUANTITY + ' упаковок каждой фасовки');
    // .prop() changes the current boolean state, unlike a textual HTML attribute.
    $checkout.prop('disabled', cart.size === 0);
    $clear.prop('disabled', cart.size === 0);
    updateCardStates();
    updateFormSummary();
    if (focusKey) {
      const $sameRow = $cartItems.children().filter(function () { return $(this).attr('data-cart-key') === focusKey; });
      let $nextFocus = $sameRow.find('[data-cart-action="' + focusAction + '"]:not(:disabled)');
      if (!$nextFocus.length) $nextFocus = $sameRow.find('button:not(:disabled)').first();
      if (!$nextFocus.length) $nextFocus = $cartItems.find('button:not(:disabled)').first();
      ($nextFocus.length ? $nextFocus : $cartToggle).trigger('focus');
    }
  }

  // Extend the existing form entirely via DOM. Native required/type attributes remain.
  $form.attr('novalidate', 'novalidate');
  $('#nutrition-consult-section').children('h2').text('Заявка на товары или консультацию');
  $('#nutrition-consult-section').children('p').first().text('Проверьте выбор и заполните форму. Это учебная демонстрация: сведения не отправляются на сервер, заказ и консультация не создаются.');
  $question.attr('placeholder', 'Пожелания к заказу или вопрос о товарах — от 10 символов');
  const $formRow = $form.children('.row').first();
  const $kindCol = element('div', 'col-12').prependTo($formRow);
  element('label', 'form-label fw-bold', 'Тип заявки').attr('for', 'nutri-request-kind').appendTo($kindCol);
  const $kind = element('select', 'form-select').attr({ id: 'nutri-request-kind', name: 'request_kind', required: 'required' }).appendTo($kindCol);
  $kind.append(element('option', '', 'Консультация по товарам').val('consultation'), element('option', '', 'Товары из корзины').val('order'));
  const $productCol = $product.closest('.col-12');
  $productCol.find('label').text('Тема консультации');
  $product.empty().prop('required', true).append(element('option', '', 'Общий вопрос по ассортименту').val('general'));
  PRODUCTS.forEach(product => $product.append(element('option', '', product.name).val(product.id)));
  const $formSummary = element('div', 'col-12').prependTo($formRow);
  const $liveSummary = element('p', 'result-panel p-3 rounded mb-0 small').attr({ id: 'nutri-live-summary', 'aria-live': 'polite' }).appendTo($formSummary);
  const $characterCount = element('p', 'small text-muted mt-1 mb-0').attr('id', 'nutri-character-count').insertAfter($question);
  const $formReset = button('Очистить форму', 'btn btn-outline-secondary mt-2 mt-sm-0 ms-sm-2').attr({ id: 'nutri-reset-btn', type: 'reset' }).insertAfter($submit);

  function updateFormSummary() {
    if (typeof $kind === 'undefined') return;
    const sum = totals();
    const order = $kind.val() === 'order';
    const product = productById($product.val());
    $liveSummary.text(order ? ('Товары из корзины: ' + sum.quantity + ' уп. · ' + B.money(sum.price) + '. Самовывоз: фитнес-бар Bonanza Gym. Оплата не производится.') : ('Тема: ' + (product ? product.name : 'общий вопрос по ассортименту') + '. Демонстрационная консультация, без записи к специалисту.'));
  }

  function updateMode() {
    const order = $kind.val() === 'order';
    $productCol.toggleClass('d-none', order);
    $product.prop('disabled', order).prop('required', !order);
    B.clearError($product);
    B.clearError($kind);
    $submit.text(order ? 'Проверить заявку на товары' : 'Проверить заявку на консультацию');
    updateFormSummary();
  }

  function updateCounter() {
    $characterCount.text(String($question.val()).length + ' / 1000 символов · минимум 10');
  }

  function fieldMessage($field) {
    const id = $field.attr('id');
    const value = String($field.val() || '').trim();
    if (id === 'nutri-name' && !B.validName(value)) return 'Введите имя: от 2 до 80 символов, с буквами.';
    if (id === 'nutri-phone' && !B.validPhone(value)) return 'Введите телефон Казахстана: +7 (777) 000-00-00 или 8 777 000 00 00.';
    if (id === 'nutri-question' && (value.length < 10 || value.length > 1000)) return 'Напишите вопрос или пожелания: от 10 до 1000 символов без крайних пробелов.';
    if (id === 'nutri-request-kind' && value !== 'consultation' && value !== 'order') return 'Выберите тип заявки.';
    if (id === 'nutri-request-kind' && value === 'order' && cart.size === 0) return 'Добавьте товары в корзину или выберите консультацию.';
    if (id === 'nutri-product-select' && $kind.val() === 'consultation' && value !== 'general' && !productById(value)) return 'Выберите тему консультации из списка.';
    return '';
  }

  function validateField($field) {
    const message = fieldMessage($field);
    if (message) B.setError($field, message);
    else B.clearError($field);
    return message === '';
  }

  $search.on('input', renderCatalog);
  $category.add($sort).on('change', renderCatalog);
  $resetFilters.on('click', function () {
    $search.val('');
    $category.val('all');
    $sort.val('default');
    renderCatalog();
    $search.trigger('focus');
  });

  // Cards are recreated by filtering. Delegation keeps their handlers alive.
  $cards.on('change', '.product-variant', function () {
    const $card = $(this).closest('[data-product-id]');
    const product = productById($card.attr('data-product-id'));
    const variant = variantById(product, $(this).val());
    if (!variant) return;
    selectedVariants.set(product.id, variant.id);
    // find() locates this card's price; text() updates it; attr() adds spoken feedback.
    $card.find('.product-price').text(B.money(variant.price)).attr('aria-live', 'polite');
    $card.find('.btn-add-to-cart').attr('aria-label', 'Добавить: ' + product.name + ', ' + variant.label);
    updateCardStates();
  });
  $cards.on('click', '.btn-add-to-cart', function () {
    const $card = $(this).closest('[data-product-id]');
    const product = productById($card.attr('data-product-id'));
    const variant = variantById(product, $card.find('.product-variant').val());
    if (!variant) return;
    const key = cartKey(product.id, variant.id);
    const item = cart.get(key) || { product: product.id, variant: variant.id, quantity: 0 };
    if (item.quantity >= MAX_QUANTITY) {
      $catalogStatus.removeClass('text-success').addClass('text-danger').text('Уже добавлено ' + MAX_QUANTITY + ' упаковок этой фасовки.');
      return;
    }
    item.quantity += 1;
    cart.set(key, item);
    forgetConfirmation();
    saveCart();
    renderCart();
    if (formSubmitted) validateField($kind);
    $catalogStatus.removeClass('text-danger').addClass('text-success').text(product.name + ', ' + variant.label + ': в корзине ' + item.quantity + ' уп. Итого ' + B.money(totals().price) + '.');
    $cartStatus.text('Товар добавлен. Корзина находится под каталогом.');
  });

  // Cart rows are replaced after every operation; one delegated handler covers all.
  $cartItems.on('click', '[data-cart-action]', function () {
    const $row = $(this).closest('[data-cart-key]');
    const key = $row.attr('data-cart-key');
    const action = $(this).attr('data-cart-action');
    const item = cart.get(key);
    if (!item) return;
    if (action === 'remove' || (action === 'minus' && item.quantity === 1)) cart.delete(key);
    else if (action === 'minus') item.quantity -= 1;
    else if (action === 'plus' && item.quantity < MAX_QUANTITY) item.quantity += 1;
    forgetConfirmation();
    saveCart();
    renderCart(key, action);
    if (formSubmitted) validateField($kind);
    $cartStatus.text(cart.has(key) ? 'Количество обновлено. Итог: ' + B.money(totals().price) + '.' : 'Товар удалён. Итог: ' + B.money(totals().price) + '.');
    $catalogStatus.empty();
  });
  $clear.on('click', function () {
    cart.clear();
    forgetConfirmation();
    saveCart();
    renderCart();
    if (formSubmitted) validateField($kind);
    $cartStatus.text('Корзина очищена.');
    $catalogStatus.empty();
    $cartToggle.trigger('focus');
  });
  $cartToggle.on('click', function () {
    cartExpanded = !cartExpanded;
    $(this).attr('aria-expanded', String(cartExpanded)).text(cartExpanded ? 'Скрыть корзину' : 'Показать корзину');
    // Effect has a real purpose: collapse a potentially long order; stop queued clicks.
    $cartBody.stop(true, true).slideToggle(duration, function () {
      $cartToggle.attr('aria-expanded', String(cartExpanded));
    });
  });
  $checkout.on('click', function () {
    if (cart.size === 0) return;
    forgetConfirmation();
    $kind.val('order');
    updateMode();
    $name.trigger('focus');
  });
  $kind.on('change', function () { forgetConfirmation(); updateMode(); });
  $product.on('change', updateFormSummary);
  $question.on('input', updateCounter);
  $form.on('input change', 'input, select, textarea', function () {
    forgetConfirmation();
    if (formSubmitted || $(this).hasClass('is-invalid')) validateField($(this));
  });
  $form.on('reset', function () {
    B.resetErrors($form);
    formSubmitted = false;
    if (!completingRequest) forgetConfirmation();
    // The reset event precedes the browser's default values being restored.
    window.setTimeout(function () { updateMode(); updateCounter(); }, 0);
  });

  $form.on('submit', function (event) {
    // Without preventDefault the demo form would navigate / POST and lose the cart UI.
    event.preventDefault();
    forgetConfirmation();
    formSubmitted = true;
    B.resetErrors($form);
    const fields = [$kind, $name, $phone, $product, $question];
    let $firstInvalid = null;
    fields.forEach($field => {
      if ($field.prop('disabled')) return;
      if (!validateField($field) && !$firstInvalid) $firstInvalid = $field;
    });
    if ($firstInvalid) {
      $firstInvalid.trigger('focus');
      return;
    }

    const order = $kind.val() === 'order';
    const sum = totals();
    const chosen = productById($product.val());
    const reference = B.reference();
    $status.empty().addClass('alert alert-success').hide();
    element('h3', 'h5 mb-2', 'Демонстрационная заявка ' + reference).appendTo($status);
    element('p', 'mb-1', 'Имя: ' + String($name.val()).trim() + ' · телефон: ' + String($phone.val()).trim()).appendTo($status);
    element('p', 'mb-2', order ? 'Выбраны товары для самовывоза в фитнес-баре Bonanza Gym:' : 'Тема консультации: ' + (chosen ? chosen.name : 'общий вопрос по ассортименту') + '.').appendTo($status);
    if (order) {
      const $summaryList = element('ul', 'ps-3 mb-2').appendTo($status);
      cart.forEach(item => {
        const product = productById(item.product);
        const variant = variantById(product, item.variant);
        element('li', 'small', product.name + ' · ' + variant.label + ' · ' + item.quantity + ' × ' + B.money(variant.price) + ' = ' + B.money(item.quantity * variant.price)).appendTo($summaryList);
      });
      element('p', 'fw-bold mb-2', 'Итого: ' + sum.quantity + ' уп. · ' + B.money(sum.price)).appendTo($status);
    }
    element('p', 'small mb-2 text-break', 'Комментарий: ' + String($question.val()).trim()).appendTo($status);
    element('p', 'small mb-0 border-top pt-2', 'Данные не отправлены на сервер. Реальный заказ, запись на консультацию и оплата не созданы. Контактные данные не сохраняются в браузере.').appendTo($status);
    if (order) {
      cart.clear();
      saveCart();
      renderCart();
      $cartStatus.text('Демонстрация завершена: корзина очищена, список товаров указан в результате ниже.');
      $catalogStatus.empty();
    }
    completingRequest = true;
    $form.trigger('reset');
    completingRequest = false;
    // Fade in the completed summary; focus moves only after the reveal has finished.
    $status.fadeIn(duration, function () { $(this).trigger('focus'); });
  });

  renderCatalog();
  updateMode();
  updateCounter();
  renderCart();
});
