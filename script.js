// ---------------- FIREBASE ----------------
var firebaseConfig = {
  apiKey: "AIzaSyC10IWy6vUrqwIXtugXSdQoXEoaeKlcFu0",
  authDomain: "mobilnopranje-d60f6.firebaseapp.com",
  projectId: "mobilnopranje-d60f6",
  storageBucket: "mobilnopranje-d60f6.firebasestorage.app",
  messagingSenderId: "862210046561",
  appId: "1:862210046561:web:a073eb551cdff9199dc820"
};
};
firebase.initializeApp(firebaseConfig);
var db = firebase.database();
var auth = firebase.auth();

// ---------------- NAV ----------------
function scrollToSection(id){
  document.getElementById(id).scrollIntoView({behavior:"smooth"});
}

// ---------------- FAQ ----------------
function toggleFAQ(el){
  let p=el.nextElementSibling;
  p.style.display = (p.style.display==="block")?"none":"block";
}

// ---------------- MODAL ----------------
const bookingModal = document.getElementById("bookingModal");
const adminModal = document.getElementById("adminModal");

function openBooking(){bookingModal.style.display="block"; renderCalendar();}
function closeBooking(){bookingModal.style.display="none";}
function openAdmin(){adminModal.style.display="block";}
function closeAdmin(){adminModal.style.display="none";}

// ---------------- CALENDAR ----------------
let currentDate = new Date();
let selectedDate = null;
const monthYear = document.getElementById("monthYear");
const calendarGrid = document.getElementById("calendarGrid");
const packageSelect = document.getElementById("packageSelect");
const timeSelect = document.getElementById("timeSelect");
const confirmBtn = document.getElementById("confirmBooking");

function renderCalendar(){
  calendarGrid.innerHTML = "";
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  monthYear.innerText = currentDate.toLocaleString("sr-RS",{month:"long", year:"numeric"});

  const firstDay = new Date(year,month,1).getDay();
  const daysInMonth = new Date(year,month+1,0).getDate();
  const today = new Date();
  today.setHours(0,0,0,0);

  for(let i=0;i<firstDay;i++){
    let empty = document.createElement("div");
    calendarGrid.appendChild(empty);
  }

  for(let d=1;d<=daysInMonth;d++){
    let dayDiv = document.createElement("div");
    dayDiv.className="day";
    dayDiv.innerText=d;
    const thisDate = new Date(year,month,d);
    if(thisDate < today) dayDiv.classList.add("disabled");
    else dayDiv.onclick=()=>selectDate(d,month,year,dayDiv);
    calendarGrid.appendChild(dayDiv);
  }
}

function changeMonth(step){
  currentDate.setMonth(currentDate.getMonth()+step);
  renderCalendar();
}

function selectDate(day,month,year,element){
  document.querySelectorAll(".day").forEach(d=>d.classList.remove("selected"));
  element.classList.add("selected");
  selectedDate={day,month,year};
  populateTimes();
}

// ---------------- TIME ----------------
function populateTimes(){
  timeSelect.innerHTML="";
  if(!selectedDate) return;
  const dateStr=`${selectedDate.day}/${selectedDate.month+1}/${selectedDate.year}`;
  const duration=parseInt(packageSelect.value);

  db.ref("bookings").once("value",snap=>{
    let dayBookings=[];
    snap.forEach(s=>{
      if(s.val().date===dateStr) dayBookings.push(s.val());
    });

    let available=false;
    for(let h=17; h<22; h++){
      for(let m of [0,30]){
        const start=h*60+m;
        const end=start+duration;
        const clash=dayBookings.some(b=>start<(b.time+b.duration)&&end>b.time);
        let option=document.createElement("option");
        option.value=start;
        option.innerText=`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
        if(clash){option.disabled=true; option.innerText+=" (zauzeto)";}
        else available=true;
        timeSelect.appendChild(option);
      }
    }
    confirmBtn.disabled = !available;
  });
}

packageSelect.addEventListener("change",()=>{if(selectedDate) populateTimes();});

// ---------------- CONFIRM ----------------
confirmBtn.addEventListener("click",()=>{
  if(!selectedDate || !timeSelect.value){alert("Izaberite datum i vreme"); return;}
  const packageName = packageSelect.options[packageSelect.selectedIndex].text;
  const timeVal = parseInt(timeSelect.value);
  const duration = parseInt(packageSelect.value);
  const dateStr = `${selectedDate.day}/${selectedDate.month+1}/${selectedDate.year}`;

  db.ref("bookings").push({date:dateStr, time:timeVal, duration:duration, package:packageName});
  alert("Termin rezervisan!");
  window.open(`https://wa.me/381668009318?text=Rezervacija ${dateStr} Paket: ${packageName} Vreme: ${Math.floor(timeVal/60)}:${(timeVal%60).toString().padStart(2,'0')}`);
  closeBooking();
});

// ---------------- ADMIN ----------------
function loginAdmin(){
  const email = document.getElementById("adminEmail").value;
  const pass = document.getElementById("adminPass").value;
  auth.signInWithEmailAndPassword(email,pass)
  .then(()=>{
    document.getElementById("adminContent").classList.remove("hidden");
    loadAdmin();
  })
  .catch(e=>alert("Login failed: "+e.message));
}

function loadAdmin(){
  db.ref("bookings").once("value",snap=>{
    const container=document.getElementById("adminBookings");
    container.innerHTML="";
    snap.forEach(s=>{
      const b = s.val();
      const div=document.createElement("div");
      div.innerHTML=`${b.date} - ${Math.floor(b.time/60)}:${(b.time%60).toString().padStart(2,'0')} Paket: ${b.package} 
      <button onclick="deleteBooking('${s.key}')">Obriši</button>`;
      container.appendChild(div);
    });
  });
}

function deleteBooking(key){db.ref("bookings/"+key).remove(); loadAdmin();}
