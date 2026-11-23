/* =========================================================================
   GATOLAND — gerador de cenário procedural
   Desenha um SVG do tamanho da tela (funciona no mobile) e sorteia uma cena
   nova a cada carregamento: bioma + lua + iluminação + construção + fauna.
   Expõe window.__clima ('neve' | 'folhas' | 'nenhum') pro canvas de partículas.
   ========================================================================= */
(function(){
  const host = document.querySelector('.cenario-svg');
  if(!host) return;

  const R  = (a,b)=>a+Math.random()*(b-a);
  const RI = (a,b)=>Math.floor(R(a,b+1));
  const pick = arr=>arr[Math.floor(Math.random()*arr.length)];
  const chance = p=>Math.random()<p;

  /* ---- biomas (data-driven: dá pra ir somando os da lista do Paulo) ---- */
  const BIOMAS = {
    montanhas:        { horizonte:.60, serra:'picos',  pico:.34, arvore:'nenhuma',  neveTopo:true,  clima:'neve',   tint:'#1a2b40' },
    floresta_planicie:{ horizonte:.68, serra:'suave',  pico:.10, arvore:'pinheiro', neveTopo:false, clima:'folhas', tint:'#13302a' },
    floresta_densa:   { horizonte:.64, serra:'suave',  pico:.12, arvore:'denso',    neveTopo:false, clima:'folhas', tint:'#0f261f' },
    cerejal:          { horizonte:.66, serra:'suave',  pico:.10, arvore:'cereja',   neveTopo:false, clima:'petalas',tint:'#2e1f33' },
    taiga_nevada:     { horizonte:.64, serra:'suave',  pico:.16, arvore:'nevado',   neveTopo:true,  clima:'neve',   tint:'#1c2f44' },
    planicie_gelada:  { horizonte:.74, serra:'plana',  pico:.04, arvore:'nenhuma',  neveTopo:false, clima:'neve',   tint:'#1b3450' },
    picos_gelados:    { horizonte:.56, serra:'picos',  pico:.40, arvore:'nenhuma',  neveTopo:true,  clima:'neve',   tint:'#213a54' },
    praia_nevada:     { horizonte:.72, serra:'plana',  pico:.03, arvore:'nenhuma',  neveTopo:false, clima:'neve',   tint:'#17364a', agua:true },
    savana:           { horizonte:.70, serra:'suave',  pico:.06, arvore:'acacia',   neveTopo:false, clima:'folhas', tint:'#2b2a1a' },
    vale:             { horizonte:.66, serra:'vale',   pico:.22, arvore:'pinheiro', neveTopo:false, clima:'folhas', tint:'#16283a' },
  };

  /* ---- paleta de profundidade (do fundo pra frente, sempre escurecendo) ---- */
  function camadas(tint){
    return ['#16263a','#0f1d2c','#0a1420','#060e18']; // silhuetas, claro->escuro
  }

  /* ---- gera um caminho de horizonte (serra) ---- */
  function serra(W, baseY, amp, tipo, passo){
    let pts = [[0, baseY]];
    for(let x=0; x<=W; x+=passo){
      let y;
      if(tipo==='plana')      y = baseY + R(-amp*.15, amp*.15);
      else if(tipo==='suave') y = baseY - Math.abs(Math.sin(x/W*Math.PI*R(1.5,3)))*amp*.5 + R(-8,8);
      else if(tipo==='picos') y = baseY - Math.abs(Math.sin(x/W*Math.PI*R(3,5)))*amp + R(-10,10);
      else if(tipo==='vale')  y = baseY - Math.cos(x/W*Math.PI*2)*amp*.5;
      else                    y = baseY - Math.random()*amp;
      pts.push([x,y]);
    }
    pts.push([W, baseY]);
    let d = `M0 ${baseY} `;
    pts.forEach(p=>{ d += `L${p[0].toFixed(0)} ${p[1].toFixed(0)} `; });
    // fecha bem abaixo; o viewBox recorta o excedente
    return d + `L${W} 100000 L0 100000 Z`;
  }

  /* ---- árvores (silhuetas) ---- */
  function pinheiro(x, baseY, h, cor, capNeve){
    const w = h*.5;
    let s = `<polygon points="${x},${baseY} ${x-w/2},${baseY} ${x},${baseY-h} ${x+w/2},${baseY}" fill="${cor}"/>`;
    s += `<polygon points="${x-w*.4},${baseY-h*.45} ${x},${baseY-h*.9} ${x+w*.4},${baseY-h*.45}" fill="${cor}"/>`;
    if(capNeve) s += `<polygon points="${x-w*.14},${baseY-h*.82} ${x},${baseY-h} ${x+w*.14},${baseY-h*.82}" fill="#dfeaf7" opacity=".85"/>`;
    return s;
  }
  function cerejeira(x, baseY, h, cor){
    const tronco = `<rect x="${x-2}" y="${baseY-h*.5}" width="4" height="${h*.5}" fill="${cor}"/>`;
    const copa = `<circle cx="${x}" cy="${baseY-h*.62}" r="${h*.33}" fill="#caa0d8" opacity=".55"/>`;
    return tronco+copa;
  }
  function acacia(x, baseY, h, cor){
    return `<rect x="${x-2}" y="${baseY-h*.6}" width="4" height="${h*.6}" fill="${cor}"/>`+
           `<ellipse cx="${x}" cy="${baseY-h*.68}" rx="${h*.5}" ry="${h*.18}" fill="${cor}"/>`;
  }
  function floresta(W, baseY, estilo, cor, dens){
    if(estilo==='nenhuma'||estilo==='plana') return '';
    let s=''; const passo = W/(dens);
    for(let x=passo*.3; x<W; x+=passo*R(.7,1.3)){
      const h = R(28,70);
      if(estilo==='cereja') s += cerejeira(x, baseY+R(0,6), h, cor);
      else if(estilo==='acacia') s += acacia(x, baseY+R(0,6), h, cor);
      else s += pinheiro(x, baseY+R(0,6), h*(estilo==='denso'?1.1:1), cor, estilo==='nevado');
    }
    return s;
  }

  /* ---- construções (silhuetas) + pontos de luz quente ---- */
  function casa(x, y, s, luzes){
    const w=34*s, h=26*s;
    if(chance(.7)) luzes.push([x+w*.5, y-h*.45, 'janela']);
    return `<g fill="#0a1622">`+
      `<rect x="${x}" y="${y-h}" width="${w}" height="${h}"/>`+
      `<polygon points="${x-4},${y-h} ${x+w/2},${y-h-16*s} ${x+w+4},${y-h}"/>`+
      `</g>`+
      (chance(.7)?`<rect x="${x+w*.38}" y="${y-h*.6}" width="${7*s}" height="${8*s}" fill="#ffb24a" opacity=".9"/>`:'');
  }
  function construcoes(W, baseY){
    const luzes=[]; let s='';
    const tipo = pick(['nenhuma','casa','vila','acampamento','forte','ruinas','cabana','cerca']);
    const bx = R(W*.12, W*.62);
    if(tipo==='casa'){ s+=casa(bx, baseY, R(.9,1.3), luzes); }
    else if(tipo==='vila'){ for(let i=0;i<3;i++) s+=casa(bx+i*46, baseY+R(-4,4), R(.8,1.1), luzes); }
    else if(tipo==='acampamento'){
      // tendas + fogueira recém-apagada (brasa)
      s+=`<polygon points="${bx},${baseY} ${bx+28},${baseY} ${bx+14},${baseY-24} " fill="#0a1622"/>`;
      s+=`<polygon points="${bx+34},${baseY} ${bx+58},${baseY} ${bx+46},${baseY-20}" fill="#0b1726"/>`;
      s+=`<circle cx="${bx+74}" cy="${baseY-3}" r="4" fill="#ff7a2a" opacity=".85"/>`;
      luzes.push([bx+74, baseY-3, 'fogueira']);
    }
    else if(tipo==='forte'){
      s+=`<g fill="#0a1622"><rect x="${bx}" y="${baseY-54}" width="90" height="54"/>`+
         `<rect x="${bx-10}" y="${baseY-70}" width="18" height="70"/><rect x="${bx+82}" y="${baseY-70}" width="18" height="70"/>`+
         `<polygon points="${bx-10},${baseY-70} ${bx-1},${baseY-82} ${bx+8},${baseY-70}"/>`+
         `<polygon points="${bx+82},${baseY-70} ${bx+91},${baseY-82} ${bx+100},${baseY-70}"/></g>`;
      if(chance(.8)){ s+=`<rect x="${bx+38}" y="${baseY-34}" width="12" height="16" fill="#ffb24a" opacity=".85"/>`; luzes.push([bx+44,baseY-26,'janela']); }
    }
    else if(tipo==='ruinas'){
      s+=`<g fill="#0a1622"><rect x="${bx}" y="${baseY-40}" width="16" height="40"/><rect x="${bx+30}" y="${baseY-24}" width="14" height="24"/>`+
         `<rect x="${bx+54}" y="${baseY-48}" width="12" height="48"/><rect x="${bx+20}" y="${baseY-10}" width="40" height="10"/></g>`;
    }
    else if(tipo==='cabana'){
      s+=casa(bx, baseY, 1.0, luzes);
      s+=`<rect x="${bx+40}" y="${baseY-8}" width="3" height="8" fill="#0a1622"/>`; // tronco ao lado
    }
    else if(tipo==='cerca'){
      for(let i=0;i<6;i++) s+=`<rect x="${bx+i*14}" y="${baseY-14}" width="3" height="14" fill="#0a1622"/>`;
      s+=`<rect x="${bx}" y="${baseY-10}" width="${6*14}" height="3" fill="#0a1622"/>`;
    }
    // poste de luz avulso (às vezes)
    if(chance(.4)){
      const px=R(W*.7,W*.9);
      s+=`<rect x="${px}" y="${baseY-46}" width="3" height="46" fill="#0a1622"/>`+
         `<circle cx="${px+1.5}" cy="${baseY-46}" r="4" fill="#ffcf7a" opacity=".9"/>`;
      luzes.push([px+1.5, baseY-46, 'poste']);
    }
    return {svg:s, luzes};
  }

  /* ---- fauna no céu ---- */
  function fauna(W, H){
    const tipo = pick(['nada','morcegos','passaros','morcegos']);
    if(tipo==='nada') return '';
    let s=''; const n=RI(3,6);
    for(let i=0;i<n;i++){
      const x=R(W*.1,W*.9), y=R(H*.12,H*.4), e=R(5,11);
      if(tipo==='morcegos')
        s+=`<path d="M${x} ${y} q${e/2} ${-e/2} ${e} 0 q${e/2} ${-e/2} ${e} 0 M${x} ${y} q${-e/2} ${-e/2} ${-e} 0 q${-e/2} ${-e/2} ${-e} 0" stroke="#05080e" stroke-width="2" fill="none" opacity=".7"/>`;
      else
        s+=`<path d="M${x} ${y} q${e/2} ${-e*.6} ${e} 0 M${x} ${y} q${-e/2} ${-e*.6} ${-e} 0" stroke="#0a111c" stroke-width="2" fill="none" opacity=".6"/>`;
    }
    return s;
  }

  /* ---- monta a cena ---- */
  function render(){
    const W = window.innerWidth;
    const H = window.innerHeight;
    const nomeBioma = pick(Object.keys(BIOMAS));
    const B = BIOMAS[nomeBioma];
    const cor = camadas(B.tint);

    // lua: tamanho e posição variáveis
    const luaR  = R(26, Math.min(W,H)*0.16);
    const luaX  = R(W*.12, W*.88);
    const luaY  = R(H*.10, H*.34);
    // iluminação: fria (lua forte) ou quente (candeeiros/fogueira)
    const quente = chance(.5);

    const horizY = H*B.horizonte;
    const amp = H*B.pico;

    let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<defs>
      <radialGradient id="gLua" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#eef5ff" stop-opacity="${quente?.5:.85}"/>
        <stop offset="40%" stop-color="#bcd6f0" stop-opacity="${quente?.12:.3}"/>
        <stop offset="100%" stop-color="#bcd6f0" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="gQuente" cx="50%" cy="60%" r="50%">
        <stop offset="0%" stop-color="#ffb35a" stop-opacity=".5"/>
        <stop offset="60%" stop-color="#ff8a3d" stop-opacity=".12"/>
        <stop offset="100%" stop-color="#ff8a3d" stop-opacity="0"/>
      </radialGradient>
    </defs>`;

    // estrelas
    let estrelas='<g fill="#dfe8f5">';
    const ne=RI(14,26);
    for(let i=0;i<ne;i++) estrelas+=`<circle cx="${R(0,W).toFixed(0)}" cy="${R(0,H*.45).toFixed(0)}" r="${R(.8,2.4).toFixed(1)}" opacity="${R(.3,.8).toFixed(2)}"/>`;
    estrelas+='</g>';
    svg += estrelas;

    // brilho + lua
    svg += `<circle cx="${luaX}" cy="${luaY}" r="${luaR*2.6}" fill="url(#gLua)"/>`;
    svg += `<circle cx="${luaX}" cy="${luaY}" r="${luaR}" fill="#f1f6ff"/>`;
    svg += `<circle cx="${luaX+luaR*.4}" cy="${luaY-luaR*.3}" r="${luaR*.14}" fill="#dfe8f5" opacity=".5"/>`;
    svg += `<circle cx="${luaX-luaR*.3}" cy="${luaY+luaR*.3}" r="${luaR*.2}" fill="#dfe8f5" opacity=".4"/>`;

    // tint do bioma (clarão suave no céu baixo)
    svg += `<rect x="0" y="${horizY-H*.25}" width="${W}" height="${H*.4}" fill="${B.tint}" opacity=".25"/>`;

    // montanhas distantes (atrás do horizonte)
    if(B.serra!=='plana'){
      svg += `<path d="${serra(W, horizY-amp*.3, amp, B.serra, Math.max(40,W/16))}" fill="${cor[0]}" opacity=".9"/>`;
      if(B.neveTopo) svg += `<path d="${serra(W, horizY-amp*.3, amp, B.serra, Math.max(40,W/16))}" fill="#cfe0f2" opacity=".06"/>`;
    }

    // água (praia/litoral) — faixa reflexiva
    if(B.agua){
      svg += `<rect x="0" y="${horizY}" width="${W}" height="${H-horizY}" fill="#0c2436" opacity=".6"/>`;
      svg += `<rect x="${luaX-luaR}" y="${horizY}" width="${luaR*2}" height="${H-horizY}" fill="#bcd6f0" opacity=".06"/>`;
    }

    // construções na linha do horizonte
    const con = construcoes(W, horizY);

    // morros/chão da frente
    svg += `<path d="${serra(W, horizY, amp*.4, B.serra==='plana'?'plana':'suave', Math.max(60,W/10))}" fill="${cor[1]}"/>`;

    // floresta de fundo e construções
    svg += `<g opacity=".92">${floresta(W, horizY+6, B.arvore, cor[1], 10)}</g>`;
    svg += con.svg;

    // floresta da frente (maior)
    svg += `<g>${floresta(W, horizY+H*.06, B.arvore, cor[2], 7)}</g>`;

    // chão sólido
    svg += `<rect x="0" y="${horizY+H*.08}" width="${W}" height="${H}" fill="${cor[3]}"/>`;

    // iluminação quente nos pontos de luz
    if(quente){
      con.luzes.forEach(l=>{
        const rr = l[2]==='fogueira'?70:(l[2]==='poste'?60:44);
        svg += `<circle cx="${l[0]}" cy="${l[1]}" r="${rr}" fill="url(#gQuente)"/>`;
      });
      // leve véu quente geral
      svg += `<rect x="0" y="${horizY-40}" width="${W}" height="${H-horizY+40}" fill="#ff8a3d" opacity=".04"/>`;
    }

    // fauna no céu
    svg += fauna(W, H);

    svg += `</svg>`;
    host.innerHTML = svg;

    // clima pras partículas
    window.__clima = B.clima;
    window.dispatchEvent(new Event('clima-mudou'));
  }

  render();
  // redesenha ao girar/redimensionar (mantém o mobile sempre coberto) — com debounce
  let t; addEventListener('resize', ()=>{ clearTimeout(t); t=setTimeout(render, 250); });
})();
