/* =========================================================================
   GATOLAND — lógica do jogo (vanilla JS)
   Calibre tudo em CONFIG, CATS e RARIDADES aqui no topo.
   ========================================================================= */

const SCHEMA_VERSION = 2;              // subiu p/ 2: entraram novos gatos
const STORAGE_KEY = 'gatoland:v1';

const CONFIG = {
  energiaMax: 10,
  energiaInicial: 10,
  custoGiro: 1,
  regenMs: 5 * 60 * 1000,   // +1 energia a cada 5 min
  racaoPorEnergia: 3,       // custo em ração pra comprar +1 energia
  copiasPorNivel: 3,        // cada N cópias sobe 1 nível do gato
};

// Raridades: peso = chance relativa no sorteio; racao = quanto uma duplicata rende.
const RARIDADES = {
  comum:    { nome:'Comum',    peso:60, racao:1 },
  raro:     { nome:'Raro',     peso:25, racao:3 },
  epico:    { nome:'Épico',    peso:12, racao:6 },
  lendario: { nome:'Lendário', peso:3,  racao:15 },
};
const ORDEM_RARIDADE = ['comum','raro','epico','lendario'];

// Os 16 gatinhos. 'attrs' já fica pronto pro futuro deck de batalha.
const CATS = [
  // --- Comuns ---
  { id:'bolado',  nome:'GatoBolado',  raridade:'comum', img:'img/gato-bolado.png',  attrs:{atk:5,def:7,vel:4,vida:20} },
  { id:'timido',  nome:'GatoTímido',  raridade:'comum', img:'img/gato-timido.png',  attrs:{atk:3,def:9,vel:5,vida:21} },
  { id:'banho',   nome:'GatoBanho',   raridade:'comum', img:'img/gato-banho.png',   attrs:{atk:6,def:6,vel:5,vida:20} },
  { id:'soneca',  nome:'GatoSoneca',  raridade:'comum', img:'img/gato-soneca.png',  attrs:{atk:4,def:7,vel:2,vida:26} },
  { id:'bagre',   nome:'GatoBagre',   raridade:'comum', img:'img/gato-bagre.png',   attrs:{atk:7,def:5,vel:4,vida:19} },
  { id:'serio',   nome:'GatoSério',   raridade:'comum', img:'img/gato-serio.png',   attrs:{atk:6,def:8,vel:3,vida:22} },
  // --- Raros ---
  { id:'ble',     nome:'GatoBlé',     raridade:'raro',  img:'img/gato-ble.png',     attrs:{atk:7,def:6,vel:8,vida:22} },
  { id:'lele',    nome:'GatoLelé',    raridade:'raro',  img:'img/gato-lele.png',    attrs:{atk:8,def:4,vel:9,vida:20} },
  { id:'zoio',    nome:'GatoZóio',    raridade:'raro',  img:'img/gato-zoio.png',    attrs:{atk:6,def:7,vel:8,vida:23} },
  { id:'sorriso', nome:'GatoSorriso', raridade:'raro',  img:'img/gato-sorriso.png', attrs:{atk:7,def:7,vel:7,vida:24} },
  { id:'doido',   nome:'GatoDoido',   raridade:'raro',  img:'img/gato-doido.png',   attrs:{atk:11,def:3,vel:9,vida:18} },
  // --- Épicos ---
  { id:'gritante',    nome:'GatoGritante',    raridade:'epico', img:'img/gato-gritante.png',    attrs:{atk:10,def:5,vel:7,vida:24} },
  { id:'romantico',   nome:'GatoRomântico',   raridade:'epico', img:'img/gato-romantico.png',   attrs:{atk:8,def:8,vel:7,vida:26} },
  { id:'inteligente', nome:'GatoInteligente', raridade:'epico', img:'img/gato-inteligente.png', attrs:{atk:9,def:8,vel:8,vida:25} },
  // --- Lendários ---
  { id:'olhudo',     nome:'GatoOlhudo',     raridade:'lendario', img:'img/gato-olhudo.png',     attrs:{atk:9,def:9,vel:9,vida:30} },
  { id:'ibuprofeno', nome:'GatoIbuprofeno', raridade:'lendario', img:'img/gato-ibuprofeno.png', attrs:{atk:7,def:10,vel:6,vida:34} },
];

/* ---------------------------------------------------------------- estado */
let state = carregar();

function estadoNovo(){
  return { schema:SCHEMA_VERSION, energia:CONFIG.energiaInicial, racao:0, ultimaRegen:Date.now(), colecao:{} };
}
function carregar(){
  try{
    const bruto = localStorage.getItem(STORAGE_KEY);
    if(!bruto) return estadoNovo();
    const s = JSON.parse(bruto);
    if(s.schema !== SCHEMA_VERSION){
      // migração leve: preserva coleção/recursos, atualiza versão
      s.schema = SCHEMA_VERSION;
      s.colecao = s.colecao || {};
      if(typeof s.energia !== 'number') s.energia = CONFIG.energiaInicial;
      if(typeof s.racao !== 'number') s.racao = 0;
      if(typeof s.ultimaRegen !== 'number') s.ultimaRegen = Date.now();
    }
    return s;
  }catch(e){ return estadoNovo(); }
}
function salvar(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

/* ------------------------------------------------------------- energia */
function regenerarEnergia(){
  if(state.energia >= CONFIG.energiaMax){ state.ultimaRegen = Date.now(); return; }
  const agora = Date.now();
  const ganhos = Math.floor((agora - state.ultimaRegen) / CONFIG.regenMs);
  if(ganhos > 0){
    state.energia = Math.min(CONFIG.energiaMax, state.energia + ganhos);
    state.ultimaRegen += ganhos * CONFIG.regenMs;
    if(state.energia >= CONFIG.energiaMax) state.ultimaRegen = agora;
    salvar();
  }
}
function msProximaEnergia(){
  if(state.energia >= CONFIG.energiaMax) return 0;
  return CONFIG.regenMs - (Date.now() - state.ultimaRegen);
}

/* -------------------------------------------------------------- sorteio */
function sortearRaridade(){
  const total = Object.values(RARIDADES).reduce((a,r)=>a+r.peso,0);
  let roll = Math.random() * total;
  for(const [id,r] of Object.entries(RARIDADES)){ roll -= r.peso; if(roll <= 0) return id; }
  return 'comum';
}
function sortearGato(){
  const rar = sortearRaridade();
  const pool = CATS.filter(c => c.raridade === rar);
  const lista = pool.length ? pool : CATS;
  return lista[Math.floor(Math.random() * lista.length)];
}
function gatoVisual(){ return CATS[Math.floor(Math.random()*CATS.length)]; }

function nivelDoGato(id){
  const c = state.colecao[id];
  return c ? 1 + Math.floor((c.copias - 1) / CONFIG.copiasPorNivel) : 0;
}

function registrarGanho(gato){
  const jaTinha = !!state.colecao[gato.id];
  if(!jaTinha){ state.colecao[gato.id] = { copias:1 }; salvar(); return { gato, duplicata:false, racaoGanha:0 }; }
  state.colecao[gato.id].copias += 1;
  const racaoGanha = RARIDADES[gato.raridade].racao;
  state.racao += racaoGanha;
  salvar();
  return { gato, duplicata:true, racaoGanha };
}

/* =========================================================================
   UI
   ========================================================================= */
const $ = sel => document.querySelector(sel);
const trilho   = $('#trilho');
const janela   = document.querySelector('.roleta-janela');
const btnGirar = $('#btn-girar');
const btnTrocar= $('#btn-trocar');
const btnReset = $('#btn-reset');
const aviso    = $('#aviso');
const resultado= $('#resultado');

let girando = false;

/* ----------------------------------------------------- troca de abas */
document.querySelectorAll('.aba').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.aba').forEach(b=>b.classList.remove('ativa'));
    document.querySelectorAll('.painel').forEach(p=>p.classList.remove('ativo'));
    btn.classList.add('ativa');
    $('#aba-' + btn.dataset.aba).classList.add('ativo');
    window.scrollTo({ top:0, behavior:'smooth' });
  });
});

function render(){
  regenerarEnergia();
  $('#energia-valor').textContent = state.energia;
  $('#energia-max').textContent   = CONFIG.energiaMax;
  $('#energia-barra').style.width = (state.energia / CONFIG.energiaMax * 100) + '%';
  $('#racao-valor').textContent   = state.racao;
  $('#total-gatos').textContent   = CATS.length;
  $('#coletados').textContent     = Object.keys(state.colecao).length;

  const t = $('#energia-timer');
  if(state.energia >= CONFIG.energiaMax){ t.textContent = 'cheia'; }
  else{
    const ms = msProximaEnergia();
    const min = Math.floor(ms/60000), seg = Math.floor((ms%60000)/1000);
    t.textContent = `+1 em ${min}:${String(seg).padStart(2,'0')}`;
  }

  btnGirar.disabled = girando || state.energia < CONFIG.custoGiro;
  if(!girando) btnGirar.textContent = state.energia < CONFIG.custoGiro ? 'SEM ENERGIA' : `GIRAR (−${CONFIG.custoGiro} ⚡)`;
  btnTrocar.disabled = girando || state.racao < CONFIG.racaoPorEnergia || state.energia >= CONFIG.energiaMax;
  btnTrocar.title = `Troca ${CONFIG.racaoPorEnergia} ração por 1 ⚡`;

  renderColecao();
}

/* ------------------------------------- GatoPédia agrupada por raridade */
function renderColecao(){
  const wrap = $('#colecao');
  wrap.innerHTML = '';
  for(const rar of ORDEM_RARIDADE){
    const gatos = CATS.filter(c => c.raridade === rar);
    if(!gatos.length) continue;
    const temNoTier = gatos.filter(c => state.colecao[c.id]).length;

    const grupo = document.createElement('div');
    grupo.innerHTML = `
      <div class="pedia-grupo-titulo t-${rar}">
        ${RARIDADES[rar].nome} <span class="cont">· ${temNoTier}/${gatos.length}</span>
      </div>`;
    const grid = document.createElement('div');
    grid.className = 'pedia-grid';

    for(const c of gatos){
      const tem = state.colecao[c.id];
      const card = document.createElement('div');
      card.className = `gato-card ${tem ? 'r-'+c.raridade : 'bloqueado'}`;
      if(tem){
        card.innerHTML = `
          <span class="selo">${tem.copias}x</span>
          <img src="${c.img}" alt="${c.nome}" />
          <span class="nome">${c.nome}</span>
          <span class="meta">Nível ${nivelDoGato(c.id)}</span>`;
      }else{
        card.innerHTML = `
          <img src="${c.img}" alt="???" />
          <span class="nome">???</span>
          <span class="meta">não descoberto</span>`;
      }
      grid.appendChild(card);
    }
    grupo.appendChild(grid);
    wrap.appendChild(grupo);
  }
}

/* -------------------------------------------------- animação da roleta */
const CELULAS_ESTEIRA = 55;
const INDICE_VENCEDOR = 48;

function montarEsteira(vencedor){
  trilho.innerHTML = '';
  for(let i=0;i<CELULAS_ESTEIRA;i++){
    const gato = (i === INDICE_VENCEDOR) ? vencedor : gatoVisual();
    const cel = document.createElement('div');
    cel.className = `celula r-${gato.raridade}`;
    cel.innerHTML = `<img src="${gato.img}" alt="${gato.nome}" />`;
    trilho.appendChild(cel);
  }
}

function girar(){
  if(girando) return;
  regenerarEnergia();
  if(state.energia < CONFIG.custoGiro){ render(); return; }

  girando = true;
  aviso.textContent = '';
  resultado.classList.add('oculto');

  if(state.energia >= CONFIG.energiaMax) state.ultimaRegen = Date.now();
  state.energia -= CONFIG.custoGiro;
  salvar();
  render();

  const vencedor = sortearGato();
  montarEsteira(vencedor);

  trilho.style.transition = 'none';
  trilho.style.transform = 'translateX(0)';
  void trilho.offsetWidth;

  const cel = trilho.children[INDICE_VENCEDOR];
  const alvo = cel.offsetLeft + cel.offsetWidth/2 - janela.offsetWidth/2;
  const jitter = (Math.random() - 0.5) * cel.offsetWidth * 0.55;
  const desloc = -(alvo + jitter);

  requestAnimationFrame(()=>{
    trilho.style.transition = 'transform 5s cubic-bezier(.11,.78,.16,1)';
    trilho.style.transform = `translateX(${desloc}px)`;
  });

  trilho.addEventListener('transitionend', ()=>finalizarGiro(vencedor), { once:true });
}

function finalizarGiro(vencedor){
  const r = registrarGanho(vencedor);
  mostrarResultado(r);
  girando = false;
  salvar();
  render();
}

function mostrarResultado({ gato, duplicata, racaoGanha }){
  const rar = RARIDADES[gato.raridade];
  let linha;
  if(!duplicata){
    linha = `<strong>Novo gatinho!</strong> entrou pra GatoPédia.`;
    if(gato.raridade === 'lendario') aviso.textContent = '✨ LENDÁRIO! Que sorte.';
  }else{
    linha = `Duplicata → <strong>+${racaoGanha} 🍖 ração</strong> e subiu pro nível ${nivelDoGato(gato.id)}.`;
  }
  resultado.className = 'resultado';
  resultado.innerHTML = `
    <img src="${gato.img}" alt="${gato.nome}" />
    <div class="r-txt">
      <h3>${gato.nome}</h3>
      <span class="tag t-${gato.raridade}">${rar.nome}</span>
      <p>${linha}</p>
    </div>`;
}

/* -------------------------------------------------------- ações do HUD */
function trocarRacao(){
  if(state.racao < CONFIG.racaoPorEnergia || state.energia >= CONFIG.energiaMax) return;
  state.racao -= CONFIG.racaoPorEnergia;
  state.energia = Math.min(CONFIG.energiaMax, state.energia + 1);
  salvar();
  render();
}
function resetar(){
  if(!confirm('Apagar todo o progresso neste navegador?')) return;
  state = estadoNovo();
  salvar();
  resultado.classList.add('oculto');
  aviso.textContent = '';
  render();
}

btnGirar.addEventListener('click', girar);
btnTrocar.addEventListener('click', trocarRacao);
btnReset.addEventListener('click', resetar);

montarEsteira(gatoVisual());
render();
setInterval(()=>{ if(!girando) render(); }, 1000);
