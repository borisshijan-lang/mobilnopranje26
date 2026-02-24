function $(id){ return document.getElementById(id); }
function pad2(n){ return String(n).padStart(2,"0"); }

function monthTitle(dt){
  return dt.toLocaleString("sr-Latn-RS",{month:"long",year:"numeric"});
}
function dateKey(y,m,d){ return `${y}-${pad2(m+1)}-${pad2(d)}`; }
function niceDate(y,m,d){ return `${pad2(d)}/${pad2(m+1)}/${y}`; }
function niceTime(min){
  const h = Math.floor(min/60);
  const m = min%60;
  return `${pad2(h)}:${pad2(m)}`;
}
function isPast(y,m,d){
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const x = new Date(y, m, d);
  return x < today;
}

// ---------------------
// Firebase (ne ruši UI)
// ---------------------
let db = null;
let auth = null;
let firebaseReady = false;

try{
  const firebaseConfig = {
    apiKey: "AIzaSyC10IWy6vUrqwIXtugXSdQoXEoaeKlcFu0",
    authDomain: "mobilnopranje-d60f6.firebaseapp.com",
    databaseURL: "https://mobilnopranje-d60f6-default-rtdb.firebaseio.com", // proveri da je tacno
    projectId: "mobilnopranje-d60f6",
    storageBucket: "mobilnopranje-d60f6.appspot.com",
    messagingSenderId: "862210046561",
    appId: "1:862210046561:web:a073eb551cdff9199dc820"
  };

  firebase.initializeApp(firebaseConfig);
  db = firebase.database();
  auth = firebase.auth();
  firebaseReady = true;
}catch(e){
  console.error("Firebase init error:", e);
  firebaseReady = false;
}

// ---------------------
// FAQ
// ---------------------
document.querySelectorAll("[data-faq]").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const ans = btn.nextElementSibling;
    const icon = btn.querySelector(".faq__icon");
    const open = ans.style.display === "block";
    ans.style.display = open ? "none" : "block";
    icon.textContent = open ? "+" : "–";
  });
});

// ---------------------
// Booking elements
// ---------------------
const elTitle = $("calTitle");
const elDow   = $("dow");
const elGrid  = $("calGrid");
const elPkg   = $("pkg");
const elWhats = $("whats");
const elSlots = $("slots");
const elInfo  = $("selectedInfo");
const elSumDate = $("sumDate");
const elSumTime = $("sumTime");
const elSumPkg  = $("sumPkg");
const elSlotsMeta = $("slotsMeta");
const btnSend = $("sendReq");
const btnReset = $("reset");

$("prevMonth")?.addEventListener("click", ()=>viewMonth(-1));
$("nextMonth")?.addEventListener("click", ()=>viewMonth(1));

const START_HOUR = 17;
const END_HOUR = 22;
const STEP_MIN = 30;

let view = new Date();
view.setDate(1);

let selected = null;      // {y,m,d}
let selectedTime = null;

const DOW = ["Pon","Uto","Sre","Čet","Pet","Sub","Ned"];

// init
renderDow();
renderCalendar();
renderSummary();
renderSlotsPlaceholder();
updateSlotsMeta(null);

// ---------------------
// Calendar
// ---------------------
function renderDow(){
  elDow.innerHTML = "";
  DOW.forEach(name=>{
    const div = document.createElement("div");
    div.textContent = name;
    elDow.appendChild(div);
  });
}

function viewMonth(step){
  view.setMonth(view.getMonth()+step);
  renderCalendar();
}

function renderCalendar(){
  elTitle.textContent = monthTitle(view);
  elGrid.innerHTML = "";

  const y = view.getFullYear();
  const m = view.getMonth();

  const first = new Date(y,m,1);
  let startIndex = first.getDay();
  startIndex = (startIndex===0) ? 6 : startIndex-1;

  const daysInMonth = new Date(y,m+1,0).getDate();

  for(let i=0;i<startIndex;i++){
    const empty = document.createElement("div");
    empty.className = "day day--empty";
    elGrid.appendChild(empty);
  }

  for(let d=1; d<=daysInMonth; d++){
    const cell = document.createElement("div");
    cell.className = "day";
    cell.textContent = d;
    cell.dataset.y = y;
    cell.dataset.m = m;
    cell.dataset.d = d;

    if(isPast(y,m,d)) cell.classList.add("day--disabled");
    if(selected && selected.y===y && selected.m===m && selected.d===d) cell.classList.add("day--selected");

    elGrid.appendChild(cell);
  }
}

// delegation
elGrid.addEventListener("click", async (e)=>{
  const cell = e.target.closest(".day");
  if(!cell) return;
  if(cell.classList.contains("day--empty")) return;
  if(cell.classList.contains("day--disabled")) return;

  const y = parseInt(cell.dataset.y,10);
  const m = parseInt(cell.dataset.m,10);
  const d = parseInt(cell.dataset.d,10);

  selected = {y,m,d};
  selectedTime = null;

  document.querySelectorAll(".day--selected").forEach(x=>x.classList.remove("day--selected"));
  cell.classList.add("day--selected");

  elInfo.textContent = `Izabran datum: ${niceDate(y,m,d)}. Izaberi vreme.`;

  renderSummary();
  await renderSlots();
});

// ---------------------
// Slots
// ---------------------
function updateSlotsMeta(text){
  elSlotsMeta.textContent = text ?? "—";
}

function renderSlotsPlaceholder(){
  elSlots.innerHTML = `<div class="muted">Izaberi datum da vidiš slobodne termine.</div>`;
  btnSend.disabled = true;
}

async function getBookingsForDay(key){
  if(!firebaseReady || !db) return [];
  try{
    const snap = await db.ref("bookings").orderByChild("dateKey").equalTo(key).once("value");
    const arr = [];
    snap.forEach(s => arr.push(s.val()));
    return arr;
  }catch(e){
    console.error("DB read error:", e);
    return [];
  }
}

async function renderSlots(){
  elSlots.innerHTML = `<div class="muted">Učitavanje termina...</div>`;
  btnSend.disabled = true;

  if(!selected){
    renderSlotsPlaceholder();
    updateSlotsMeta(null);
    return;
  }

  const duration = parseInt(elPkg.value,10);
  const key = dateKey(selected.y, selected.m, selected.d);
  const bookings = await getBookingsForDay(key);

  elSlots.innerHTML = "";
  let created = 0;

  for(let h=START_HOUR; h<END_HOUR; h++){
    for(let mm of [0, STEP_MIN]){
      const start = h*60 + mm;
      const end = start + duration;
      if(end > END_HOUR*60) continue;

      const clash = bookings.some(b => start < (b.time + b.duration) && end > b.time);

      const b = document.createElement("button");
      b.type = "button";
      b.className = "slot";
      b.textContent = niceTime(start);

      if(clash){
        b.classList.add("slot--disabled");
        b.disabled = true;
      } else {
        b.addEventListener("click", ()=>{
          document.querySelectorAll(".slot--selected").forEach(x=>x.classList.remove("slot--selected"));
          b.classList.add("slot--selected");
          selectedTime = start;
          btnSend.disabled = false;
          renderSummary();
        });
      }

      elSlots.appendChild(b);
      created++;
    }
  }

  updateSlotsMeta(`Prikazano slotova: ${created}`);

  if(created === 0){
    elSlots.innerHTML = `<div class="muted">Nema slotova za ovaj paket (prelazi 22:00).</div>`;
  }

  if(!firebaseReady){
    const warn = document.createElement("div");
    warn.className = "tiny muted";
    warn.style.marginTop = "10px";
    warn.textContent = "Firebase nije povezan (vidi Console). Slotovi se prikazuju, ali upis u bazu neće raditi dok ne središ Rules/URL.";
    elSlots.appendChild(warn);
  }
}

elPkg.addEventListener("change", async ()=>{
  selectedTime = null;
  btnSend.disabled = true;
  if(selected) await renderSlots();
  renderSummary();
});

// ---------------------
// Summary + reset
// ---------------------
function renderSummary(){
  elSumDate.textContent = selected ? niceDate(selected.y,selected.m,selected.d) : "—";
  elSumTime.textContent = (selectedTime!=null) ? niceTime(selectedTime) : "—";
  elSumPkg.textContent  = elPkg.options[elPkg.selectedIndex]?.text || "—";
}

btnReset.addEventListener("click", ()=>{
  selected = null;
  selectedTime = null;
  btnSend.disabled = true;
  elInfo.textContent = "Izaberi datum.";
  document.querySelectorAll(".day--selected").forEach(x=>x.classList.remove("day--selected"));
  document.querySelectorAll(".slot--selected").forEach(x=>x.classList.remove("slot--selected"));
  renderSummary();
  renderSlotsPlaceholder();
  updateSlotsMeta(null);
});

// ---------------------
// Send request
// ---------------------
btnSend.addEventListener("click", async ()=>{
  if(!selected || selectedTime==null) return;

  const phone = (elWhats.value || "").trim();
  if(!phone){ alert("Upiši WhatsApp broj (npr. 3816...)"); return; }

  const duration = parseInt(elPkg.value,10);
  const packageName = elPkg.options[elPkg.selectedIndex].text;
  const key = dateKey(selected.y, selected.m, selected.d);
  const dateText = niceDate(selected.y, selected.m, selected.d);

  const msg = `Rezervacija ${dateText} Paket: ${packageName} Vreme: ${niceTime(selectedTime)}`;

  if(!firebaseReady || !db){
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    alert("Poslat WhatsApp zahtev (Firebase nije povezan).");
    return;
  }

  const bookings = await getBookingsForDay(key);
  const end = selectedTime + duration;
  const clash = bookings.some(b => selectedTime < (b.time + b.duration) && end > b.time);
  if(clash){
    alert("Upravo je zauzet taj termin. Izaberi drugi.");
    await renderSlots();
    return;
  }

  try{
    await db.ref("bookings").push({
      dateKey: key,
      dateText,
      time: selectedTime,
      duration,
      package: packageName,
      createdAt: Date.now()
    });
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    alert("Termin rezervisan!");
    await renderSlots();
  }catch(e){
    console.error("DB write error:", e);
    alert("Ne mogu da upišem termin u bazu. Proveri Firebase Rules.");
  }
});
