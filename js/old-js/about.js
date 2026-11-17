'use strict';

(() => {
  const { get, make, node, resetContent, reference } = window.Bonanza;

  // Массив из 6 частых вопросов (Требование Assignment 4-5)
  const FAQS = Object.freeze([
    { id: 'first_visit', question: 'Что взять с собой на первую тренировку?', answer: 'Удостоверение личности для пропуска, удобную спортивную форму, сменную обувь и бутылку воды. Полотенце выдается на рецепции.', category: 'rules' },
    { id: 'parking_sauna', question: 'Есть ли у вас сауна и парковка?', answer: 'Да, для всех посетителей доступна бесплатная подземная парковка на 2 часа и финская кедровая сауна в раздевалках.', category: 'services' },
    { id: 'freeze', question: 'Можно ли заморозить абонемент?', answer: 'Абонементы от 3 месяцев включают бесплатную заморозку до 14 дней. Заявку можно оформить у администратора.', category: 'membership' },
    { id: 'age_limit', question: 'С какого возраста можно посещать зал?', answer: 'Самостоятельные посещения разрешены с 16 лет. С 12 до 15 лет занятия возможны строго в сопровождении персонального тренера.', category: 'rules' },
    { id: 'lockers', question: 'Предоставляются ли персональные шкафчики?', answer: 'Да, в раздевалках установлены индивидуальные шкафчики с электронными замками-браслетами.', category: 'services' },
    { id: 'trial', question: 'Как проходит первая бесплатная вводная тренировка?', answer: 'Тренер проводит инструктаж по технике безопасности, определяет ваши цели и помогает составить базовую программу.', category: 'membership' }
  ]);

  // Функция 1: Валидация телефона
  function isValidPhone(phone) {
    if (!phone) return false;
    return /^\+?[0-9\s\-\(\)]{10,18}$/.test(phone.trim());
  }

  // Отрисовка ошибки
  function showError(inputElement, message) {
    inputElement.classList.add('is-invalid');
    const err = make('div', 'field-error-msg text-danger small mt-1', message);
    inputElement.parentNode.appendChild(err);
  }

  // Функция 2: Проверка поля (вызывает внутри showError)
  function validateField(inputElement, checkCondition, errorMessage) {
    if (!checkCondition) {
      showError(inputElement, errorMessage);
      return false;
    }
    return true;
  }

  // Функция 3: Фильтрация FAQ по категории и строке поиска
  function filterFaqs(category, searchQuery) {
    const query = searchQuery.trim().toLowerCase();
    return FAQS.filter(item => {
      const matchCategory = category === 'all' || item.category === category;
      const matchQuery = item.question.toLowerCase().includes(query) || item.answer.toLowerCase().includes(query);
      return matchCategory && matchQuery;
    });
  }

  // Функция 4: Генерация DOM-карточки вопроса
  function createFaqCard(item) {
    const col = make('div', 'col-12');
    const card = node('div', 'p-3 rounded border bg-light h-100', '', col);
    
    node('h3', 'h6 fw-bold text-dark mb-2', `❓ ${item.question}`, card);
    node('p', 'small text-muted m-0', item.answer, card);

    return col;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const cardsContainer = get('faq-cards-container');
    const contactForm = get('about-contact-form');
    const statusArea = get('about-form-status');

    // --- Интерактивный FAQ с поиском и фильтром ---
    if (cardsContainer) {
      const parentSection = cardsContainer.parentNode;

      const filterBox = make('div', 'p-3 bg-light rounded border mb-3');
      const filterRow = node('div', 'row g-2 align-items-end', '', filterBox);

      // Поиск по ключевым словам
      const searchCol = node('div', 'col-12 col-md-5', '', filterRow);
      node('label', 'form-label fw-bold small mb-1', 'Поиск по базе знаний:', searchCol);
      const searchInput = node('input', 'form-control form-control-sm', '', searchCol);
      searchInput.placeholder = 'Например: сауна, заморозка, сменка...';

      // Категория
      const catCol = node('div', 'col-12 col-md-4', '', filterRow);
      node('label', 'form-label fw-bold small mb-1', 'Категория:', catCol);
      const catSelect = node('select', 'form-select form-select-sm', '', catCol);
      node('option', '', 'Все темы', catSelect).value = 'all';
      node('option', '', 'Правила и визит', catSelect).value = 'rules';
      node('option', '', 'Удобства и сервис', catSelect).value = 'services';
      node('option', '', 'Абонементы', catSelect).value = 'membership';

      // Сброс
      const resetCol = node('div', 'col-12 col-md-3', '', filterRow);
      const resetBtn = node('button', 'btn btn-outline-secondary btn-sm w-100', 'Сбросить фильтры', resetCol);
      resetBtn.type = 'button';

      const counter = node('p', 'small text-muted mt-2 mb-0', '', filterBox);

      parentSection.insertBefore(filterBox, cardsContainer);

      const renderList = () => {
        resetContent(cardsContainer);
        const filtered = filterFaqs(catSelect.value, searchInput.value);

        if (!filtered.length) {
          const empty = node('div', 'col-12 text-center text-muted py-4 border rounded bg-white', 'Ответов по вашему запросу не найдено. Вы можете задать вопрос в форме ниже.');
          cardsContainer.appendChild(empty);
        } else {
          filtered.forEach(item => {
            cardsContainer.appendChild(createFaqCard(item));
          });
        }
        counter.textContent = `Найдено ответов: ${filtered.length} из ${FAQS.length}`;
      };

      searchInput.addEventListener('input', renderList);
      catSelect.addEventListener('change', renderList);
      resetBtn.addEventListener('click', () => {
        searchInput.value = '';
        catSelect.value = 'all';
        renderList();
      });

      renderList();
    }

    if (!contactForm || !statusArea) return;

    const clearErrors = () => {
      contactForm.querySelectorAll('.field-error-msg').forEach(el => el.remove());
      contactForm.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    };

    // Валидация формы обратной связи
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearErrors();

      const nameInput = get('about-name');
      const emailInput = get('about-email');
      const phoneInput = get('about-phone');
      const topicSelect = get('about-topic');
      const messageInput = get('about-message');

      let isValid = true;
      let firstInvalid = null;

      const isNameValid = validateField(nameInput, nameInput.value.trim().length >= 2, 'Укажите имя');
      if (!isNameValid && !firstInvalid) firstInvalid = nameInput;

      const isEmailValid = validateField(emailInput, emailInput.value.trim().includes('@'), 'Укажите e-mail');
      if (!isEmailValid && !firstInvalid) firstInvalid = emailInput;

      const isPhoneValid = validateField(phoneInput, isValidPhone(phoneInput.value), 'Формат: +7 (777) 000-00-00');
      if (!isPhoneValid && !firstInvalid) firstInvalid = phoneInput;

      const isTopicValid = validateField(topicSelect, Boolean(topicSelect.value), 'Выберите тему');
      if (!isTopicValid && !firstInvalid) firstInvalid = topicSelect;

      const isMessageValid = validateField(messageInput, messageInput.value.trim().length >= 10, 'Сообщение от 10 символов');
      if (!isMessageValid && !firstInvalid) firstInvalid = messageInput;

      isValid = isNameValid && isEmailValid && isPhoneValid && isTopicValid && isMessageValid;

      if (!isValid) {
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      const ticketCode = reference();
      resetContent(statusArea);
      statusArea.className = 'status-message alert alert-success mt-4 p-4 rounded-3 shadow-sm';

      node('h4', 'h6 fw-bold mb-2', `📨 Обращение ${ticketCode} отправлено!`, statusArea);
      node('p', 'mb-1 small', `Спасибо, ${nameInput.value.trim()}! Наш менеджер свяжется с вами по номеру ${phoneInput.value.trim()}.`, statusArea);
      node('p', 'small text-muted mb-0 mt-2 border-top pt-2', 'ℹ️ Демонстрационная форма. Данные не отправляются на сервер.', statusArea);

      contactForm.reset();
    });
  });
})();