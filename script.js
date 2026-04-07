// EMAILJS INIT
(function(){
  emailjs.init("YOUR_PUBLIC_KEY");
})();

const send = document.getElementById("send");
const status = document.getElementById("status");

send.onclick = async ()=>{

  const phone = document.getElementById("phone").value;
  const pkg = document.getElementById("pkg").value;

  status.innerText = "Slanje...";

  try{

    await emailjs.send("YOUR_SERVICE","YOUR_TEMPLATE",{
      phone: phone,
      package: pkg
    });

    status.innerText = "✅ Poslato!";

  }catch(e){
    status.innerText = "❌ Greška";
    console.log(e);
  }
};

// klik na paket
document.querySelectorAll(".card").forEach(c=>{
  c.onclick = ()=>{
    document.getElementById("pkg").value = c.dataset.pkg;
    location.href="#booking";
    document.body.classList.add("blur");
  };
});

// ukloni blur kad kliknes gore
document.querySelectorAll('a[href="#home"]').forEach(a=>{
  a.onclick = ()=>{
    document.body.classList.remove("blur");
  };
});
