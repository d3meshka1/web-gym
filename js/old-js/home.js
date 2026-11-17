'use strict';
(() => {
  const { tariffs, get, money, node, select, button, status, resetContent } = window.Bonanza;
  const welcome = get('welcome');
  const reviews = get('reviews');
  if (!welcome || !reviews) return;

  // Compact membership calculator on the homepage; prices come from the shared tariff list.
  {
    const panel = node('section', 'rounded-3 border bg-white p-3 p-md-4 mb-4 compact-calc', '', null);
    panel.id = 'home-calculator';
    welcome.after(panel);
    const header=node('div','d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3','',panel);
    const left=node('div','','',header);
    node('h2','h5 fw-bold mb-1','Рассчитайте стоимость тренировок',left);
    node('p','small text-muted mb-0','Выберите тариф и количество абонементов',left);
    const link=node('a','btn btn-outline-dark btn-sm','Все тарифы →',header);
    link.href='services.html#price-list';
    const fields=node('div','row g-2 align-items-end','',panel);
    const plan=select('home-plan','Тариф',tariffs.map((t)=>({value:t.id,label:t.name})),fields);
    plan.parentElement.classList.add('col-lg-5');
    const qtyWrap=node('div','col-12 col-sm-auto','',fields);
    const qtyLabel=node('label','form-label fw-semibold','Количество',qtyWrap);qtyLabel.htmlFor='home-qty';
    const qty=node('input','form-control','',qtyWrap);qty.type='number';qty.id='home-qty';qty.min='1';qty.max='10';qty.value='1';
    const resultWrap=node('div','col-12 col-md','',fields);
    node('span','small text-muted d-block','Предварительная стоимость',resultWrap);
    const result=node('output','h4 d-block fw-bold mb-0','',resultWrap);
    result.setAttribute('aria-live','polite');
    const goWrap=node('div','col-12 col-md-auto','',fields);
    const go=node('a','btn btn-dark w-100','Перейти к записи',goWrap);
    const error=node('p','small text-danger mt-2 mb-0','',panel);error.setAttribute('role','alert');
    const render=()=>{
      const chosen=tariffs.find((x)=>x.id===plan.value);
      const amount=Number(qty.value);
      if(!chosen || !Number.isInteger(amount) || amount<1 || amount>10){
        error.textContent='Введите количество от 1 до 10.';result.textContent='—';go.removeAttribute('href');go.classList.add('disabled');go.setAttribute('aria-disabled','true');return;
      }
      error.textContent='';result.textContent=money(chosen.price*amount);
      go.href=`booking.html?membership_type=${encodeURIComponent(chosen.id)}#membership-type`;
      go.classList.remove('disabled');go.removeAttribute('aria-disabled');
    };
    plan.addEventListener('change',render);qty.addEventListener('input',render);render();
  }

  // Reviews use a shared renderer for existing (seed data) and submitted reviews.
  const reviewList = get('reviews-list');
  const reviewStatus = get('reviews-status');
  const seed = [
    {name:'Tilegen Z.', rating:5, text:'Хороший зал, хорошие спокойные дружелюбные тренера👍', date:'2026-03-21', role:'постоянный клиент', avatar:'avatar/photo_2026-09-16_14-52-00.jpg'},
    {name:'Sokolovskiy Z.', rating:5, text:'Отличный зал. Отзывчивый персонал. На просьбы и вопросы обращают внимание.', date:'2026-04-25', role:'постоянный клиент', avatar:'avatar/photo_2026-09-16_14-51-57.jpg'},
    {name:'Margarite L.', rating:5, text:'Персонал молодцы. Понравилось.', date:'2026-07-10', role:'член кроссфит группы', avatar:'avatar/photo_2026-09-16_14-52-03.jpg'}
  ];
  let reviewsData = seed.slice();
  const reviewDetails=node('details', 'border rounded-3 bg-light p-3 mt-3', '', reviews);
  node('summary','fw-semibold','Оставить свой отзыв',reviewDetails);
  const reviewForm = node('form', 'mt-3', '', reviewDetails);
  reviewForm.id = 'review-form'; reviewForm.noValidate = true;
  node('h3', 'h5', 'Оставить отзыв о клубе', reviewForm);
  const row = node('div', 'row g-3', '', reviewForm);
  const nameBox = node('div', 'col-12 col-md-6', '', row);
  const nameLabel = node('label', 'form-label', 'Ваше имя', nameBox); nameLabel.htmlFor = 'review-name';
  const nameInput = node('input', 'form-control', '', nameBox); nameInput.id = 'review-name'; nameInput.maxLength = 40; nameInput.required = true;
  const rating = select('review-rating', 'Оценка', [5,4,3,2,1].map((value) => ({value: String(value), label: `${value} из 5`})), row);
  const textBox = node('div', 'col-12', '', row);
  const textLabel = node('label', 'form-label', 'Ваш отзыв (10–300 символов)', textBox); textLabel.htmlFor = 'review-text';
  const textarea = node('textarea', 'form-control', '', textBox); textarea.id = 'review-text'; textarea.rows = 3; textarea.minLength = 10; textarea.maxLength = 300; textarea.required = true;
  const formActions = node('div', 'col-12', '', row);
  const post = node('button', 'btn btn-dark', 'Опубликовать демонстрационный отзыв', formActions); post.type = 'submit';
  const formError = node('p', 'small text-danger mt-2 mb-0', '', reviewForm); formError.setAttribute('role','alert');
  const count = node('p', 'small text-muted mt-3 mb-2', '', reviews);

  function renderReview(review) {
    const col = node('div', 'col-12 col-md-6 col-lg-4', '', reviewList);
    const article = node('article', 'review-card h-100', '', col);
    node('h3', 'visually-hidden', `Отзыв: ${review.name}`, article);
    const content = node('div', 'h-100 d-flex flex-column', '', article);
    const head = node('div', 'd-flex align-items-center gap-3 mb-3', '', content);
    if (review.avatar) {
      const avatar = node('img', 'review-avatar img-fluid', '', head);
      avatar.src = review.avatar; avatar.alt = `Аватар клиента ${review.name}`; avatar.width = 56; avatar.height = 56; avatar.loading = 'lazy';
    }
    node('span', 'rating fw-bold', `Рейтинг: ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}`, head);
    const quote = node('blockquote', 'flex-grow-1 mb-2', '', content);
    node('q', 'd-block', review.text, quote);
    const footer = node('footer', 'small', '', content);
    const date = new Date(`${review.date}T12:00:00`);
    footer.textContent = `— ${review.name}, ${review.role} (${date.toLocaleDateString('ru-RU')})`;
  }
  function showReviews() {
    resetContent(reviewList);
    reviewsData.forEach(renderReview);
    count.textContent = `Показано отзывов: ${reviewsData.length}`;
  }
  reviewForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const author = nameInput.value.trim();
    const message = textarea.value.trim();
    if (author.length < 2 || author.length > 40) { formError.textContent='Введите имя длиной от 2 до 40 символов.'; nameInput.focus(); return; }
    if (message.length < 10 || message.length > 300) { formError.textContent='Отзыв должен содержать от 10 до 300 символов.'; textarea.focus(); return; }
    const score = Number(rating.value);
    if (!Number.isInteger(score) || score < 1 || score > 5) { formError.textContent='Выберите оценку от 1 до 5.'; rating.focus(); return; }
    formError.textContent = '';
    const today = new Date();
    reviewsData.unshift({name:author, text:message, rating:score, date:`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`, role:'отзыв посетителя (демо)', avatar:null});
    showReviews(); reviewForm.reset();
    status(reviewStatus, 'Отзыв добавлен на эту страницу (демо). После обновления страницы он исчезнет.');
  });
  showReviews();
})();
