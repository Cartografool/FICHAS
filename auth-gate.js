import OBR from "https://esm.sh/@owlbear-rodeo/sdk";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY, OWNER_EMAIL } from "./auth-config.js";

const screen = document.getElementById("auth-screen");
const message = document.getElementById("auth-message");
const form = document.getElementById("login-form");
const errorBox = document.getElementById("login-error");
const submit = document.getElementById("login-submit");
const app = document.getElementById("app-shell");
const STORAGE_KEY = "npc_list";
let supabase;
let activeUser = null;
let saveTimer = null;

function showMessage(text) {
  message.textContent = text;
  form.hidden = true;
}
function showLogin(text = "Entre com a conta autorizada do mestre.") {
  message.textContent = text;
  form.hidden = false;
}
function deny(text) {
  showMessage(text);
  app.style.display = "none";
  screen.style.display = "grid";
}
function unlock() {
  screen.style.display = "none";
  app.style.display = "block";
}

function isOwner(user) {
  return Boolean(user?.email && user.email.toLowerCase() === OWNER_EMAIL.toLowerCase());
}

async function connectPrivateStorage(user) {
  // Busca somente a linha pertencente ao usuário autenticado.
  const { data, error } = await supabase
    .from("fichas_npc")
    .select("npcs")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(`Não foi possível carregar as fichas: ${error.message}`);

  if (data) {
    window.__FICHAS_BRIDGE?.setNpcs(data.npcs);
  } else {
    // Primeira conexão: migra automaticamente os dados locais deste navegador.
    let localNpcs = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(parsed)) localNpcs = parsed;
    } catch (error) {
      console.warn("Cache local inválido; iniciando lista vazia.", error);
    }
    const { error: insertError } = await supabase
      .from("fichas_npc")
      .upsert({ user_id: user.id, npcs: localNpcs, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (insertError) throw new Error(`Não foi possível migrar as fichas para o banco: ${insertError.message}`);
    window.__FICHAS_BRIDGE?.setNpcs(localNpcs);
  }

  activeUser = user;
  // Salva alterações com pequeno atraso para agrupar cliques rápidos.
  window.__FICHAS_REMOTE_SAVE = (npcs) => {
    if (!activeUser) return;
    clearTimeout(saveTimer);
    const snapshot = JSON.parse(JSON.stringify(npcs));
    saveTimer = setTimeout(async () => {
      const { error } = await supabase
        .from("fichas_npc")
        .upsert({ user_id: activeUser.id, npcs: snapshot, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) {
        console.error("Falha ao sincronizar fichas com o Supabase:", error);
        const msg = document.getElementById("auth-message");
        if (msg) msg.textContent = `Atenção: não foi possível sincronizar as últimas alterações (${error.message}).`;
      }
    }, 350);
  };
}

async function authorize(user) {
  if (!isOwner(user)) {
    await supabase.auth.signOut();
    throw new Error("Esta conta não está autorizada a acessar o painel.");
  }
  await connectPrivateStorage(user);
  unlock();
}

async function start() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !OWNER_EMAIL ||
      SUPABASE_URL.includes("SEU-PROJETO") || SUPABASE_ANON_KEY.includes("SUA-CHAVE") ||
      OWNER_EMAIL.includes("COLOQUE-SEU-EMAIL")) {
    deny("Configure o arquivo auth-config.js com o e-mail da conta autorizada.");
    return;
  }
  if (!OBR.isAvailable) {
    deny("Abra esta ferramenta pelo botão FICHAS dentro de uma sala do Owlbear Rodeo.");
    return;
  }
  const role = await OBR.player.getRole();
  if (role !== "GM") {
    deny("Acesso restrito: somente o mestre pode utilizar esta extensão.");
    return;
  }

  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  if (session?.user) {
    try {
      await authorize(session.user);
      return;
    } catch (error) {
      showLogin(error.message || "Entre com a conta autorizada do mestre.");
    }
  } else {
    showLogin();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.textContent = "";
    submit.disabled = true;
    submit.textContent = "Verificando...";
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    try {
      if (email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
        throw new Error("Esta conta não está autorizada a acessar o painel.");
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      document.getElementById("login-password").value = "";
      await authorize(data.user);
    } catch (error) {
      errorBox.textContent = error.message || "Não foi possível entrar. Confira seu e-mail e senha.";
      if (supabase) await supabase.auth.signOut();
    } finally {
      submit.disabled = false;
      submit.textContent = "Entrar";
    }
  });
}

OBR.onReady(() => {
  start().catch((error) => {
    console.error("Falha ao inicializar FICHAS:", error);
    deny(error.message || "Não foi possível verificar o acesso. Recarregue a extensão e tente novamente.");
  });
});
