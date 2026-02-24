// =====================
// 0) MINI helper
// =====================
function $(id){ return document.getElementById(id); }
function pad2(n){ return String(n).padStart(2,"0"); }
function monthTitle(dt){
  // sr-Latn-RS = srpski latinica
  return dt.toLocaleString("sr-Latn-RS",{month:"long",year:"numeric"});
}
function dateKey(y,m,d){ return `${y}-${pad2(m+1)}-${pad2(d)}`; }  // ISO key
function niceDate(y,m,d){ return `${pad2(d)}/${pad2(m+1)}/${y}`; }
function niceTime(min){
  const h = Math.floor(min/60);
  const m = min%60;
  return `${pad2(h)}:${pad2(m)}`;
}
function isPast(y,m,d){
  const t = new Date(); t.setHours(0,0,0,0);
  const x = new Date(y,m,d); x.setHours(0,0,0,0);
  return x < t;
}

// =====================
// 1) Firebase init (NE SME da sruši UI)
// =====================
let db = null;
let auth = null;
let firebaseReady = false;

try{
  const firebaseConfig = {
    apiKey: "AIzaSyC10IWy6vUrqwIXtugXSdQoXEoaeKlcFu0",
    authDomain: "mobilnopranje-d60f6.firebaseapp.com",
    databaseURL: "https://mobilnopranje-d60f6-default-rtdb.firebaseio.com", // <-- proveri da je 100% tacno
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

// =====================
// 2) FAQ toggle
// =====================
document.querySelectorAll("[data-faq]").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const ans = btn.nextElementSibling;
    const icon = btn.querySelector(".faq__icon");
    const open = ans.style.display === "block";
    ans.style.display = open ? "none" : "block";
    icon.textContent = open ? "+" : "–";
  });
});

// =====================
// 3) Booking UI elements
// =====================
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

const btnSend = $("sendReq");
const btnReset = $("reset");

$("prevMonth")?.addEventListener("click", ()=>{ viewMonth(-1); });
$("nextMonth")?.addEventListener("click", ()=>{ viewMonth(1); });

// =====================
// 4) Booking state
// =====================
const START_HOUR = 17;
const END_HOUR = 22;
const STEP_MIN = 30;

let view = new Date();
view.setDate(1);

let selected = null;      // {y,m,d}
let selectedTime = null;  // minutes from 00:00

const DOW = ["Pon","Uto","Sre","Čet","Pet","Sub","Ned"];

// init UI ALWAYS
renderDow();
renderCalendar();
renderSummary();
renderSlots(); // pokaži placeholder odmah

// =====================
// 5) Calendar
// =====================
function renderDow(){
  if(!elDow) return;
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
  if(!elTitle || !elGrid) return;

  elTitle.textContent = monthTitle(view);
  elGrid.innerHTML = "";

  const y = view.getFullYear();
  const m = view.getMonth();

  const first = new Date(y,m,1);
  let startIndex = first.getDay();           // 0=ned
  startIndex = (startIndex===0) ? 6 : startIndex-1; // pon=0

  const daysInMonth = new Date(y,m+1,0).getDate();

  // empty cells
  for(let i=0;i<startIndex;i++){
    const empty = document.createElement("div");
    empty.className = "day day--empty";
    elGrid.appendChild(empty);
  }

  for(let d=1; d<=daysInMonth; d++){
    const cell = document.createElement("div");
    cell.className = "day";
    cell.textContent = d;

    if(isPast(y,m,d)){
      cell.classList.add("day--disabled");
    }else{
      cell.addEventListener("click", async ()=>{
        selected = {y,m,d};
        selectedTime = null;

        document.querySelectorAll(".day--selected")
          .forEach(x=>x.classList.remove("day--selected"));
        cell.classList.add("day--selected");

        elInfo.textContent = `Izabran datum: ${niceDate(y,m,d)}. Izaberi vreme.`;
        renderSummary();
        await renderSlots();
      });
    }

    if(selected && selected.y===y && selected.m===m && selected.d===d){
      cell.classList.add("day--selected");
    }

    elGrid.appendChild(cell);
  }
}

// =====================
// 6) Slots (klik na dugmiće)
// =====================
async function getBookingsForDay(key){
  if(!firebaseReady || !db) return []; // bez firebase-a: prazno (svi slotovi slobodni)

  try{
    const snap = await db.ref("bookings").orderByChild("dateKey").equalTo(key).once("value");
    const bookings = [];
    snap.forEach(s => bookings.push(s.val()));
    return bookings;
  }catch(e){
    console.error("DB read error:", e);
    return [];
  }
}

async function renderSlots(){
  if(!elSlots) return;

 elSlots.innerHTML = `<div class="muted">Učitavanje termina...</div>`;
btnSend.disabled = true;


  if(!selected){ // reset container pre punjenja
elSlots.innerHTML = "";

    elSlots.innerHTML = `<div class="muted">Izaberi datum da vidiš slobodne termine.</div>`;
    return;
  }

  const duration = parseInt(elPkg.value,10);
  const key = dateKey(selected.y, selected.m, selected.d);

  const bookings = await getBookingsForDay(key);

  let hasAny = false;

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
        hasAny = true;
        b.addEventListener("click", ()=>{
          document.querySelectorAll(".slot--selected")
            .forEach(x=>x.classList.remove("slot--selected"));
          b.classList.add("slot--selected");
          selectedTime = start;
          btnSend.disabled = false;
          renderSummary();
        });
      }

      if(selectedTime === start){
        b.classList.add("slot--selected");
        btnSend.disabled = false;
      }

      elSlots.appendChild(b);
    }
  }

  if(!hasAny){
    elSlots.innerHTML = `<div class="muted">Nema slobodnih termina za ovaj datum (za izabrani paket).</div>`;
  }

  // mali hint ako firebase nije ready
  if(!firebaseReady){
    const warn = document.createElement("div");
    warn.className = "tiny muted";
    warn.style.marginTop = "10px";
    warn.textContent = "Napomena: Firebase nije povezan (vidi Console). Slotovi su prikazani, ali upis u bazu neće raditi dok se Firebase ne sredi.";
    elSlots.appendChild(warn);
  }
}

elPkg.addEventListener("change", async ()=>{
  selectedTime = null;
  btnSend.disabled = true;
  await renderSlots();
  renderSummary();
});

// =====================
// 7) Summary + reset
// =====================
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
  elSlots.innerHTML = `<div class="muted">Izaberi datum da vidiš slobodne termine.</div>`;
  document.querySelectorAll(".day--selected").forEach(x=>x.classList.remove("day--selected"));
  document.querySelectorAll(".slot--selected").forEach(x=>x.classList.remove("slot--selected"));
  renderSummary();
});

// =====================
// 8) Send request (upis + WhatsApp)
// =====================
btnSend.addEventListener("click", async ()=>{
  if(!selected || selectedTime==null) return;

  const phone = (elWhats.value || "").trim();
  if(!phone){
    alert("Upiši WhatsApp broj (npr. 3816...)");
    return;
  }

  const duration = parseInt(elPkg.value,10);
  const packageName = elPkg.options[elPkg.selectedIndex].text;

  const key = dateKey(selected.y, selected.m, selected.d);
  const dateText = niceDate(selected.y, selected.m, selected.d);

  // Ako firebase nije spreman, ipak pošalji WA (ali bez upisa)
  if(!firebaseReady || !db){
    const msg = `Rezervacija ${dateText} Paket: ${packageName} Vreme: ${niceTime(selectedTime)}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    alert("Poslat WhatsApp zahtev (Firebase nije povezan, nije upisano u bazu).");
    return;
  }

  // re-check clash
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

    const msg = `Rezervacija ${dateText} Paket: ${packageName} Vreme: ${niceTime(selectedTime)}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");

    alert("Termin rezervisan!");
    await renderSlots();
  }catch(e){
    console.error("DB write error:", e);
    alert("Ne mogu da upišem termin u bazu. Proveri Firebase Rules.");
  }
});

// =====================
// 9) Admin (opciono, neće rušiti UI)
// =====================
const adminEmail = $("adminEmail");
const adminPass  = $("adminPass");
const adminLogin = $("adminLogin");
const adminList  = $("adminList");
const refreshAdmin = $("refreshAdmin");

async function loadAdmin(){
  if(!firebaseReady || !db){
    adminList.innerHTML = `<div class="muted">Firebase nije povezan.</div>`;
    return;
  }
  adminList.innerHTML = `<div class="muted">Učitavanje...</div>`;

  const snap = await db.ref("bookings").orderByChild("createdAt").once("value");
  const arr = [];
  snap.forEach(s => arr.push({key:s.key, ...s.val()}));
  arr.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));

  if(arr.length===0){
    adminList.innerHTML = `<div class="muted">Nema rezervacija.</div>`;
    return;
  }

  adminList.innerHTML = "";
  for(const b of arr){
    const item = document.createElement("div");
    item.className = "adminItem";
    item.innerHTML = `
      <div class="adminItem__meta">
        <div><b>${b.dateText || b.dateKey}</b> • ${niceTime(b.time)} • ${b.duration} min</div>
        <div class="muted">${b.package}</div>
      </div>
      <button class="danger" type="button">Obriši</button>
    `;
    item.querySelector("button").addEventListener("click", async ()=>{
      await db.ref("bookings/"+b.key).remove();
      await loadAdmin();
      if(selected) await renderSlots();
    });
    adminList.appendChild(item);
  }
}

adminLogin?.addEventListener("click", async ()=>{
  if(!firebaseReady || !auth){
    alert("Firebase nije povezan. Proveri config i Rules.");
    return;
  }
  const email = adminEmail.value.trim();
  const pass  = adminPass.value.trim();
  if(!email || !pass){ alert("Unesi email i šifru."); return; }

  try{
    await auth.signInWithEmailAndPassword(email, pass);
    await loadAdmin();
  }catch(e){
    alert("Login failed: " + e.message);
  }
});

refreshAdmin?.addEventListener("click", loadAdmin);
