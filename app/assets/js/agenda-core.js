// agenda-core.js

export function createAgendaEngine({
  grid,
  weekLabel,
  baseDateRef,
  mode,
  availability,
  appointments,
  onSlotClick,
  onAppointmentClick
}) {

  const HOURS = Array.from({ length: 12 }, (_, i) => i + 9);
  const MINUTES = [0, 30];
  const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];

  const pad = n => String(n).padStart(2,"0");
  const formatDate = d => d.toISOString().slice(0,10);

  function mondayOf(d){
    const x = new Date(d);
    const n = (x.getDay()+6)%7;
    x.setDate(x.getDate()-n);
    x.setHours(0,0,0,0);
    return x;
  }

  function timeString(h,m){
    return `${pad(h)}:${pad(m)}`;
  }

  function minutesOf(time){
    const [h,m] = time.split(":").map(Number);
    return h*60 + m;
  }

  async function render(){

    grid.innerHTML = "";

    const monday = mondayOf(baseDateRef.value);

    weekLabel.textContent =
      monday.toLocaleDateString("es-ES",{day:"numeric",month:"short"}) +
      " – " +
      new Date(monday.getTime()+6*86400000)
        .toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"});

    grid.appendChild(document.createElement("div"));

    DAYS.forEach((_,i)=>{
      const d = new Date(monday);
      d.setDate(d.getDate()+i);

      const el = document.createElement("div");
      el.className="day-label";
      el.textContent =
        d.toLocaleDateString("es-ES",{weekday:"short",day:"numeric"});
      grid.appendChild(el);
    });

    HOURS.forEach(hour=>{
      MINUTES.forEach(minute=>{

        const label = document.createElement("div");
        label.className="hour-label";
        label.textContent = timeString(hour,minute);
        grid.appendChild(label);

        DAYS.forEach((day,dayIndex)=>{

          const date = formatDate(
            new Date(monday.getTime()+dayIndex*86400000)
          );

          const cell = document.createElement("div");
          cell.className="slot";

          const appointment = appointments.find(a=>{
            if(a.date !== date) return false;
            const cur = hour*60+minute;
            return cur>=minutesOf(a.start) && cur<minutesOf(a.end);
          });

          if(appointment){
            cell.classList.add(
              appointment.paid ? "paid" :
              appointment.completed ? "done" : "busy"
            );
            cell.innerHTML = `<strong>${appointment.name||appointment.patientName||"—"}</strong>`;
            cell.onclick = ()=>onAppointmentClick?.(appointment);
          }
          else {

            const slotKey = `${day}_${hour}_${minute}`;

            if(availability?.[slotKey]){
              cell.classList.add("available");
              cell.onclick = ()=>onSlotClick?.({
                date,
                hour,
                minute,
                dayKey: day
              });
            }
            else {
              cell.classList.add("disabled");
            }
          }

          grid.appendChild(cell);
        });

      });
    });

  }

  return { render };
}
