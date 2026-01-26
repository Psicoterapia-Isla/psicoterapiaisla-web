// ⚠️ RELLENA CON TUS DATOS
const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
const SUPABASE_KEY = "TU_PUBLIC_ANON_KEY";

const supabase = supabaseJs.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const form = document.getElementById("login-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert("Acceso incorrecto");
  } else {
    window.location.href = "/app/index.html";
  }
});
