// =====================
// Firebase config (UBACI SVOJE + databaseURL)
// =====================
const firebaseConfig = {
  apiKey: "AIzaSyC10IWy6vUrqwIXtugXSdQoXEoaeKlcFu0",
  https://mobilnopranje-d60f6-default-rtdb.europe-west1.firebasedatabase.app/
  authDomain: "mobilnopranje-d60f6.firebaseapp.com",
  databaseURL: "https://mobilnopranje-d60f6-default-rtdb.firebaseio.com", // <-- PROVERI U CONSOLE
  projectId: "mobilnopranje-d60f6",
  storageBucket: "mobilnopranje-d60f6.appspot.com",
  messagingSenderId: "862210046561",
  appId: "1:862210046561:web:a073eb551cdff9199dc820"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// =====================
// FAQ toggle
// =====================
document.querySelectorAll("[data-faq]").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const ans = btn.nextElementSibling;
    const icon = btn.querySelector(".faq__icon");
    const open = ans.style.display === "block";
    ans.style.display = open ? "none" : "block";
    icon.textContent = open ? "+" : "–";
    if(!open){
      btn.style.borderRadius = "16px 16px 0 0";
      ans.style.borderRadius = "0 0 16px 16px";
    } else {
      btn.style.borderRadius = "16px";
    }
  });
});

// =====================
// Booking UI elements
// =====================
const elTitle = document.getElementById("calTitle");
const elDow   = document.getElementById("dow");
const elGrid  = document.getElementById("calGrid");

const elPkg   = document.getElementById("pkg");
const elWhats = document.getElementById("whats");
const elSlots = document.getElementById("slots");

const elInfo  = document.getElementById("selectedInfo");
const elSumDate = document.getElementById("sumDate");
const elSumTime = document.getElementById("sumTime");
const elSumPkg  = document.getElementById("sumPkg");

const btnSend = document.getElementById("sendReq");
const btnReset = document.getElementById("reset");

document.getElementById("prevMonth").addEventListener("click", ()=>{ viewMonth(-1); });
document.getElementById("nextMonth").addEventListener("click", ()=>{ viewMonth(1); });

// =====================
// Booking state
// =====================
const START_HOUR = 17;
const END_HOUR = 22;
const STEP_MIN = 30;

let view = new Date();
view.setDate(1);

let selected = null;      // {y,m,d}
let selectedTime = null;  // minutes from 00:00

const DOW = ["Pon","Uto","Sre","Čet","Pet","Sub","Ned"];
renderDow();
renderCalendar();
renderSummary();

// =====================
// Helpers
// =====================
function pad2(n){ return String(n).padStart(2,"0"); }
function monthTitle(dt){ return dt.toLocaleString("sr-RS",{month:"long",year:"numeric"}); }
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

// =====================
// Calendar rendering
// =====================
function renderCalendar(){
  elTitle.textContent = monthTitle(view);
  elGrid.innerHTML = "";

  const y = view.getFullYear();
  const m = view.getMonth();

  const first = new Date(y,m,1);
  let startIndex = first.getDay();           // 0=ned
  startIndex = (startIndex===0) ? 6 : startIndex-1; // pon=0

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

    if(isPast(y,m,d)){
      cell.classList.add("day--disabled");
    } else {
      cell.addEventListener("click", async ()=>{
        selected = {y,m,d};
        selectedTime = null;
        document.querySelectorAll(".day--selected").forEach(x=>x.classList.remove("day--selected"));
        cell.classList.add("day--selected");
        elInfo.textContent = `Izabran datum: ${niceDate(y,m,d)}. Izaberi vreme.`;
        await renderSlots();
        renderSummary();
      });
    }

    if(selected && selected.y===y && selected.m===m && selected.d===d){
      cell.classList.add("day--selected");
    }

    elGrid.appendChild(cell);
  }
}

// =====================
// Slots rendering (clickable buttons)
// =====================
async function renderSlots(){
  elSlots.innerHTML = "";
  btnSend.disabled = true;

  if(!selected){
    elSlots.innerHTML = `<div class="muted">Izaberi datum da vidiš slobodne termine.</div>`;
    return;
  }

  const duration = parseInt(elPkg.value,10);
  const key = dateKey(selected.y, selected.m, selected.d);

  // Read bookings for that day
  const snap = await db.ref("bookings").orderByChild("dateKey").equalTo(key).once("value");
  const bookings = [];
  snap.forEach(s => bookings.push(s.val()));

  let hasAny = false;

  for(let h=START_HOUR; h<END_HOUR; h++){
    for(let mm of [0, STEP_MIN]){
      const start = h*60 + mm;
      const end = start + duration;
      if(end > END_HOUR*60) continue;

      const clash = bookings.some(b => start < (b.time + b.duration) && end > b.time);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "slot";
      btn.textContent = niceTime(start);

      if(clash){
        btn.classList.add("slot--disabled");
        btn.disabled = true;
      } else {
        hasAny = true;
        btn.addEventListener("click", ()=>{
          document.querySelectorAll(".slot--selected").forEach(x=>x.classList.remove("slot--selected"));
          btn.classList.add("slot--selected");
          selectedTime = start;
          btnSend.disabled = false;
          renderSummary();
        });
      }

      // keep selected highlight on rerender
      if(selectedTime === start){
        btn.classList.add("slot--selected");
        btnSend.disabled = false;
      }

      elSlots.appendChild(btn);
    }
  }

  if(!hasAny){
    elSlots.innerHTML = `<div class="muted">Nema slobodnih termina za ovaj datum (za izabrani paket).</div>`;
  }
}

// Re-render slots when package changes
elPkg.addEventListener("change", async ()=>{
  selectedTime = null;
  btnSend.disabled = true;
  await renderSlots();
  renderSummary();
});

// Reset
btnReset.addEventListener("click", ()=>{
  selected = null;
  selectedTime = null;
  btnSend.disabled = true;
  elInfo.textContent = "Izaberi datum.";
  elSlots.innerHTML = `<div class="muted">Izaberi datum da vidiš slobodne termine.</div>`;
  document.querySelectorAll(".day--selected").forEach(x=>x.classList.remove("day--selected"));
  renderSummary();
});

// Summary
function renderSummary(){
  elSumDate.textContent = selected ? niceDate(selected.y,selected.m,selected.d) : "—";
  elSumTime.textContent = (selectedTime!=null) ? niceTime(selectedTime) : "—";
  elSumPkg.textContent = elPkg.options[elPkg.selectedIndex]?.text || "—";
}

// =====================
// Send request (Firebase + WhatsApp)
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

  // Re-check clash just before write
  const snap = await db.ref("bookings").orderByChild("dateKey").equalTo(key).once("value");
  const bookings = [];
  snap.forEach(s => bookings.push(s.val()));

  const end = selectedTime + duration;
  const clash = bookings.some(b => selectedTime < (b.time + b.duration) && end > b.time);
  if(clash){
    alert("Upravo je zauzet taj termin. Izaberi drugi.");
    await renderSlots();
    return;
  }

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
});

// =====================
// ADMIN
// =====================
const adminEmail = document.getElementById("adminEmail");
const adminPass  = document.getElementById("adminPass");
const adminLogin = document.getElementById("adminLogin");
const adminList  = document.getElementById("adminList");
const refreshAdmin = document.getElementById("refreshAdmin");

adminLogin.addEventListener("click", async ()=>{
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

refreshAdmin.addEventListener("click", loadAdmin);

async function loadAdmin(){
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
      // refresh booking UI if date selected
      if(selected) await renderSlots();
    });

    adminList.appendChild(item);
  }
}
