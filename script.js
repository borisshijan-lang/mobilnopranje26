// booking.js

// --- Helperi ---
function $(id){ return document.getElementById(id); }
function pad2(n){ return String(n).padStart(2,"0"); }
function dateKey(y,m,d){ return `${y}-${pad2(m+1)}-${pad2(d)}`; }
function niceDate(y,m,d){ return `${pad2(d)}/${pad2(m+1)}/${y}`; }
function niceTime(min){ const h=Math.floor(min/60); const m=min%60; return `${pad2(h)}:${pad2(m)}`; }
function isPast(y,m,d){ const now=new Date(); const today=new Date(now.getFullYear(),now.getMonth(),now.getDate()); return new Date(y,m,d)<today; }

// --- Focus / blur ---
const focusOverlay = $("focusOverlay");
function enableFocus(){ document.body.classList.add("focus-active"); }
function disableFocus(){ document.body.classList.remove("focus-active"); }
focusOverlay?.addEventListener("click", disableFocus);
window.addEventListener("scroll", disableFocus);

// --- Calendar ---
const elTitle = $("calTitle");
const elDow = $("dow");
const elGrid = $("calGrid");
const DOW = ["Pon","Uto","Sre","Čet","Pet","Sub","Ned"];

let view = new Date();
view.setDate(1);
let selected = null;
let selectedTime = null;
const START_HOUR=17, END_HOUR=22;

function renderDow(){ elDow.innerHTML=""; DOW.forEach(d=>{ const div=document.createElement("div"); div.textContent=d; elDow.appendChild(div); }); }
function viewMonth(step){ view.setMonth(view.getMonth()+step); renderCalendar(); }

function renderCalendar(){
  elTitle.textContent=`${view.toLocaleString("sr-Latn-RS",{month:"long",year:"numeric"})}`;
  elGrid.innerHTML="";
  const y=view.getFullYear(), m=view.getMonth();
  const first=new Date(y,m,1);
  let startIndex = first.getDay(); startIndex = (startIndex===0)?6:startIndex-1;
  const daysInMonth = new Date(y,m+1,0).getDate();

  for(let i=0;i<startIndex;i++){ const empty=document.createElement("div"); empty.className="day day--empty"; elGrid.appendChild(empty); }
  for(let d=1; d<=daysInMonth; d++){
    const cell=document.createElement("div"); cell.className="day"; cell.textContent=d;
    cell.dataset.y=y; cell.dataset.m=m; cell.dataset.d=d;
    if(isPast(y,m,d)) cell.classList.add("day--disabled");
    if(selected && selected.y===y && selected.m===m && selected.d===d) cell.classList.add("day--selected");
    elGrid.appendChild(cell);
  }
}

// --- Slots ---
const elSlots = $("slots");
function renderSlotsPlaceholder(){ elSlots.innerHTML="Izaberi datum da vidiš slobodne termine."; }
function renderSlots(){
  if(!selected){ renderSlotsPlaceholder(); return; }
  elSlots.innerHTML="";
  const duration=parseInt($("pkg").value,10);
  const step=duration;
  const dayStart=START_HOUR*60, dayEnd=END_HOUR*60;

  for(let start=dayStart; start+duration<=dayEnd; start+=step){
    const btn=document.createElement("button"); btn.type="button"; btn.className="slot"; btn.textContent=niceTime(start);
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".slot--selected").forEach(x=>x.classList.remove("slot--selected"));
      btn.classList.add("slot--selected");
      selectedTime=start;
      $("sendReq").disabled=false;
      renderSummary();
      disableFocus();
    });
    elSlots.appendChild(btn);
  }
}

// --- Summary ---
function renderSummary(){
  $("sumDate").textContent=selected?niceDate(selected.y,selected.m,selected.d):"—";
  $("sumTime").textContent=(selectedTime!=null)?niceTime(selectedTime):"—";
  $("sumPkg").textContent=$("pkg").options[$("pkg").selectedIndex]?.text||"—";
}

// --- Paket select ---
$("pkg").addEventListener("change", ()=>{
  selectedTime=null; $("sendReq").disabled=true; renderSummary(); renderSlots();
});

// --- Calendar click ---
elGrid.addEventListener("click",(e)=>{
  const cell=e.target.closest(".day");
  if(!cell || cell.classList.contains("day--empty") || cell.classList.contains("day--disabled")) return;
  selected={y:parseInt(cell.dataset.y,10), m:parseInt(cell.dataset.m,10), d:parseInt(cell.dataset.d,10)};
  selectedTime=null;
  document.querySelectorAll(".day--selected").forEach(x=>x.classList.remove("day--selected"));
  cell.classList.add("day--selected");
  renderSummary();
  renderSlots();
  enableFocus();
});

// --- Send request (EmailJS) ---
emailjs.init("TVOJ_PUBLIC_KEY"); // stavi svoj key

$("sendReq").addEventListener("click", async ()=>{
  const statusLine=$("statusLine"); statusLine.textContent="";
  const phone=$("phone").value.trim();
  const pkg=$("pkg"); const duration=parseInt(pkg.value,10);
  const packageName=pkg.options[pkg.selectedIndex].text;

  if(!selected || selectedTime==null){ statusLine.textContent="Izaberi datum i vreme."; return; }
  if(!phone.match(/^[0-9+\-\/\s()]+$/)){ statusLine.textContent="Unesi ispravan kontakt telefon."; return; }

  statusLine.textContent="Slanje zahteva...";
  $("sendReq").disabled=true;

  try{
    await emailjs.send("TVOJ_SERVICE_ID","TVOJ_TEMPLATE_ID",{
      date: `${pad2(selected.d)}/${pad2(selected.m+1)}/${selected.y}`,
      time: niceTime(selectedTime),
      package: packageName,
      phone: phone
    });
    statusLine.textContent="✅ Zahtev poslat!";
    selected=null; selectedTime=null;
    $("slots").innerHTML=""; $("sumDate").textContent="—"; $("sumTime").textContent="—"; $("sumPkg").textContent="—";
    $("phone").value=""; disableFocus();
  }catch(e){ console.error(e); statusLine.textContent="Greška pri slanju. Pokušaj ponovo."; $("sendReq").disabled=false; }
});

// --- Reset dugme ---
$("reset").addEventListener("click", ()=>{
  selected=null; selectedTime=null;
  $("slots").innerHTML=""; $("sumDate").textContent="—"; $("sumTime").textContent="—"; $("sumPkg").textContent="—";
  $("phone").value=""; $("statusLine").textContent=""; disableFocus();
});

// --- Init ---
renderDow(); renderCalendar(); renderSlotsPlaceholder();
