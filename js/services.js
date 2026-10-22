'use strict';
(() => {
  const { tariffs, get, money, node, select, button, status, resetContent, reference } = window.Bonanza;
  const section = get('price-list');
  const body = get('tariff-list');
  const summary = get('service-summary');
  if (!section || !body || !summary) return;
  const rows = [...body.querySelectorAll('tr[data-service]')];
  const entries = tariffs.map((tariff) => {
    const tr = rows.find((r) => r.dataset.service === tariff.id);
    return { ...tariff, row: tr, details: tr?.cells[2]?.textContent.trim() ?? '' };
  });
  const controls = node('div', 'border rounded-3 p-3 bg-white mt-3 mb-3', '', null);
  section.insertBefore(controls, get('prices-scroll'));
  node('h3', 'h6 fw-bold mb-2', 'Быстрый поиск по тарифам', controls);
  const fields = node('div', 'row g-2 align-items-end', '', controls);
  const searchBox = node('div', 'col-12 col-md-4', '', fields);
  const searchLabel = node('label', 'form-label fw-semibold', 'Поиск услуги', searchBox); searchLabel.htmlFor='service-search';
  const searchInput = node('input', 'form-control', '', searchBox);
  searchInput.id = 'service-search'; searchInput.type='search'; searchInput.placeholder='Например: вечерний';
  const moreFilters = node('details', 'col-12 col-md-auto service-extra-filters', '', fields);
  node('summary', 'btn btn-outline-secondary', 'Фильтры и сортировка', moreFilters);
  const advanced = node('div', 'd-flex flex-wrap gap-2 align-items-end mt-2', '', moreFilters);
  const category = select('service-category', 'Категория', [
    {value:'all', label:'Все тарифы'}, {value:'gym',label:'Абонементы'},
    {value:'trainer',label:'С тренером'}, {value:'single',label:'Разовые посещения'}
  ], advanced);
  const sort = select('service-sort', 'Сортировка', [
    {value:'default', label:'По умолчанию'}, {value:'asc',label:'Сначала дешевле'},
    {value:'desc',label:'Сначала дороже'}, {value:'name',label:'По названию'}
  ], advanced);
  const buttonBox = node('div', 'col-12 col-md-auto', '', advanced);
  const reset = button('Сбросить фильтры', 'btn btn-outline-dark', buttonBox);
  const matchCount = node('p', 'small mt-3 mb-0', '', controls);
  matchCount.setAttribute('role', 'status'); matchCount.setAttribute('aria-live','polite');
  const emptyRow = node('tr', '', '', null);
  const emptyCell = node('td','text-center text-muted py-4','Ничего не найдено. Измените фильтры или нажмите «Сбросить фильтры».', emptyRow);
  emptyCell.colSpan=4;
  function filterRows() {
    const q=searchInput.value.trim().toLocaleLowerCase('ru-RU');
    const visible=entries.filter((e)=>{
      return (category.value === 'all' || category.value === e.category)
        && `${e.name} ${e.details} ${e.period}`.toLocaleLowerCase('ru-RU').includes(q);
    });
    if(sort.value === 'asc') visible.sort((a,b)=>a.price-b.price);
    if(sort.value === 'desc') visible.sort((a,b)=>b.price-a.price);
    if(sort.value === 'name') visible.sort((a,b)=>a.name.localeCompare(b.name,'ru'));
    resetContent(body);
    visible.forEach(({row}) => { if(row) body.append(row); });
    if(!visible.length) body.append(emptyRow);
    matchCount.textContent=`Найдено услуг: ${visible.length} из ${entries.length}`;
  }
  searchInput.addEventListener('input',filterRows);
  category.addEventListener('change',filterRows);
  sort.addEventListener('change',filterRows);
  reset.addEventListener('click', () => { searchInput.value=''; category.value='all'; sort.value='default'; filterRows(); searchInput.focus(); });

  const statusEl=get('services-status');
  const errorEl=get('services-error');
  const nameEl=get('selected-service-name');
  const periodEl=get('selected-service-period');
  const optionsEl=get('selected-service-options');
  const totalEl=get('selected-service-total');
  const cart = new Map();
  let chosen = null;
  // Build cart controls once. Selecting a row previews that tariff, with an actual add action.
  const controlsPanel=node('div','d-flex flex-wrap align-items-center gap-2 mt-3','',summary);
  const addButton=button('Добавить в корзину','btn btn-dark',controlsPanel);
  const cartSection=node('details','border rounded-3 p-3 mt-3 bg-light','',null);
  cartSection.id='services-cart';
  section.insertBefore(cartSection,get('booking-next-step'));
  const cartHeading=node('summary','fw-bold', 'Корзина · 0 услуг',cartSection);
  node('p','small text-muted','Демонстрационная корзина: покупка и оплата не выполняются.',cartSection);
  const cartItems=node('div','d-flex flex-column gap-2','',cartSection);
  const cartTotal=node('output','d-block fw-bold mt-3 mb-3','',cartSection);
  cartTotal.setAttribute('aria-live','polite');
  const checkout=button('Оформить демонстрационный заказ','btn btn-primary',cartSection);
  const clearCart=button('Очистить корзину','btn btn-outline-secondary ms-2',cartSection);
  const cartMessage=node('p','mt-3 mb-0','',cartSection);
  cartMessage.setAttribute('role','status'); cartMessage.setAttribute('aria-live','polite');
  function choose(id){
    chosen=entries.find((e)=>e.id===id) || null;
    if(!chosen) return;
    summary.hidden=false;
    nameEl.textContent=chosen.name;
    periodEl.textContent=chosen.period;
    optionsEl.textContent=chosen.details;
    totalEl.textContent=money(chosen.price);
    rows.forEach((row)=> {
      row.classList.toggle('table-warning',row.dataset.service===id);
      const btn=row.querySelector('button[data-service]');
      if (btn) {
        btn.textContent=row.dataset.service===id ? 'Выбрано' : 'Выбрать';
        btn.setAttribute('aria-pressed',String(row.dataset.service===id));
      }
    });
    status(statusEl,`Выбран тариф «${chosen.name}». Добавьте его в корзину или перейдите к записи.`);
    errorEl.textContent='';
    const booking=get('services-booking');
    const href=new URL('booking.html',location.href);
    href.searchParams.set('membership_type',id);
    booking.href=`booking.html${href.search}#membership-type`;
  }
  body.addEventListener('click',(event)=>{
    const trigger=event.target.closest('button[data-service]');
    if(trigger) choose(trigger.dataset.service);
  });
  addButton.addEventListener('click',()=>{
    if(!chosen) { status(errorEl,'Сначала выберите тариф.','error'); return; }
    cart.set(chosen.id,(cart.get(chosen.id) || 0)+1);
    cartSection.open=true;
    showCart(); status(statusEl,`«${chosen.name}» добавлен в корзину.`);
    cartMessage.textContent='';
  });
  function showCart(){
    resetContent(cartItems);
    let sum=0;
    if(!cart.size) node('p','text-muted mb-0','Корзина пуста. Выберите тариф и нажмите «Добавить в корзину».',cartItems);
    for(const [id, qty] of cart){
      const item=entries.find((e)=>e.id===id);
      if(!item) continue;
      sum+=item.price*qty;
      const line=node('div','border rounded bg-white p-2 d-flex flex-wrap justify-content-between align-items-center gap-2','',cartItems);
      node('span','fw-semibold',`${item.name} — ${qty} × ${money(item.price)} = ${money(qty*item.price)}`,line);
      const actions=node('div','d-flex gap-2','',line);
      const minus=button('−','btn btn-outline-dark btn-sm',actions); minus.setAttribute('aria-label',`Уменьшить количество ${item.name}`);
      const plus=button('+','btn btn-outline-dark btn-sm',actions); plus.setAttribute('aria-label',`Увеличить количество ${item.name}`);
      const remove=button('Удалить','btn btn-outline-danger btn-sm',actions);
      minus.addEventListener('click',()=>{if(qty<=1)cart.delete(id); else cart.set(id,qty-1); showCart();cartMessage.textContent='';});
      plus.addEventListener('click',()=>{if(qty<10)cart.set(id,qty+1); else status(cartMessage,'Максимум 10 единиц одного тарифа.','error');showCart();});
      remove.addEventListener('click',()=>{cart.delete(id);showCart();cartMessage.textContent='';});
    }
    const count=[...cart.values()].reduce((a,b)=>a+b,0);
    cartHeading.textContent=`Корзина · ${count} ${count===1?'услуга':'услуг'} · ${money(sum)}`;
    cartTotal.textContent=`Итого: ${money(sum)}`;
    checkout.disabled=cart.size===0;
    clearCart.disabled=cart.size===0;
  }
  clearCart.addEventListener('click',()=>{cart.clear();showCart();cartMessage.textContent='Корзина очищена.';});
  checkout.addEventListener('click',()=>{
    if(!cart.size) { status(cartMessage,'Сначала добавьте услугу.','error'); return; }
    const items=[...cart].map(([id,qty])=>`${entries.find((e)=>e.id===id).name} × ${qty}`);
    const total=[...cart].reduce((sum,[id,qty])=>sum+entries.find((e)=>e.id===id).price*qty,0);
    status(cartMessage,`Демо-заявка ${reference()}: ${items.join('; ')}. Итого ${money(total)}. Данные не отправлены, заказ не оформлен.`);
  });
  filterRows(); showCart();
})();
