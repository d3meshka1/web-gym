'use strict';

(() => {
  const { get, money, make, node, resetContent, reference } = window.Bonanza;

  // Массив из 6 продуктов с привязанными путями к картинкам
  const PRODUCTS = Object.freeze([
    { id: 'creatine', name: 'Креатин моногидрат', price: 8500, weight: '300 г', category: 'power', desc: 'Рост силовых показателей и гидратация мышечных клеток.', img: 'images/creatine-monohydrate.jpg' },
    { id: 'protein', name: 'Сывороточный протеин', price: 14500, weight: '900 г', category: 'protein', desc: 'Быстрый белок для восстановления мышц после тренировки.', img: 'images/protein.jpeg' },
    { id: 'vitamins', name: 'Комплекс Витамины & Омега-3', price: 6900, weight: '60 капсул', category: 'health', desc: 'Поддержка суставов, связок и иммунитета.', img: 'images/d3.jpg' },
    { id: 'bcaa', name: 'BCAA 2:1:1 Аминокислоты', price: 9200, weight: '400 г', category: 'protein', desc: 'Защита мышц от катаболизма во время сушки.', img: 'images/protein.jpeg' },
    { id: 'preworkout', name: 'Предтренировочный комплекс', price: 11000, weight: '300 г', category: 'power', desc: 'Энергия, выносливость и фокус на тяжелой тренировке.', img: 'images/creatine-monohydrate.jpg' },
    { id: 'isotonic', name: 'Изотоник Hydrate Bar', price: 4500, weight: '500 мл', category: 'health', desc: 'Быстрое восстановление водно-солевого баланса.', img: 'images/d3.jpg' }
  ]);

  const cart = new Map();

  function getProductById(productId) {
    return PRODUCTS.find(p => p.id === productId) || null;
  }

  function isValidPhone(phone) {
    if (!phone) return false;
    return /^\+?[0-9\s\-\(\)]{10,18}$/.test(phone.trim());
  }

  function showError(inputElement, message) {
    inputElement.classList.add('is-invalid');
    const err = make('div', 'field-error-msg text-danger small mt-1', message);
    inputElement.parentNode.appendChild(err);
  }

  function validateField(inputElement, checkCondition, errorMessage) {
    if (!checkCondition) {
      showError(inputElement, errorMessage);
      return false;
    }
    return true;
  }

  function filterProducts(category, searchQuery) {
    const query = searchQuery.trim().toLowerCase();
    return PRODUCTS.filter(p => {
      const matchCategory = category === 'all' || p.category === category;
      const matchQuery = p.name.toLowerCase().includes(query) || p.desc.toLowerCase().includes(query);
      return matchCategory && matchQuery;
    });
  }

  // Генерация карточки товара с изображением
  function createProductCard(product) {
    const col = make('div', 'col-12 col-md-6 col-lg-4');
    const card = node('div', 'card-custom p-4 rounded-3 bg-light text-center h-100 d-flex flex-column justify-content-between shadow-sm', '', col);
    const content = node('div', '', '', card);

    // Добавление изображения товара
    if (product.img) {
      const img = node('img', 'img-fluid rounded mb-3 zone-img', '', content);
      img.src = product.img;
      img.alt = product.name;
    }

    node('h3', 'h5 fw-bold mb-1', product.name, content);
    node('div', 'badge bg-warning text-dark fs-6 my-2 px-3 py-2', `${money(product.price)} / ${product.weight}`, content);
    node('p', 'small text-muted mb-3', product.desc, content);

    const addBtn = node('button', 'btn btn-dark btn-sm fw-bold w-100 py-2 btn-add-to-cart', '+ В корзину', card);
    addBtn.type = 'button';
    addBtn.dataset.productId = product.id;

    return col;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const supplementsSection = get('supplements-section');
    const nutriForm = get('nutrition-question-form');
    const statusArea = get('nutri-form-status');
    const productSelect = get('nutri-product-select');

    if (!supplementsSection) return;

    const cardsContainer = supplementsSection.querySelector('.row.g-3.my-2');

    // 1. Поиск и фильтрация
    if (cardsContainer) {
      const filterBox = make('div', 'p-3 bg-light rounded-3 border mb-3');
      const filterRow = node('div', 'row g-2 align-items-end', '', filterBox);

      const searchCol = node('div', 'col-12 col-md-5', '', filterRow);
      node('label', 'form-label fw-bold small mb-1', 'Поиск по магазину:', searchCol);
      const searchInput = node('input', 'form-control form-control-sm', '', searchCol);
      searchInput.placeholder = 'Например: протеин, креатин...';

      const catCol = node('div', 'col-12 col-md-4', '', filterRow);
      node('label', 'form-label fw-bold small mb-1', 'Категория:', catCol);
      const catSelect = node('select', 'form-select form-select-sm', '', catCol);
      node('option', '', 'Все добавки', catSelect).value = 'all';
      node('option', '', 'Сила и выносливость', catSelect).value = 'power';
      node('option', '', 'Протеин и аминокислоты', catSelect).value = 'protein';
      node('option', '', 'Здоровье и суставы', catSelect).value = 'health';

      const resetCol = node('div', 'col-12 col-md-3', '', filterRow);
      const resetBtn = node('button', 'btn btn-outline-secondary btn-sm w-100', 'Сбросить фильтры', resetCol);
      resetBtn.type = 'button';

      const resultCount = node('p', 'small text-muted mt-2 mb-0', '', filterBox);
      cardsContainer.parentNode.insertBefore(filterBox, cardsContainer);

      const renderCatalog = () => {
        resetContent(cardsContainer);
        const filteredList = filterProducts(catSelect.value, searchInput.value);

        if (filteredList.length === 0) {
          const emptyMsg = node('div', 'col-12 text-center text-muted py-4 border rounded bg-white', 'Ничего не найдено по вашему запросу.');
          cardsContainer.appendChild(emptyMsg);
        } else {
          filteredList.forEach(p => cardsContainer.appendChild(createProductCard(p)));
        }
        resultCount.textContent = `Показано товаров: ${filteredList.length} из ${PRODUCTS.length}`;
      };

      searchInput.addEventListener('input', renderCatalog);
      catSelect.addEventListener('change', renderCatalog);
      resetBtn.addEventListener('click', () => {
        searchInput.value = '';
        catSelect.value = 'all';
        renderCatalog();
      });

      renderCatalog();
    }

    // 2. Плавающая корзина (Offcanvas)
    const floatBtn = node('button', 'btn btn-warning position-fixed bottom-0 end-0 m-4 shadow-lg rounded-circle p-0 d-flex align-items-center justify-content-center text-dark', '', document.body);
    floatBtn.id = 'floating-cart-btn';
    floatBtn.type = 'button';
    floatBtn.style.width = '60px';
    floatBtn.style.height = '60px';
    floatBtn.style.zIndex = '1050';
    floatBtn.dataset.bsToggle = 'offcanvas';
    floatBtn.dataset.bsTarget = '#cartOffcanvas';

    const cartIcon = node('span', 'fs-4 position-relative', '🛒', floatBtn);
    const badge = node('span', 'position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger fs-6', '0', cartIcon);
    badge.id = 'cart-badge';

    const offcanvas = node('div', 'offcanvas offcanvas-end shadow-lg', '', document.body);
    offcanvas.id = 'cartOffcanvas';
    offcanvas.tabIndex = -1;

    const offHeader = node('div', 'offcanvas-header bg-dark text-white', '', offcanvas);
    node('h5', 'offcanvas-title fw-bold m-0', '🛒 Корзина товаров', offHeader);
    const closeBtn = node('button', 'btn-close btn-close-white', '', offHeader);
    closeBtn.type = 'button';
    closeBtn.dataset.bsDismiss = 'offcanvas';

    const offBody = node('div', 'offcanvas-body d-flex flex-column justify-content-between p-3', '', offcanvas);
    const cartItemsContainer = node('div', 'flex-grow-1 overflow-auto pe-1 mb-3', '', offBody);
    const cartFooterContainer = node('div', 'border-top pt-3', '', offBody);

    function renderCart() {
      const totalCount = [...cart.values()].reduce((sum, qty) => sum + qty, 0);
      
      badge.textContent = String(totalCount);
      if (totalCount > 0) {
        badge.classList.remove('d-none');
      } else {
        badge.classList.add('d-none');
      }

      resetContent(cartItemsContainer);
      resetContent(cartFooterContainer);

      if (cart.size === 0) {
        node('div', 'text-center text-muted py-5', '', cartItemsContainer);
        const emptyText = cartItemsContainer.querySelector('div');
        node('p', 'fs-1 mb-2', '🛒', emptyText);
        node('p', 'fw-semibold mb-1 text-dark', 'Ваша корзина пуста', emptyText);
        node('p', 'small text-muted mb-0', 'Выберите добавки в каталоге и нажмите «+ В корзину».', emptyText);
        return;
      }

      let totalPrice = 0;
      const listGroup = node('div', 'd-flex flex-column gap-2', '', cartItemsContainer);

      for (const [id, qty] of cart) {
        const product = getProductById(id);
        if (!product) continue;

        const itemTotal = product.price * qty;
        totalPrice += itemTotal;

        const row = node('div', 'p-3 border rounded-3 bg-light d-flex flex-column gap-2', '', listGroup);
        
        const topRow = node('div', 'd-flex justify-content-between align-items-start', '', row);
        node('strong', 'text-dark fw-bold small', product.name, topRow);
        
        const delBtn = node('button', 'btn-close btn-close-sm ms-2', '', topRow);
        delBtn.type = 'button';
        delBtn.addEventListener('click', () => {
          cart.delete(id);
          renderCart();
        });

        const botRow = node('div', 'd-flex justify-content-between align-items-center mt-1', '', row);
        node('span', 'fw-bold text-dark small', money(itemTotal), botRow);

        const qtyBox = node('div', 'd-flex align-items-center gap-2 border bg-white rounded px-2 py-1', '', botRow);
        
        const minusBtn = node('button', 'btn btn-sm p-0 border-0 text-dark fw-bold', '−', qtyBox);
        minusBtn.type = 'button';
        minusBtn.addEventListener('click', () => {
          if (qty <= 1) cart.delete(id);
          else cart.set(id, qty - 1);
          renderCart();
        });

        node('span', 'small fw-bold px-1', String(qty), qtyBox);

        const plusBtn = node('button', 'btn btn-sm p-0 border-0 text-dark fw-bold', '+', qtyBox);
        plusBtn.type = 'button';
        plusBtn.addEventListener('click', () => {
          cart.set(id, qty + 1);
          renderCart();
        });
      }

      const totalBox = node('div', 'd-flex justify-content-between align-items-center mb-3', '', cartFooterContainer);
      node('span', 'text-muted small fw-semibold', 'Итого к оплате:', totalBox);
      node('span', 'h5 fw-bold text-dark m-0', money(totalPrice), totalBox);

      const actionRow = node('div', 'd-flex flex-column gap-2', '', cartFooterContainer);
      
      const checkoutBtn = node('button', 'btn btn-dark fw-bold w-100 py-2', 'Оформить заказ', actionRow);
      checkoutBtn.type = 'button';
      checkoutBtn.addEventListener('click', () => {
        const bsOffcanvas = window.bootstrap ? window.bootstrap.Offcanvas.getInstance(offcanvas) : null;
        if (bsOffcanvas) bsOffcanvas.hide();
        nutriForm.scrollIntoView({ behavior: 'smooth' });
      });

      const clearAllBtn = node('button', 'btn btn-outline-danger btn-sm w-100', 'Очистить корзину', actionRow);
      clearAllBtn.type = 'button';
      clearAllBtn.addEventListener('click', () => {
        cart.clear();
        renderCart();
      });
    }

    renderCart();

    document.addEventListener('click', (e) => {
      const addBtn = e.target.closest('.btn-add-to-cart');
      if (addBtn) {
        const prodId = addBtn.dataset.productId;
        if (prodId) {
          const currentQty = cart.get(prodId) || 0;
          cart.set(prodId, currentQty + 1);
          renderCart();

          const originalText = addBtn.textContent;
          addBtn.textContent = '✓ В корзине';
          addBtn.classList.replace('btn-dark', 'btn-success');
          
          setTimeout(() => {
            addBtn.textContent = originalText;
            addBtn.classList.replace('btn-success', 'btn-dark');
          }, 1000);
        }
      }
    });

    if (!nutriForm || !statusArea) return;

    // 3. Форма заказа
    const clearErrors = () => {
      nutriForm.querySelectorAll('.field-error-msg').forEach(el => el.remove());
      nutriForm.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    };

    nutriForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearErrors();

      const nameInput = get('nutri-name');
      const phoneInput = get('nutri-phone');

      let isValid = true;
      let firstInvalid = null;

      const isNameValid = validateField(nameInput, nameInput.value.trim().length >= 2, 'Укажите имя (не менее 2 символов)');
      if (!isNameValid && !firstInvalid) firstInvalid = nameInput;

      const isPhoneValid = validateField(phoneInput, isValidPhone(phoneInput.value), 'Формат: +7 (777) 000-00-00');
      if (!isPhoneValid && !firstInvalid) firstInvalid = phoneInput;

      isValid = isNameValid && isPhoneValid;

      if (!isValid) {
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      const code = reference();
      resetContent(statusArea);
      statusArea.className = 'status-message alert alert-success mt-4 p-4 rounded-3 shadow-sm';

      node('h4', 'h6 fw-bold mb-2', `🛍 Заказ ${code} успешно оформлен!`, statusArea);
      node('p', 'mb-2 small', `Спасибо, ${nameInput.value.trim()}! Менеджер свяжется с вами по номеру ${phoneInput.value.trim()}.`, statusArea);

      if (cart.size > 0) {
        const orderList = node('ul', 'mb-2 ps-3 small text-dark', '', statusArea);
        let totalSum = 0;
        for (const [id, qty] of cart) {
          const item = getProductById(id);
          if (item) {
            totalSum += item.price * qty;
            node('li', '', `${item.name} — ${qty} шт. × ${money(item.price)}`, orderList);
          }
        }
        node('p', 'fw-bold small mb-2', `Общая сумма заказа: ${money(totalSum)}`, statusArea);
      } else {
        const selectedText = productSelect ? productSelect.options[productSelect.selectedIndex].text : 'Консультация';
        node('p', 'small mb-2', `Выбранная позиция: ${selectedText}`, statusArea);
      }

      node('p', 'small text-muted mb-0 mt-2 border-top pt-2', 'ℹ️ Демонстрационный заказ. Оплата и списание средств не осуществляются.', statusArea);

      cart.clear();
      renderCart();
      nutriForm.reset();
    });
  });
})();