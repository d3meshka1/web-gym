'use strict';
// Shared data & reusable DOM helpers for Bonanza Gym.
// Prices match the services.html Midterm price list.
window.Bonanza = (() => {
  const tariffs = Object.freeze([
    { id: 'gym_day', name: 'Дневной стандарт', price: 11000, period: '1 месяц', months: 1, category: 'gym' },
    { id: 'gym_evening', name: 'Вечерний стандарт', price: 13000, period: '1 месяц', months: 1, category: 'gym' },
    { id: 'student', name: 'Студентам и школьникам (до 16 лет)', price: 10000, period: '1 месяц', months: 1, category: 'gym' },
    { id: 'quarter', name: 'Безлимитный квартал', price: 40000, period: '3 месяца', months: 3, category: 'gym' },
    { id: 'half_year', name: 'Безлимит на полгода', price: 80000, period: '6 месяцев', months: 6, category: 'gym' },
    { id: 'personal', name: 'Пакет с персональным тренером', price: 46000, period: '12 занятий', months: null, category: 'trainer' },
    { id: 'single_day', name: 'Разовое посещение до 15:00', price: 2000, period: '1 день', months: null, category: 'single' },
    { id: 'single_evening', name: 'Разовое посещение после 15:00', price: 3000, period: '1 день', months: null, category: 'single' }
  ]);
  const get = (id) => document.getElementById(id);
  const money = (number) => `${Number(number).toLocaleString('ru-RU')} ₸`;
  const make = (tag, classes = '', text = '') => {
    const node = document.createElement(tag);
    if (classes) node.className = classes;
    if (text) node.textContent = text;
    return node;
  };
  const node = (tag, classes, text, parent) => {
    const result = make(tag, classes, text);
    if (parent) parent.append(result);
    return result;
  };
  const select = (id, labelText, items, parent) => {
    const wrap = node('div', 'col-12 col-md-auto', '', parent);
    const label = node('label', 'form-label fw-semibold', labelText, wrap);
    const field = node('select', 'form-select', '', wrap);
    field.id = id;
    label.htmlFor = id;
    items.forEach(({ value, label: title }) => {
      const option = node('option', '', title, field);
      option.value = value;
    });
    return field;
  };
  const button = (text, classes, parent) => {
    const element = node('button', classes, text, parent);
    element.type = 'button';
    return element;
  };
  const status = (target, message, kind = 'success') => {
    if (!target) return;
    target.textContent = message;
    target.classList.remove('is-error', 'is-success', 'text-danger', 'text-success');
    target.classList.add(kind === 'error' ? 'text-danger' : 'text-success');
  };
  const resetContent = (element) => element.replaceChildren();
  // A reference number for a demo, not a real receipt or confirmed booking.
  const reference = () => `DEMO-${Math.floor(100000 + Math.random() * 900000)}`;
  return { tariffs, get, money, make, node, select, button, status, resetContent, reference };
})();
