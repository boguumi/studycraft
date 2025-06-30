
const jetzt = new Date();
const stunde = jetzt.getHours();
const minute = jetzt.getMinutes();
let aktuelleStunde = stunde;
let aktuelleMinute = minute;


let flipclockHour = document.querySelector(".flipclock-hour");
let flipclockMinute = document.querySelector(".flipclock-minutes");


function aktualisiereUhrzeit() {
  const jetzt = new Date();
  const stunde = jetzt.getHours();
  const minute = jetzt.getMinutes();

  let flipclockHour = document.querySelector(".flipclock-hour");
  flipclockHour.textContent = stunde.toString().padStart(2, '0');
  let flipclockMinute = document.querySelector(".flipclock-minutes");
  flipclockMinute.textContent = minute.toString().padStart(2, '0');

  // console.log("Uhrzeit aktualisiert:", stunde, ":", minute);
}

aktualisiereUhrzeit();
setInterval(aktualisiereUhrzeit, 1000);