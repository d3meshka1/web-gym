'use strict';
/* Shared source of truth. No server, real reservations or payments.
   jQuery 3.7.1 FULL loads first (effects are absent from the slim build).
   Active handlers use .on(); previous vanilla versions are in old-js/. */
window.Bonanza = (() => {
  const tariffs = Object.freeze([
    { id: 'gym_day', name: 'Дневной стандарт', price: 11000, period: '1 месяц', months: 1, category: 'gym', start: '08:00', end: '15:00', details: 'Посещение с 08:00 до 15:00; тренажёрный зал и душ.' },
    { id: 'gym_evening', name: 'Вечерний стандарт', price: 13000, period: '1 месяц', months: 1, category: 'gym', start: '15:00', end: '23:00', sundayEnd: '21:00', details: 'С 15:00 до 23:00, по воскресеньям до 21:00; тренажёрный зал и душ.' },
    { id: 'student', name: 'Студенческий', price: 10000, period: '1 месяц', months: 1, category: 'gym', start: '07:00', end: '23:00', minAge: 16, details: 'С 16 лет, при подтверждении статуса учащегося. Посещение в часы работы клуба.' },
    { id: 'quarter', name: 'Безлимитный квартал', price: 40000, period: '3 месяца', months: 3, category: 'gym', start: '07:00', end: '23:00', details: 'Полный доступ к залу; 14 дней заморозки. Групповые занятия оплачиваются отдельно.' },
    { id: 'half_year', name: 'Безлимит на полгода', price: 80000, period: '6 месяцев', months: 6, category: 'gym', start: '07:00', end: '23:00', details: 'Полный доступ к залу; 30 дней заморозки. Групповые занятия оплачиваются отдельно.' },
    { id: 'personal', name: 'Пакет с персональным тренером', price: 46000, period: '12 занятий', months: null, category: 'trainer', start: '07:00', end: '23:00', details: '12 персональных занятий по 60 минут для одного человека. В форме выбирается первый визит.' },
    { id: 'single_day', name: 'Разовое посещение до 15:00', price: 2000, period: '1 день', months: null, category: 'single', start: '08:00', end: '15:00', details: 'Один визит с 08:00 до 15:00; тренажёрный зал и душ.' },
    { id: 'single_evening', name: 'Разовое посещение после 15:00', price: 3000, period: '1 день', months: null, category: 'single', start: '15:00', end: '23:00', sundayEnd: '21:00', details: 'Один визит с 15:00 до 23:00, в воскресенье до 21:00.' }
  ].map(Object.freeze));
  const trainers = Object.freeze([
    { id: 'sokolovsky', name: 'Соколовский Андрей', spec: 'Силовой тренинг', days: [1, 3, 5], start: '09:00', end: '21:00', slots: 2, schedule: 'Пн, Ср, Пт · 09:00–21:00' },
    { id: 'mosoyan', name: 'Мосоян Злата', spec: 'Групповые программы', days: [2, 4, 6], start: '10:00', end: '20:00', slots: 4, schedule: 'Вт, Чт, Сб · 10:00–20:00' },
    { id: 'ahmetov', name: 'Кайрат Ахметов', spec: 'Тяжёлая атлетика', days: [1, 2, 4], start: '10:00', end: '22:00', slots: 1, schedule: 'Пн, Вт, Чт · 10:00–22:00' },
    { id: 'ospanova', name: 'Диана Оспанова', spec: 'Стретчинг и фитнес', days: [3, 5, 6], start: '08:00', end: '16:00', slots: 5, schedule: 'Ср, Пт, Сб · 08:00–16:00' },
    { id: 'aliev', name: 'Руслан Алиев', spec: 'Функциональные тренировки', days: [0, 1, 2, 3, 4, 5, 6], start: '12:00', end: '20:00', slots: 3, schedule: 'Ежедневно · 12:00–20:00' },
    { id: 'zhumagali', name: 'Арман Жумагалиев', spec: 'Бокс и кардио', days: [1, 3, 5], start: '15:00', end: '22:00', slots: 2, schedule: 'Пн, Ср, Пт · 15:00–22:00' }
  ].map(Object.freeze));
  // Class.day: Monday=0; trainer.days: Date.getDay(), Sunday=0.
  const classes = Object.freeze([
    { id: 'yoga-tue', day: 1, time: '10:00', name: 'Йога и стретчинг', category: 'mindbody', trainerId: 'mosoyan', spots: 4, capacity: 10, room: 'Зал групповых программ' },
    { id: 'power-mon', day: 0, time: '09:30', name: 'Функциональный тренинг', category: 'power', trainerId: 'sokolovsky', spots: 2, capacity: 8, room: 'Кроссфит-зона' },
    { id: 'power-wed', day: 2, time: '18:00', name: 'Тяжёлая атлетика', category: 'power', trainerId: 'sokolovsky', spots: 0, capacity: 8, room: 'Соревновательный зал' },
    { id: 'cardio-thu', day: 3, time: '19:00', name: 'Интервальный кардио-комплекс', category: 'cardio', trainerId: 'mosoyan', spots: 4, capacity: 12, room: 'Кардиозона' },
    { id: 'yoga-sat', day: 5, time: '10:00', name: 'Йога и стретчинг', category: 'mindbody', trainerId: 'mosoyan', spots: 3, capacity: 10, room: 'Зал групповых программ' },
    { id: 'functional-fri', day: 4, time: '09:30', name: 'Функциональный тренинг', category: 'power', trainerId: 'sokolovsky', spots: 1, capacity: 8, room: 'Кроссфит-зона' },
    { id: 'cardio-tue', day: 1, time: '18:30', name: 'Кардио и выносливость', category: 'cardio', trainerId: 'mosoyan', spots: 0, capacity: 12, room: 'Кардиозона' },
    { id: 'strength-mon', day: 0, time: '18:00', name: 'Тяжёлая атлетика', category: 'power', trainerId: 'sokolovsky', spots: 2, capacity: 8, room: 'Соревновательный зал' }
  ].map(item => Object.freeze({ ...item, trainer: trainers.find(trainer => trainer.id === item.trainerId).name, price: 2500, duration: 60 })));
  const openingHours = Object.freeze({ start: '07:00', end: '23:00' });
  const get = id => document.getElementById(id);
  const money = number => `${Number(number).toLocaleString('ru-RU')} ₸`;
  const make = (tag, classes = '', text = '') => {
    const element = document.createElement(tag);
    element.className = classes;
    element.textContent = String(text);
    return element;
  };
  const node = (tag, classes, text, parent) => {
    const element = make(tag, classes, text);
    if (parent) parent.append(element);
    return element;
  };
  const select = (id, label, items, parent) => {
    const wrapper = node('div', 'col-12 col-md-auto', '', parent);
    node('label', 'form-label', label, wrapper).htmlFor = id;
    const field = node('select', 'form-select', '', wrapper);
    field.id = id;
    items.forEach(item => { node('option', '', item.label, field).value = item.value; });
    return field;
  };
  const button = (text, classes, parent) => {
    const result = node('button', classes, text, parent);
    result.type = 'button';
    return result;
  };
  const resetContent = element => element.replaceChildren();
  // Randomness is only for a temporary demo reference, never a real receipt ID.
  const reference = () => `DEMO-${Math.floor(100000 + Math.random() * 900000)}`;
  const today = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const validDate = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  };
  const dateLabel = value => validDate(value)
    ? new Date(`${value}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Дата не выбрана';
  const validName = value => {
    const clean = String(value || '').trim();
    return clean.length >= 2 && clean.length <= 80 && /^[\p{L}\p{M}]+(?:[\s’'\-][\p{L}\p{M}]+)*$/u.test(clean);
  };
  const validEmail = value => {
    const clean = String(value || '').trim();
    return clean.length <= 254 && /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(clean);
  };
  const validPhone = value => {
    const clean = String(value || '').trim();
    const validPrefix = !clean.startsWith('+') || clean.startsWith('+7');
    return validPrefix && /^\+?[\d\s()\-]+$/.test(clean) && /^[78]\d{10}$/.test(clean.replace(/\D/g, ''));
  };
  const safeRead = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw && raw.length < 200000 ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  };
  const safeWrite = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  };
  const clearError = field => {
    const $field = window.jQuery(field);
    const id = $field.attr('id');
    if (!id) return;
    window.jQuery(`#${id}-error`).remove();
    $field.removeClass('is-invalid').removeAttr('aria-invalid');
    const descriptions = ($field.attr('aria-describedby') || '').split(/\s+/).filter(item => item && item !== `${id}-error`);
    if (descriptions.length) $field.attr('aria-describedby', descriptions.join(' '));
    else $field.removeAttr('aria-describedby');
  };
  const setError = (field, message) => {
    const $ = window.jQuery;
    const $field = $(field);
    clearError($field);
    const id = $field.attr('id');
    if (!id) return false;
    $field.addClass('is-invalid').attr('aria-invalid', 'true');
    const described = [$field.attr('aria-describedby'), `${id}-error`].filter(Boolean).join(' ');
    $field.attr('aria-describedby', described);
    const $error = $('<div>').attr({ id: `${id}-error`, role: 'alert' }).addClass('field-error-msg text-danger small mt-1').text(message);
    if ($field.is(':checkbox, :radio')) $field.closest('.form-check').append($error);
    else $field.after($error);
    return false;
  };
  const resetErrors = form => window.jQuery(form).find('input, select, textarea').each(function () { clearError(this); });
  const announce = (target, message, kind = 'info') => {
    const $target = window.jQuery(target);
    $target.removeClass('is-error is-success text-danger text-success text-muted alert-danger alert-success alert-info')
      .attr({ role: kind === 'error' ? 'alert' : 'status', 'aria-live': 'polite', 'aria-atomic': 'true' })
      .text(message);
    if (message) $target.addClass(kind === 'error' ? 'text-danger' : kind === 'success' ? 'text-success' : 'text-muted');
  };
  const status = (target, message, kind = 'success') => announce(target, message, kind);
  const bookingHref = params => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (['service', 'trainer', 'class', 'date'].includes(key) && value) query.set(key, value);
    });
    return `booking.html${query.size ? `?${query}` : ''}#booking-form-section`;
  };
  return Object.freeze({ tariffs, trainers, classes, openingHours, get, money, make, node, select, button,
    resetContent, reference, today, validDate, dateLabel, validName, validEmail, validPhone,
    safeRead, safeWrite, setError, clearError, resetErrors, announce, status, bookingHref });
})();

window.jQuery(function ($) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $main = $('main').first();
  $main.attr({ id: 'main-content', tabindex: '-1' });
  if (!$('#top').length) $('header').first().attr('id', 'top');
  if (!$('.skip-link').length) {
    $('<a>').addClass('skip-link').attr('href', '#main-content').text('Перейти к содержанию').prependTo('body');
  }
  const current = location.pathname.split('/').pop() || 'index.html';
  $('nav').attr('aria-label', 'Основная навигация');
  $('nav a').each(function () {
    const $link = $(this);
    if ($link.attr('href') === 'about.html') $link.attr('href', 'colophon.html');
    const active = $link.attr('href') === current;
    $link.toggleClass('is-active', active).toggleClass('active', active).addClass('fw-semibold py-2');
    if (active) $link.attr('aria-current', 'page');
    else $link.removeAttr('aria-current');
  });
  const $footer = $('body > footer');
  const $actions = $('<div>').addClass('d-flex flex-wrap justify-content-center align-items-center gap-3 mt-3').appendTo($footer);
  let $top = $('a[href="#top"]').first();
  if (!$top.length) $top = $('<a>').attr('href', '#top');
  $top.removeClass('back-to-top-btn rounded-circle').addClass('btn btn-outline-warning btn-sm').text('↑ Наверх').appendTo($actions);
  $('.quick-booking-btn').removeClass('quick-booking-btn').appendTo($actions);
  // .html() is appropriate ONLY for this trusted constant; user input uses .text().
  $('<p>').addClass('small text-white-50 mt-3 mb-0').html('<strong>Учебный проект.</strong> Формы не отправляют данные; реальные записи, заказы и платежи не создаются.').appendTo($footer);
  $('#promo-banner-wrapper p').text('Выберите подходящий тариф и время — стоимость будет показана до отправки формы.');
  $top.on('click', function (event) {
    event.preventDefault(); // Default hash jump would omit deliberate focus handling.
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' });
    $('header').attr('tabindex', '-1').trigger('focus');
  });
  $('.skip-link').on('click', function () { $main.trigger('focus'); });
});
