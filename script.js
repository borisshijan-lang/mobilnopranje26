// ======= BLUR OVERLAY =======
const overlay = document.getElementById('focusOverlay');
function blurOn() { overlay.classList.add('active'); }
function blurOff() { overlay.classList.remove('active'); }

// ======= FAQ =======
document.querySelectorAll('[data-faq]').forEach(btn => {
  btn.addEventListener('click', () => btn.classList.toggle('active'));
});

// ======= DROPDOWN =======
const pkgDD = document.getElementById('pkgDD');
const pkgBtn = document.getElementById('pkgBtn');
const pkgMenu = document.getElementById('pkgMenu');
const pkgValue = document.getElementById('pkgValue');
const pkgSelect = document.getElementById('pkg');

['Basic (60 min)','Standard (90 min)','Premium (120 min)'].forEach((txt,i)=>{
  const div = document.createElement('div');
  div.textContent = txt;
  div.dataset.value = [60,90,120][i];
  div.addEventListener('click',()=>{
    pkgValue.textContent = txt;
    pkgSelect.value = div.dataset.value;
    pkgDD.classList.remove('active');
  });
  pkgMenu.appendChild(div);
});

pkgBtn.addEventListener('click',()=>pkgDD.classList.toggle('active'));

// ======= SCROLL TO BOOKING & BLUR =======
document.querySelectorAll('.nav__cta,.pkgCard,.hero__actions a[href="#booking"]').forEach(el=>{
  el.addEventListener('click', e=>{
    e.preventDefault();
    document.getElementById('booking').scrollIntoView({behavior:'smooth'});
    blurOff();
  });
});

// ======= KALENDAR =======
const calTitle = document.getElementById('calTitle');
const calGrid = document.getElementById('calGrid');
const prevMonth = document.getElementById('prevMonth');
const nextMonth = document.getElementById('nextMonth');
const selectedInfo = document.getElementById('selectedInfo');
let current = new Date();
let selectedDate = null;

function buildCalendar(){
  calGrid.innerHTML = '';
  const y = current.getFullYear();
  const m = current.getMonth();
  calTitle.textContent = `${m+1}/${y}`;
  const firstDay = new Date(y,m,1).getDay();
  const lastDate = new Date(y,m+1,0).getDate();

  for(let i=0;i<firstDay;i++){ calGrid.appendChild(document.createElement('div')); }
  for(let d=1;d<=lastDate;d++){
    const div = document.createElement('div');
    div.textContent=d;
    div.addEventListener('click',()=>selectDate(d));
    if(selectedDate && selectedDate.getDate()===d && selectedDate.getMonth()===m) div.classList.add('selected');
    calGrid.appendChild(div);
  }
}
function selectDate(d){
  selectedDate = new Date(current.getFullYear(),current.getMonth(),d);
  selectedInfo.textContent = selectedDate.toLocaleDateString('sr-RS');
  document.getElementById('sumDate').textContent = selectedDate.toLocaleDateString('sr-RS');
  buildCalendar();
  blurOff();
  loadSlots();
}

prevMonth.addEventListener('click',()=>{current.setMonth(current.getMonth()-1);buildCalendar();});
nextMonth.addEventListener('click',()=>{current.setMonth(current.getMonth()+1);buildCalendar();});
buildCalendar();

// ======= SLOTOVI =======
const slotsContainer = document.getElementById('slots');
let slotsData = ['17:00','18:00','19:00','20:00','21:00','22:00'];
function loadSlots(){
  slotsContainer.innerHTML='';
  slotsData.forEach(time=>{
    const div=document.createElement('div');
    div.textContent=time;
    div.addEventListener('click',()=>{
      document.querySelectorAll('#slots div').forEach(el=>el.classList.remove('selected'));
      div.classList.add('selected');
      document.getElementById('sumTime').textContent=time;
      document.getElementById('sendReq').disabled=false;
      blurOff();
    });
    slotsContainer.appendChild(div);
  });
}

// ======= SEND & RESET =======
document.getElementById('sendReq').addEventListener('click',()=>{
  document.getElementById('statusLine').textContent='Zahtev poslat!';
});
document.getElementById('reset').addEventListener('click',()=>{
  selectedDate=null;
  selectedInfo.textContent='Izaberi datum';
  document.getElementById('sumDate').textContent='—';
  document.getElementById('sumTime').textContent='—';
  document.getElementById('sumPkg').textContent='—';
  document.getElementById('sendReq').disabled=true;
  document.getElementById('slots').innerHTML='<div class="muted">Izaberi datum da vidiš slobodne termine.</div>';
  blurOff();
});

// ======= ESCAPE da ukloni blur =======
document.addEventListener('keydown',e=>{if(e.key==='Escape') blurOff();});
