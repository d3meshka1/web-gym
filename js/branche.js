'use strict';
(() => {
  const { get, node, select, button, status, resetContent } = window.Bonanza;
  const section=get('group-schedule');
  const list=get('schedule-list');
  if(!section || !list) return;
  const statusEl=get('schedule-status');
  const days=['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
  // Demonstration schedule inspired by the existing group classes and known trainer availability.
  // Spaces are sample data, not live inventory. Unknown instructors are labeled as club instructors.
  const classes=[
    {id:'yoga-tue',day:1,time:'10:00',name:'Йога и стретчинг',category:'mindbody',trainer:'Мосоян Злата',spots:4,capacity:10,room:'Зал групповых программ'},
    {id:'power-mon',day:0,time:'09:30',name:'Функциональный тренинг',category:'power',trainer:'Соколовский Андрей',spots:2,capacity:8,room:'Кроссфит зона'},
    {id:'power-wed',day:2,time:'18:00',name:'Тяжёлая атлетика',category:'power',trainer:'Соколовский Андрей',spots:0,capacity:8,room:'Соревновательный зал'},
    {id:'cardio-thu',day:3,time:'19:30',name:'Интервальный кардио-комплекс',category:'cardio',trainer:'Мосоян Злата',spots:4,capacity:12,room:'Кардиозона'},
    {id:'yoga-sat',day:5,time:'10:00',name:'Йога и стретчинг',category:'mindbody',trainer:'Мосоян Злата',spots:3,capacity:10,room:'Зал групповых программ'},
    {id:'functional-fri',day:4,time:'09:30',name:'Функциональный тренинг',category:'power',trainer:'Соколовский Андрей',spots:1,capacity:8,room:'Кроссфит зона'},
    {id:'cardio-tue',day:1,time:'18:30',name:'Кардио и выносливость',category:'cardio',trainer:'Мосоян Злата',spots:0,capacity:12,room:'Кардиозона'},
    {id:'strength-mon',day:0,time:'18:00',name:'Тяжёлая атлетика',category:'power',trainer:'Соколовский Андрей',spots:2,capacity:8,room:'Соревновательный зал'}
  ];
  // Existing static list remains visible when JavaScript is disabled.
  const notice=node('p','small text-muted mb-3','Демонстрационное недельное расписание и места. Уточните актуальность у администратора.',null);
  section.insertBefore(notice,list);
  const filters=node('div','border bg-light rounded-3 p-3 mb-3','',null);
  section.insertBefore(filters,list);
  const row=node('div','row g-3 align-items-end','',filters);
  const day=select('schedule-day','День недели',[{value:'all',label:'Все дни'},...days.map((d,i)=>({value:String(i),label:d}))],row);
  const category=select('schedule-category','Направление',[
    {value:'all',label:'Все направления'}, {value:'mindbody',label:'Йога и стретчинг'},
    {value:'power',label:'Силовые и функциональные'}, {value:'cardio',label:'Кардио'}
  ],row);
  const trainer=select('schedule-trainer','Тренер',[
    {value:'all',label:'Любой тренер'},
    {value:'Соколовский Андрей',label:'Соколовский Андрей'},
    {value:'Мосоян Злата',label:'Мосоян Злата'}
  ],row);
  const availableWrap=node('div','col-12 col-md-auto','',row);
  const checkboxWrap=node('div','form-check mb-2','',availableWrap);
  const available=node('input','form-check-input','',checkboxWrap); available.type='checkbox'; available.id='schedule-open';
  const availableLabel=node('label','form-check-label','Только со свободными местами',checkboxWrap); availableLabel.htmlFor='schedule-open';
  const resetWrap=node('div','col-12 col-md-auto','',row);
  const reset=button('Сбросить','btn btn-outline-dark',resetWrap);
  const counter=node('p','small mt-3 mb-0','',filters); counter.setAttribute('role','status');counter.setAttribute('aria-live','polite');
  const selected=node('div','border rounded p-3 mt-3 bg-light','',null);
  section.insertBefore(selected,statusEl);
  selected.hidden=true;
  const pickedTitle=node('h3','h5 fw-bold','Выбранное занятие',selected);
  const pickedText=node('p','mb-2','',selected);
  const booking=node('a','btn btn-primary','Перейти к форме записи',selected);
  booking.href='booking.html#booking-form-section';
  const explanation=node('p','small text-muted mt-2 mb-0','Это демонстрационный выбор. Место не резервируется автоматически, подтверждение требуется у клуба.',selected);
  function render(){
    const filtered=classes.filter((lesson)=>{
      return (day.value==='all'||Number(day.value)===lesson.day)
        && (category.value==='all'||lesson.category===category.value)
        && (trainer.value==='all'||lesson.trainer===trainer.value)
        && (!available.checked||lesson.spots>0);
    }).sort((a,b)=>a.day-b.day||a.time.localeCompare(b.time));
    resetContent(list);
    list.className='row list-unstyled g-3 my-3';
    if(!filtered.length){
      const empty=node('li','col-12','',list);
      node('p','border rounded bg-light p-3 mb-0','Нет занятий по выбранным фильтрам. Измените параметры или сбросьте их.',empty);
    }
    filtered.forEach((lesson)=>{
      const col=node('li','col-12 col-md-6','',list);
      const card=node('article','h-100 border rounded bg-light p-3 d-flex flex-column gap-2','',col);
      const headline=node('div','d-flex flex-wrap justify-content-between gap-2','',card);
      node('h3','h6 fw-bold mb-0',lesson.name,headline);
      node('span',lesson.spots?'badge bg-success':'badge bg-secondary',lesson.spots?`Свободно мест: ${lesson.spots}`:'Мест нет',headline);
      node('p','mb-0',`${days[lesson.day]}, ${lesson.time} · ${lesson.room}`,card);
      node('p','mb-0 small',`Тренер: ${lesson.trainer}`,card);
      const pick=button(lesson.spots?'Выбрать занятие':'Нет мест','btn btn-outline-dark mt-auto',card);
      pick.disabled=lesson.spots===0;
      pick.addEventListener('click',()=>{
        selected.hidden=false;
        pickedText.textContent=`${lesson.name} — ${days[lesson.day]}, ${lesson.time}. Тренер: ${lesson.trainer}. Доступно мест (демо): ${lesson.spots}.`;
        status(statusEl,`Вы выбрали «${lesson.name}». Для запроса записи перейдите к форме.`);
        [...list.querySelectorAll('article')].forEach((item)=>item.classList.remove('border-warning','border-3'));
        card.classList.add('border-warning','border-3');
        const href=new URL('booking.html',location.href);
        href.searchParams.set('visit_format','trainer');
        href.searchParams.set('trainer_select',lesson.trainer==='Соколовский Андрей'?'sokolovsky':'mosoyan');
        href.searchParams.set('training',lesson.name);
        booking.href=`booking.html${href.search}#booking-form-section`;
        selected.scrollIntoView({block:'nearest',behavior:'smooth'});
      });
    });
    selected.hidden=true;
    counter.textContent=`Найдено занятий: ${filtered.length} из ${classes.length}`;
    statusEl.textContent='';
  }
  [day,category,trainer].forEach((field)=>field.addEventListener('change',render));
  available.addEventListener('change',render);
  reset.addEventListener('click',()=>{day.value='all';category.value='all';trainer.value='all';available.checked=false;render();});
  render();
})();
