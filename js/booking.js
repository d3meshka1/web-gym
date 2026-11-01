'use strict';

(() => {
  const { tariffs, get, money, make, node, resetContent, reference } = window.Bonanza;

  // Массив из 6 тренеров (Требование Assignment 4-5)
  const TRAINERS = Object.freeze([
    { id: 'sokolovsky', name: 'Соколовский Андрей', spec: 'Силовой тренинг и набор массы', schedule: 'Пн, Ср, Пт (09:00–21:00)', slots: 2, price: 3500 },
    { id: 'mosoyan', name: 'Мосоян Злата', spec: 'Похудение и нутрициология', schedule: 'Вт, Чт, Сб (10:00–20:00)', slots: 4, price: 3000 },
    { id: 'ahmetov', name: 'Кайрат Ахметов', spec: 'Тяжелая атлетика', schedule: 'Пн, Вт, Чт (10:00–22:00)', slots: 1, price: 4000 },
    { id: 'ospanova', name: 'Диана Оспанова', spec: 'Стретчинг и фитнес', schedule: 'Ср, Пт, Сб (08:00–16:00)', slots: 5, price: 3000 },
    { id: 'aliev', name: 'Руслан Алиев', spec: 'Кроссфит и реабилитация', schedule: 'Ежедневно (12:00–20:00)', slots: 3, price: 3500 },
    { id: 'zhumagali', name: 'Арман Жумагалиев', spec: 'Бокс и кардио', schedule: 'Пн, Ср, Пт (15:00–22:00)', slots: 2, price: 4500 }
  ]);

  // Функция 1: Поиск тренера по ID (с параметром и возвращаемым значением)
  function getTrainerById(trainerId) {
    return TRAINERS.find(t => t.id === trainerId) || null;
  }

  // Функция 2: Валидация формата телефона через Regex
  function isValidPhone(phone) {
    if (!phone) return false;
    return /^\+?[0-9\s\-\(\)]{10,18}$/.test(phone.trim());
  }

  // Функция 3: Валидация даты (запрет прошедших дат)
  function isFutureDate(dateStr) {
    if (!dateStr) return false;
    const selected = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selected >= today;
  }

  // Отрисовка ошибки под полем
  function showError(input, message) {
    input.classList.add('is-invalid');
    const err = make('div', 'field-error-msg text-danger small mt-1', message);
    input.parentNode.appendChild(err);
  }

  // Функция 4: Вспомогательная проверка поля (вызывает внутри другую функцию showError)
  function validateField(inputElement, checkCondition, errorMessage) {
    if (!checkCondition) {
      showError(inputElement, errorMessage);
      return false;
    }
    return true;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const bookingForm = get('booking-form');
    const statusArea = get('booking-form-status');
    const trainerSelect = get('trainer-select');
    const membershipSelect = get('membership-type');
    const radioTrainer = get('visit-trainer');
    const radioSolo = get('visit-solo');
    const trainerContainer = document.querySelector('.trainer-select-container');

    if (!bookingForm || !statusArea) return;

    // Наполнение списка тарифов из общего массива
    if (membershipSelect) {
      resetContent(membershipSelect);
      const defaultOpt = node('option', '', '-- Выберите направление / тариф --', membershipSelect);
      defaultOpt.value = '';
      defaultOpt.disabled = true;

      tariffs.forEach(t => {
        const opt = node('option', '', `${t.name} (${t.period}) — ${money(t.price)}`, membershipSelect);
        opt.value = t.id;
      });
    }

    // Наполнение списка тренеров из массива TRAINERS
    if (trainerSelect) {
      resetContent(trainerSelect);
      const defaultOpt = node('option', '', '-- Любой свободный тренер --', trainerSelect);
      defaultOpt.value = 'any';

      TRAINERS.forEach(t => {
        const opt = node('option', '', `${t.name} (${t.schedule}) — свободно: ${t.slots} мест`, trainerSelect);
        opt.value = t.id;
      });
    }

    // Считывание параметров из URL (интеграция со страницами Димы)
    const params = new URLSearchParams(window.location.search);
    const urlTariff = params.get('membership_type');
    const urlTrainer = params.get('trainer_select');
    const urlFormat = params.get('visit_format');

    if (urlTariff && membershipSelect) membershipSelect.value = urlTariff;
    if (urlTrainer && trainerSelect) {
      trainerSelect.value = urlTrainer;
      if (radioTrainer) radioTrainer.checked = true;
    }
    if (urlFormat === 'solo' && radioSolo) radioSolo.checked = true;

    // Переключение видимости выбора тренера
    const toggleTrainerField = () => {
      if (!trainerContainer) return;
      if (radioSolo && radioSolo.checked) {
        trainerContainer.classList.add('d-none');
      } else {
        trainerContainer.classList.remove('d-none');
      }
    };

    if (radioTrainer && radioSolo) {
      radioTrainer.addEventListener('change', toggleTrainerField);
      radioSolo.addEventListener('change', toggleTrainerField);
      toggleTrainerField();
    }

    // Обработка кликов по карточкам тренеров
    document.querySelectorAll('#trainers-section a[href="#booking-form-section"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.textContent.toLowerCase();
        if (radioTrainer) {
          radioTrainer.checked = true;
          toggleTrainerField();
        }
        if (trainerSelect) {
          if (text.includes('андрей')) trainerSelect.value = 'sokolovsky';
          if (text.includes('злат')) trainerSelect.value = 'mosoyan';
        }
      });
    });

    // Очистка старых сообщений об ошибках
    const clearErrors = () => {
      bookingForm.querySelectorAll('.field-error-msg').forEach(el => el.remove());
      bookingForm.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    };

    // Валидация и отправка формы
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearErrors();

      const fullnameInput = get('fullname');
      const emailInput = get('email');
      const phoneInput = get('phone');
      const dateInput = get('visit-date');
      const timeInput = get('visit-time');
      const agreementInput = get('agreement');

      let isValid = true;
      let firstInvalid = null;

      // Применение универсальной функции валидации
      const isNameValid = validateField(fullnameInput, fullnameInput.value.trim().length >= 3, 'Укажите полное ФИО (не менее 3 символов)');
      if (!isNameValid && !firstInvalid) firstInvalid = fullnameInput;

      const isEmailValid = validateField(emailInput, emailInput.value.trim().includes('@'), 'Введите корректный e-mail');
      if (!isEmailValid && !firstInvalid) firstInvalid = emailInput;

      const isPhoneValid = validateField(phoneInput, isValidPhone(phoneInput.value), 'Введите телефон в формате +7 (777) 000-00-00');
      if (!isPhoneValid && !firstInvalid) firstInvalid = phoneInput;

      const isDateValid = validateField(dateInput, isFutureDate(dateInput.value), 'Выберите сегодняшнюю или будущую дату');
      if (!isDateValid && !firstInvalid) firstInvalid = dateInput;

      const isTimeValid = validateField(timeInput, Boolean(timeInput.value), 'Укажите время визита');
      if (!isTimeValid && !firstInvalid) firstInvalid = timeInput;

      const isTariffValid = validateField(membershipSelect, Boolean(membershipSelect.value), 'Выберите направление или тариф');
      if (!isTariffValid && !firstInvalid) firstInvalid = membershipSelect;

      const isAgreementValid = validateField(agreementInput, agreementInput.checked, 'Подтвердите согласие на обработку данных');
      if (!isAgreementValid && !firstInvalid) firstInvalid = agreementInput;

      isValid = isNameValid && isEmailValid && isPhoneValid && isDateValid && isTimeValid && isTariffValid && isAgreementValid;

      if (!isValid) {
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // Безопасное формирование ответа без innerHTML
      const isSolo = radioSolo && radioSolo.checked;
      const selectedTrainerObj = getTrainerById(trainerSelect ? trainerSelect.value : 'any');
      const trainerName = isSolo ? 'Самостоятельная тренировка' : (selectedTrainerObj ? selectedTrainerObj.name : 'Любой свободный тренер');

      const chosenTariff = tariffs.find(t => t.id === membershipSelect.value);
      const tariffName = chosenTariff ? `${chosenTariff.name} (${money(chosenTariff.price)})` : 'Визит в зал';
      const code = reference();

      resetContent(statusArea);
      statusArea.className = 'status-message alert alert-success mt-4 p-4 rounded-3 shadow-sm';

      node('h4', 'alert-heading h5 fw-bold mb-2', `✅ Заявка ${code} успешно забронирована!`, statusArea);
      node('p', 'mb-2', `Уважаемый(ая) ${fullnameInput.value.trim()}, ваш визит зафиксирован в системе.`, statusArea);

      const ul = node('ul', 'mb-3 ps-3 small', '', statusArea);
      node('li', '', `Дата и время: ${dateInput.value} в ${timeInput.value}`, ul);
      node('li', '', `Формат: ${trainerName}`, ul);
      node('li', '', `Выбранный тариф: ${tariffName}`, ul);
      node('li', '', `Телефон для связи: ${phoneInput.value.trim()}`, ul);

      node('p', 'small text-muted mb-0 border-top pt-2 mt-2', 'ℹ️ Демонстрационная запись. Данные не отправляются на сервер, оплата не взимается.', statusArea);

      bookingForm.reset();
      toggleTrainerField();
    });
  });
})();