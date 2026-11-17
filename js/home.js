'use strict';

/* Homepage tariff preview. Reviews live on reviews.html and js/reviews.js. */
$(function () {
  const B = window.Bonanza;
  const $welcome = $('#welcome');
  if (!B || !$welcome.length) return;
  const create = (tag, classes = '', text = '') => $('<' + tag + '>').addClass(classes).text(text);

  // One-person preview uses the same tariff objects as the price list and booking.
  const $calculator = create('section', 'rounded-3 border bg-white p-3 p-md-4 mb-4 compact-calc')
    .attr({ id: 'home-calculator', 'aria-labelledby': 'home-calculator-title' });
  const $heading = create('div', 'd-flex flex-wrap justify-content-between align-items-center gap-2 mb-3');
  const $headingText = create('div');
  $headingText.append(create('h2', 'h5 fw-bold mb-1', 'Подберите абонемент').attr('id', 'home-calculator-title'));
  $headingText.append(create('p', 'small text-muted mb-0', 'Стоимость для одного человека, без дополнительных услуг.'));
  $heading.append($headingText, create('a', 'btn btn-outline-dark btn-sm', 'Сравнить условия').attr('href', 'services.html#price-list'));
  const $previewRow = create('div', 'row g-3 align-items-end');
  const $planCol = create('div', 'col-12 col-md-6');
  $planCol.append(create('label', 'form-label', 'Тариф').attr('for', 'home-plan'));
  const $plan = create('select', 'form-select').attr('id', 'home-plan');
  B.tariffs.forEach((plan) => $plan.append(create('option', '', plan.name).val(plan.id)));
  $planCol.append($plan);
  const $priceCol = create('div', 'col-12 col-sm-6 col-md-3');
  const $price = create('output', 'h4 fw-bold d-block mb-1').attr({ id: 'home-price', 'aria-live': 'polite', for: 'home-plan' });
  const $period = create('p', 'small text-muted mb-0').attr('id', 'home-plan-period');
  $priceCol.append($price, $period);
  const $actionCol = create('div', 'col-12 col-sm-6 col-md-3');
  const $bookingLink = create('a', 'btn btn-primary fw-semibold w-100', 'Выбрать тариф').attr('id', 'home-plan-booking');
  $actionCol.append($bookingLink);
  $previewRow.append($planCol, $priceCol, $actionCol);
  $calculator.append($heading, $previewRow).insertAfter($welcome);

  function updatePreview() {
    const selected = B.tariffs.find((plan) => plan.id === $plan.val());
    if (!selected) return;
    $price.text(B.money(selected.price));
    $period.text(selected.period);
    $bookingLink.attr('href', 'booking.html?service=' + encodeURIComponent(selected.id) + '#booking-form-section');
  }
  $plan.on('change', updatePreview);
  updatePreview();
});
