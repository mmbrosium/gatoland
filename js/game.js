/* =========================================================================
   GATOLAND — lógica do jogo (vanilla JS)
   Calibre tudo em CONFIG, CATS e RARIDADES.
   ========================================================================= */

const SCHEMA_VERSION = 2;
const STORAGE_KEY = 'gatoland:v1';

const CONFIG = {
  energiaMax: 10, energiaInicial: 10, custoGiro: 1,
  regenMs: 5 * 60 * 1000, racaoPorEnergia: 3, copiasPorNivel: 3,
};

const RARIDADES = {
  comum:    { nome:'Comum',    peso:60, racao:1 },
  raro:     { nome:'Raro',     peso:25, racao:1 },
  epico:    { nome:'Épico',    peso:12, racao:2 },
  lendario: { nome:'Lendário', peso:3,  racao:5 },
};
const ORDEM_RARIDADE = ['comum','raro','epico','lendario'];

// Gatos: attrs = atributos de batalha | desc = o que aparece na carta | hab = habilidade (gaveta)
const CATS = [
  // --- Comuns ---
  { id:'bolado',  nome:'GatoBolado',  raridade:'comum', img:'img/gato-bolado.png',
    attrs:{atk:5,def:7,vel:4,vida:20}, desc:'Mau humor crônico. Bufa antes de bater.',
    hab:'Bufada: +1 de ataque enquanto estiver com menos da metade da vida.' },
  { id:'timido',  nome:'GatoTímido',  raridade:'comum', img:'img/gato-timido.png',
    attrs:{atk:3,def:9,vel:5,vida:21}, desc:'Se esconde atrás das próprias patas.',
    hab:'Esconde-se: 30% de chance de esquivar do primeiro golpe recebido.' },
  { id:'banho',   nome:'GatoBanho',   raridade:'comum', img:'img/gato-banho.png',
    attrs:{atk:6,def:6,vel:5,vida:20}, desc:'Pingando e indignado com o mundo.',
    hab:'Encharcada: reduz a velocidade do inimigo por 1 turno.' },
  { id:'soneca',  nome:'GatoSoneca',  raridade:'comum', img:'img/gato-soneca.png',
    attrs:{atk:4,def:7,vel:2,vida:26}, desc:'Dorme no meio da briga, acorda inteiro.',
    hab:'Cochilo: recupera 3 de vida se não atacar no turno.' },
  { id:'bagre',   nome:'GatoBagre',   raridade:'comum', img:'img/gato-bagre.png',
    attrs:{atk:7,def:5,vel:4,vida:19}, desc:'Cara de bagre, totalmente escorregadio.',
    hab:'Escorrega: ignora a defesa do inimigo uma vez por luta.' },
  { id:'serio',   nome:'GatoSério',   raridade:'comum', img:'img/gato-serio.png',
    attrs:{atk:6,def:8,vel:3,vida:22}, desc:'Não acha graça em nada. Em nada.',
    hab:'Cara séria: +2 de defesa no primeiro turno.' },
  // --- Raros ---
  { id:'ble',     nome:'GatoBlé',     raridade:'raro', img:'img/gato-ble.png',
    attrs:{atk:7,def:6,vel:8,vida:22}, desc:'Língua de fora, zoeira no talo.',
    hab:'Blé!: 20% de chance do inimigo errar o próprio ataque.' },
  { id:'lele',    nome:'GatoLelé',    raridade:'raro', img:'img/gato-lele.png',
    attrs:{atk:8,def:4,vel:9,vida:20}, desc:'Da cabeça lelé, imprevisível.',
    hab:'Surto: o dano varia muito, pode sair fraco ou crítico.' },
  { id:'zoio',    nome:'GatoZóio',    raridade:'raro', img:'img/gato-zoio.png',
    attrs:{atk:6,def:7,vel:8,vida:23}, desc:'Enxerga tudo, prevê o golpe.',
    hab:'Visão: sempre acerta, ignora esquivas.' },
  { id:'sorriso', nome:'GatoSorriso', raridade:'raro', img:'img/gato-sorriso.png',
    attrs:{atk:7,def:7,vel:7,vida:24}, desc:'Sorriso que desarma qualquer um.',
    hab:'Charme: -2 de defesa do inimigo por 2 turnos.' },
  { id:'doido',   nome:'GatoDoido',   raridade:'raro', img:'img/gato-doido.png',
    attrs:{atk:11,def:3,vel:9,vida:18}, desc:'Fora de si. Bate forte, se cuida pouco.',
    hab:'Fúria: +4 de ataque, mas -2 de defesa.' },
  // --- Épicos ---
  { id:'gritante',    nome:'GatoGritante',    raridade:'epico', img:'img/gato-gritante.png',
    attrs:{atk:10,def:5,vel:7,vida:24}, desc:'O grito ecoa pela arena inteira.',
    hab:'Berro: atordoa o inimigo e pula o turno dele (recarga 3).' },
  { id:'romantico',   nome:'GatoRomântico',   raridade:'epico', img:'img/gato-romantico.png',
    attrs:{atk:8,def:8,vel:7,vida:26}, desc:'Chega com buquê e intenções sérias.',
    hab:'Buquê: cura 5 de vida de um aliado.' },
  { id:'inteligente', nome:'GatoInteligente', raridade:'epico', img:'img/gato-inteligente.png',
    attrs:{atk:9,def:8,vel:8,vida:25}, desc:'De óculos e com o plano já pronto.',
    hab:'Tática: copia a habilidade do último gato usado.' },
  // --- Lendários ---
  { id:'olhudo',     nome:'GatoOlhudo',     raridade:'lendario', img:'img/gato-olhudo.png',
    attrs:{atk:9,def:9,vel:9,vida:30}, desc:'Olhos gigantes que hipnotizam a arena.',
    hab:'Hipnose: controla o inimigo por 1 turno (recarga 4).' },
  { id:'ibuprofeno', nome:'GatoIbuprofeno', raridade:'lendario', img:'img/gato-ibuprofeno.png',
    attrs:{atk:7,def:10,vel:6,vida:34}, desc:'O doutor da turma, tira a dor geral.',
    hab:'Dose: cura 8 de vida e remove efeitos negativos de um aliado.' },
];

/* ---------------------------------------------------------------- estado */
let state = carregar();
function estadoNovo(){ return { schema:SCHEMA_VERSION, energia:CONFIG.energiaInicial, racao:0, ultimaRegen:Date.now(), colecao:{} }; }
function carregar(){
  try{
    const bruto = localStorage.getItem(STORAGE_KEY);
    if(!bruto) return estadoNovo();
    const s = JSON.parse(bruto);
    if(s.schema !== SCHEMA_VERSION){
      s.schema = SCHEMA_VERSION; s.colecao = s.colecao || {};
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
function msProximaEnergia(){ return state.energia >= CONFIG.energiaMax ? 0 : CONFIG.regenMs - (Date.now() - state.ultimaRegen); }

/* -------------------------------------------------------------- sorteio */
function sortearRaridade(){
  const total = Object.values(RARIDADES).reduce((a,r)=>a+r.peso,0);
  let roll = Math.random()*total;
  for(const [id,r] of Object.entries(RARIDADES)){ roll-=r.peso; if(roll<=0) return id; }
  return 'comum';
}
function sortearGato(){
  const rar = sortearRaridade();
  const pool = CATS.filter(c=>c.raridade===rar);
  const lista = pool.length ? pool : CATS;
  return lista[Math.floor(Math.random()*lista.length)];
}
function gatoVisual(){ return CATS[Math.floor(Math.random()*CATS.length)]; }
function gatoPorId(id){ return CATS.find(c=>c.id===id); }
function nivelDoGato(id){ const c=state.colecao[id]; return c ? 1+Math.floor((c.copias-1)/CONFIG.copiasPorNivel) : 0; }

function registrarGanho(gato){
  if(!state.colecao[gato.id]){ state.colecao[gato.id]={copias:1}; salvar(); return {gato,duplicata:false,racaoGanha:0}; }
  state.colecao[gato.id].copias += 1;
  const racaoGanha = RARIDADES[gato.raridade].racao;
  state.racao += racaoGanha; salvar();
  return {gato,duplicata:true,racaoGanha};
}

/* =========================================================================
   UI
   ========================================================================= */
const $ = s => document.querySelector(s);
const trilho=$('#trilho'), janela=document.querySelector('.roleta-janela');
const btnGirar=$('#btn-girar'), btnTrocar=$('#btn-trocar'), btnReset=$('#btn-reset');
const aviso=$('#aviso'), resultado=$('#resultado');
let girando=false;

function molduraHTML(cat, bloqueado){
  const cls = bloqueado ? '' : 'r-'+cat.raridade;
  const alt = bloqueado ? '???' : cat.nome;
  return `<div class="moldura ${cls}"><img src="${cat.img}" alt="${alt}" /></div>`;
}
function statsInline(a){
  return `<span title="Ataque">⚔️${a.atk}</span><span title="Defesa">🛡️${a.def}</span>`+
         `<span title="Velocidade">💨${a.vel}</span><span title="Vida">❤️${a.vida}</span>`;
}

/* troca de abas */
document.querySelectorAll('.casa').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.casa').forEach(b=>b.classList.remove('ativa'));
    document.querySelectorAll('.painel').forEach(p=>p.classList.remove('ativo'));
    btn.classList.add('ativa');
    $('#aba-'+btn.dataset.aba).classList.add('ativo');
    window.scrollTo({top:0,behavior:'smooth'});
  });
});

function render(){
  regenerarEnergia();
  $('#energia-valor').textContent=state.energia;
  $('#energia-max').textContent=CONFIG.energiaMax;
  $('#energia-barra').style.width=(state.energia/CONFIG.energiaMax*100)+'%';
  $('#racao-valor').textContent=state.racao;
  $('#total-gatos').textContent=CATS.length;
  $('#coletados').textContent=Object.keys(state.colecao).length;

  const t=$('#energia-timer');
  if(state.energia>=CONFIG.energiaMax){ t.textContent='cheia'; }
  else{ const ms=msProximaEnergia(); t.textContent=`+1 em ${Math.floor(ms/60000)}:${String(Math.floor(ms%60000/1000)).padStart(2,'0')}`; }

  btnGirar.disabled=girando||state.energia<CONFIG.custoGiro;
  if(!girando) btnGirar.textContent=state.energia<CONFIG.custoGiro?'SEM ENERGIA':`GIRAR (−${CONFIG.custoGiro} ⚡)`;
  btnTrocar.disabled=girando||state.racao<CONFIG.racaoPorEnergia||state.energia>=CONFIG.energiaMax;
  btnTrocar.title=`Troca ${CONFIG.racaoPorEnergia} ração por 1 ⚡`;

  renderColecao();
}

/* ------------------------------------- GatoPédia: cartas agrupadas */
function renderColecao(){
  const wrap=$('#colecao'); wrap.innerHTML='';
  for(const rar of ORDEM_RARIDADE){
    const gatos=CATS.filter(c=>c.raridade===rar);
    const temNoTier=gatos.filter(c=>state.colecao[c.id]).length;
    const grupo=document.createElement('div');
    grupo.innerHTML=`<div class="pedia-grupo-titulo t-${rar}">${RARIDADES[rar].nome} <span class="cont">· ${temNoTier}/${gatos.length}</span></div>`;
    const grid=document.createElement('div'); grid.className='pedia-grid';
    for(const c of gatos){
      const tem=state.colecao[c.id];
      const carta=document.createElement('article');
      carta.className=`carta ${tem?'r-'+c.raridade:'bloqueado'}`;
      carta.dataset.id=c.id;
      if(tem){
        carta.innerHTML=`
          ${molduraHTML(c,false)}
          <div class="carta-topo"><span class="carta-nome">${c.nome}</span><span class="selo-copias">${tem.copias}x · Nv${nivelDoGato(c.id)}</span></div>
          <div class="carta-rar b-${c.raridade}">${RARIDADES[c.raridade].nome}</div>
          <div class="carta-stats">${statsInline(c.attrs)}</div>
          <p class="carta-desc">${c.desc}</p>`;
      }else{
        carta.innerHTML=`
          ${molduraHTML(c,true)}
          <div class="carta-topo"><span class="carta-nome">???</span></div>
          <div class="carta-rar b-${c.raridade}">${RARIDADES[c.raridade].nome}</div>
          <p class="carta-desc">Gire pra descobrir este gato.</p>`;
      }
      carta.addEventListener('click',()=>abrirGaveta(c.id));
      grid.appendChild(carta);
    }
    grupo.appendChild(grid); wrap.appendChild(grupo);
  }
}

/* ------------------------------------- gaveta (drawer) */
const gaveta=$('#gaveta');
function abrirGaveta(id){
  const c=gatoPorId(id); const tem=state.colecao[id];
  const corpo=$('#gaveta-conteudo');
  if(tem){
    corpo.innerHTML=`
      <div class="gaveta-cab">
        ${molduraHTML(c,false)}
        <div><h3>${c.nome}</h3><div class="tag t-${c.raridade}">${RARIDADES[c.raridade].nome} · Nível ${nivelDoGato(id)} · ${tem.copias}x</div></div>
      </div>
      <div class="gaveta-stats">
        <div class="gstat">⚔️ Ataque <b>${c.attrs.atk}</b></div>
        <div class="gstat">🛡️ Defesa <b>${c.attrs.def}</b></div>
        <div class="gstat">💨 Velocidade <b>${c.attrs.vel}</b></div>
        <div class="gstat">❤️ Vida <b>${c.attrs.vida}</b></div>
      </div>
      <p class="gaveta-desc">${c.desc}</p>
      <div class="gaveta-hab"><b>Habilidade —</b> ${c.hab}</div>`;
  }else{
    corpo.innerHTML=`
      <div class="gaveta-cab">
        ${molduraHTML(c,true)}
        <div><h3>???</h3><div class="tag t-${c.raridade}">${RARIDADES[c.raridade].nome}</div></div>
      </div>
      <p class="gaveta-trava">🔒 Gato ainda não descoberto.<br>Gire a roleta pra encontrá-lo!</p>`;
  }
  gaveta.classList.remove('oculto'); gaveta.setAttribute('aria-hidden','false');
}
function fecharGaveta(){ gaveta.classList.add('oculto'); gaveta.setAttribute('aria-hidden','true'); }
gaveta.querySelectorAll('[data-fechar]').forEach(el=>el.addEventListener('click',fecharGaveta));
document.addEventListener('keydown',e=>{ if(e.key==='Escape') fecharGaveta(); });

/* ------------------------------------- roleta */
const CELULAS_ESTEIRA=55, INDICE_VENCEDOR=48;
function montarEsteira(vencedor){
  trilho.innerHTML='';
  for(let i=0;i<CELULAS_ESTEIRA;i++){
    const g=(i===INDICE_VENCEDOR)?vencedor:gatoVisual();
    const cel=document.createElement('div');
    cel.className='celula';
    cel.innerHTML=molduraHTML(g,false);
    trilho.appendChild(cel);
  }
}
function girar(){
  if(girando) return;
  regenerarEnergia();
  if(state.energia<CONFIG.custoGiro){ render(); return; }
  girando=true; aviso.textContent=''; resultado.classList.add('oculto');
  if(state.energia>=CONFIG.energiaMax) state.ultimaRegen=Date.now();
  state.energia-=CONFIG.custoGiro; salvar(); render();

  const vencedor=sortearGato();
  montarEsteira(vencedor);
  trilho.style.transition='none'; trilho.style.transform='translateX(0)'; void trilho.offsetWidth;

  const cel=trilho.children[INDICE_VENCEDOR];
  const alvo=cel.offsetLeft+cel.offsetWidth/2-janela.offsetWidth/2;
  const jitter=(Math.random()-0.5)*cel.offsetWidth*0.55;
  requestAnimationFrame(()=>{
    trilho.style.transition='transform 5s cubic-bezier(.11,.78,.16,1)';
    trilho.style.transform=`translateX(${-(alvo+jitter)}px)`;
  });

  // conclui o giro por evento OU por tempo — se a aba trocar, o transitionend
  // é cancelado, então o timeout garante que não trave.
  let feito=false;
  const concluir=()=>{ if(feito) return; feito=true; clearTimeout(timer); finalizarGiro(vencedor); };
  trilho.addEventListener('transitionend',concluir,{once:true});
  const timer=setTimeout(concluir,5300);
}
function finalizarGiro(vencedor){
  const r=registrarGanho(vencedor);
  mostrarResultado(r); girando=false; salvar(); render();
}
function mostrarResultado({gato,duplicata,racaoGanha}){
  let linha;
  if(!duplicata){
    linha='<strong>Novo gatinho!</strong> entrou pra GatoPédia.';
    if(gato.raridade==='lendario') aviso.textContent='✨ LENDÁRIO! Que sorte.';
  }else{
    linha=`Duplicata → <strong>+${racaoGanha} 🍖</strong> e subiu pro nível ${nivelDoGato(gato.id)}.`;
  }
  resultado.className='resultado';
  resultado.innerHTML=`${molduraHTML(gato,false)}
    <div class="r-txt"><h3>${gato.nome}</h3>
    <span class="tag t-${gato.raridade}">${RARIDADES[gato.raridade].nome}</span>
    <p>${linha}</p></div>`;
}

/* ------------------------------------- ações HUD */
function trocarRacao(){
  if(state.racao<CONFIG.racaoPorEnergia||state.energia>=CONFIG.energiaMax) return;
  state.racao-=CONFIG.racaoPorEnergia;
  state.energia=Math.min(CONFIG.energiaMax,state.energia+1);
  salvar(); render();
}
function resetar(){
  if(!confirm('Apagar todo o progresso neste navegador?')) return;
  state=estadoNovo(); salvar(); resultado.classList.add('oculto'); aviso.textContent=''; render();
}
btnGirar.addEventListener('click',girar);
btnTrocar.addEventListener('click',trocarRacao);
btnReset.addEventListener('click',resetar);

/* =========================================================================
   NEVE (fundo discreto, pixelada)
   ========================================================================= */
(function neve(){
  const cv=document.getElementById('neve'); const ctx=cv.getContext('2d');
  let flocos=[], W, H;
  function dim(){ W=cv.width=innerWidth; H=cv.height=innerHeight; criar(); }
  function criar(){
    const qtd=Math.round(W*H/22000);
    flocos=Array.from({length:qtd},()=>({
      x:Math.random()*W, y:Math.random()*H,
      r:0.8+Math.random()*2.2,          // raio do floco (macio)
      vy:0.25+Math.random()*0.7, vx:(Math.random()-0.5)*0.35,
      fase:Math.random()*Math.PI*2,     // balanço lateral
      a:0.2+Math.random()*0.4,
    }));
  }
  function loop(){
    ctx.clearRect(0,0,W,H);
    for(const f of flocos){
      f.fase+=0.01;
      f.y+=f.vy; f.x+=f.vx+Math.sin(f.fase)*0.3;
      if(f.y>H+6){ f.y=-6; f.x=Math.random()*W; }
      if(f.x<-6) f.x=W; if(f.x>W+6) f.x=0;
      ctx.beginPath();
      ctx.fillStyle=`rgba(226,236,255,${f.a})`;
      ctx.arc(f.x,f.y,f.r,0,Math.PI*2);
      ctx.fill();
    }
    requestAnimationFrame(loop);
  }
  addEventListener('resize',dim); dim(); loop();
})();

/* boot */
montarEsteira(gatoVisual());
render();
setInterval(()=>{ if(!girando) render(); },1000);
