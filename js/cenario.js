/* =========================================================================
   GATOLAND — gerador de cenário procedural (v2: detalhado + animado)
   Desenha um SVG do tamanho da tela (ok no mobile) e sorteia uma cena nova a
   cada carregamento. Animações via SMIL: luzes pulsando, pássaros e figuras
   andando, névoa derivando, árvores balançando. window.__clima alimenta o
   canvas de partículas ('neve' | 'folhas' | 'petalas' | 'nenhum').
   ========================================================================= */
(function(){
  const host = document.querySelector('.cenario-svg');
  if(!host) return;

  const R  = (a,b)=>a+Math.random()*(b-a);
  const RI = (a,b)=>Math.floor(R(a,b+1));
  const pick = a=>a[Math.floor(Math.random()*a.length)];
  const chance = p=>Math.random()<p;
  const f1 = n=>Number(n).toFixed(1);

  /* ---- animações SMIL ---- */
  const pulse = (dur)=>`<animate attributeName="opacity" values="0.25;0.75;0.3;0.7;0.25" dur="${f1(dur)}s" repeatCount="indefinite"/>`;
  const pulseR = (r,dur)=>`<animate attributeName="r" values="${f1(r*.7)};${f1(r*1.15)};${f1(r*.8)};${f1(r*1.1)};${f1(r*.7)}" dur="${f1(dur)}s" repeatCount="indefinite"/>`;
  const blink = (dur)=>`<animate attributeName="opacity" values="0.9;0.9;0.05;0.05;0.9" dur="${f1(dur)}s" repeatCount="indefinite"/>`;
  const moveX = (x0,x1,dur,delay)=>`<animateTransform attributeName="transform" type="translate" from="${f1(x0)} 0" to="${f1(x1)} 0" dur="${f1(dur)}s" begin="${f1(delay||0)}s" repeatCount="indefinite"/>`;
  const sway = (cx,cy,dur)=>`<animateTransform attributeName="transform" type="rotate" values="-1.4 ${f1(cx)} ${f1(cy)};1.4 ${f1(cx)} ${f1(cy)};-1.4 ${f1(cx)} ${f1(cy)}" dur="${f1(dur)}s" repeatCount="indefinite"/>`;

  /* ---- biomas (data-driven; é só ir somando linhas) ---- */
  const BIOMAS = {
    cerejal:          { horizonte:.64, serra:'suave', pico:.12, arvore:'cereja',  dens:16, neveChao:false, clima:'petalas', tint:'#3a2340' },
    floresta_densa:   { horizonte:.62, serra:'suave', pico:.12, arvore:'denso',   dens:26, neveChao:false, clima:'folhas',  tint:'#102a20' },
    taiga_nevada:     { horizonte:.62, serra:'suave', pico:.16, arvore:'nevado',  dens:22, neveChao:true,  clima:'neve',    tint:'#1c2f44' },
    floresta_planicie:{ horizonte:.68, serra:'suave', pico:.10, arvore:'pinheiro',dens:14, neveChao:false, clima:'folhas',  tint:'#14302a' },
    montanhas:        { horizonte:.60, serra:'picos', pico:.34, arvore:'pinheiro',dens:8,  neveChao:true,  clima:'neve',    tint:'#1a2b40' },
    picos_gelados:    { horizonte:.56, serra:'picos', pico:.42, arvore:'nenhuma', dens:0,  neveChao:true,  clima:'neve',    tint:'#213a54' },
    planicie_gelada:  { horizonte:.74, serra:'plana', pico:.05, arvore:'nenhuma', dens:0,  neveChao:true,  clima:'neve',    tint:'#1b3450' },
    praia_nevada:     { horizonte:.72, serra:'plana', pico:.04, arvore:'nenhuma', dens:0,  neveChao:true,  clima:'neve',    tint:'#17364a', agua:true },
    savana:           { horizonte:.70, serra:'suave', pico:.07, arvore:'acacia',  dens:7,  neveChao:false, clima:'folhas',  tint:'#2b2a1a' },
    vale:             { horizonte:.66, serra:'vale',  pico:.24, arvore:'pinheiro',dens:12, neveChao:false, clima:'folhas',  tint:'#16283a' },
  };

  /* ---- horizonte irregular (sem linha reta) ---- */
  function serra(W,H, baseY, amp, tipo, passo){
    let pts=[[0,baseY]];
    for(let x=0;x<=W;x+=passo){
      let y;
      if(tipo==='plana')      y=baseY+R(-amp*.12,amp*.12);
      else if(tipo==='suave') y=baseY-Math.abs(Math.sin(x/W*Math.PI*R(1.5,3)))*amp*.5+R(-10,10);
      else if(tipo==='picos') y=baseY-Math.abs(Math.sin(x/W*Math.PI*R(3,5)))*amp+R(-12,12);
      else if(tipo==='vale')  y=baseY-Math.cos(x/W*Math.PI*2)*amp*.5+R(-6,6);
      else                    y=baseY-Math.random()*amp;
      pts.push([x,y]);
    }
    let d=`M0 ${f1(baseY)} `;
    pts.forEach(p=>d+=`L${f1(p[0])} ${f1(p[1])} `);
    return d+`L${f1(W)} 100000 L0 100000 Z`;
  }

  /* ---- árvores ---- */
  function pinheiro(x,y,h,cor,neve){
    const w=h*.5;
    let s=`<g>`;
    s+=`<rect x="${f1(x-1.5)}" y="${f1(y-h*.12)}" width="3" height="${f1(h*.14)}" fill="${cor}"/>`;
    for(let i=0;i<3;i++){
      const yy=y-h*(.15+i*.28), ww=w*(1-i*.22), hh=h*.38;
      s+=`<polygon points="${f1(x-ww/2)},${f1(yy)} ${f1(x)},${f1(yy-hh)} ${f1(x+ww/2)},${f1(yy)}" fill="${cor}"/>`;
      if(neve) s+=`<polygon points="${f1(x-ww*.16)},${f1(yy-hh*.78)} ${f1(x)},${f1(yy-hh)} ${f1(x+ww*.16)},${f1(yy-hh*.78)}" fill="#e6effa" opacity=".9"/>`;
    }
    s+=`</g>`;
    return s;
  }
  function cerejeira(x,y,h,cor){
    const tronco=`<path d="M${f1(x)} ${f1(y)} q${f1(-h*.04)} ${f1(-h*.4)} ${f1(-h*.1)} ${f1(-h*.55)}" stroke="${cor}" stroke-width="${f1(h*.06)}" fill="none"/>`+
                 `<rect x="${f1(x-h*.03)}" y="${f1(y-h*.55)}" width="${f1(h*.06)}" height="${f1(h*.55)}" fill="${cor}"/>`;
    let copa='';
    const cx=x-h*.08, cy=y-h*.66, rr=h*.3;
    for(let i=0;i<5;i++){
      const ang=R(0,Math.PI*2), d=R(0,rr*.6);
      copa+=`<circle cx="${f1(cx+Math.cos(ang)*d)}" cy="${f1(cy+Math.sin(ang)*d*.7)}" r="${f1(rr*R(.5,.85))}" fill="#d49ad0" opacity=".5"/>`;
    }
    copa+=`<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(rr*.5)}" fill="#e7bfe3" opacity=".4"/>`;
    return tronco+copa;
  }
  function acacia(x,y,h,cor){
    return `<rect x="${f1(x-2)}" y="${f1(y-h*.6)}" width="4" height="${f1(h*.6)}" fill="${cor}"/>`+
           `<ellipse cx="${f1(x)}" cy="${f1(y-h*.68)}" rx="${f1(h*.5)}" ry="${f1(h*.16)}" fill="${cor}"/>`;
  }
  function floresta(W,baseY,estilo,cor,dens,hmin,hmax){
    if(estilo==='nenhuma'||!dens) return '';
    let s=''; const passo=W/dens;
    for(let x=passo*.3;x<W;x+=passo*R(.6,1.3)){
      const h=R(hmin,hmax), yy=baseY+R(-4,8);
      if(estilo==='cereja') s+=cerejeira(x,yy,h,cor);
      else if(estilo==='acacia') s+=acacia(x,yy,h,cor);
      else s+=pinheiro(x,yy,h*(estilo==='denso'?1.15:1),cor,estilo==='nevado');
    }
    return s;
  }

  /* ---- cidade distante (blocos = profundidade + "quadrados") ---- */
  function cidade(W,baseY,cor,luzes){
    let s=''; const n=RI(6,12); const x0=R(W*.1,W*.5); let x=x0;
    for(let i=0;i<n;i++){
      const w=R(16,30), h=R(26,70);
      s+=`<rect x="${f1(x)}" y="${f1(baseY-h)}" width="${f1(w)}" height="${f1(h)}" fill="${cor}"/>`;
      if(chance(.3)) s+=`<polygon points="${f1(x)},${f1(baseY-h)} ${f1(x+w/2)},${f1(baseY-h-w*.5)} ${f1(x+w)},${f1(baseY-h)}" fill="${cor}"/>`;
      // janelinhas acesas
      for(let jy=baseY-h+6; jy<baseY-6; jy+=12){
        for(let jx=x+4; jx<x+w-4; jx+=9){
          if(chance(.5)){ s+=`<rect x="${f1(jx)}" y="${f1(jy)}" width="3" height="4" fill="#ffc266" opacity=".85">${chance(.3)?blink(R(3,7)):''}</rect>`; }
        }
      }
      if(chance(.6)) luzes.push([x+w/2, baseY-h*.5, 'janela']);
      x+=w+R(2,10);
    }
    return {svg:s, cx:(x0+x)/2, x0, x1:x};
  }

  /* ---- construções pontuais ---- */
  function casa(x,y,s,luzes,cor){
    const w=36*s,h=28*s;
    if(chance(.75)) luzes.push([x+w*.5,y-h*.5,'janela']);
    return `<g fill="${cor}"><rect x="${f1(x)}" y="${f1(y-h)}" width="${f1(w)}" height="${f1(h)}"/>`+
      `<polygon points="${f1(x-5)},${f1(y-h)} ${f1(x+w/2)},${f1(y-h-18*s)} ${f1(x+w+5)},${f1(y-h)}"/></g>`+
      (chance(.75)?`<rect x="${f1(x+w*.38)}" y="${f1(y-h*.62)}" width="${f1(8*s)}" height="${f1(9*s)}" fill="#ffb24a"><animate attributeName="opacity" values="0.6;0.95;0.7;0.95;0.6" dur="${f1(R(4,8))}s" repeatCount="indefinite"/></rect>`:'');
  }
  function construcoes(W,baseY,cor){
    const luzes=[]; let s=''; let regiao=null;
    const tipo=pick(['cidade','cidade','vila','acampamento','forte','ruinas','cabana','poste']);
    const bx=R(W*.12,W*.6);
    if(tipo==='cidade'){ const c=cidade(W,baseY,cor,luzes); s+=c.svg; regiao=[c.x0,c.x1]; }
    else if(tipo==='vila'){ for(let i=0;i<3;i++) s+=casa(bx+i*48,baseY+R(-4,4),R(.8,1.1),luzes,cor); regiao=[bx,bx+150]; }
    else if(tipo==='acampamento'){
      s+=`<polygon points="${f1(bx)},${f1(baseY)} ${f1(bx+30)},${f1(baseY)} ${f1(bx+15)},${f1(baseY-26)}" fill="${cor}"/>`;
      s+=`<polygon points="${f1(bx+36)},${f1(baseY)} ${f1(bx+60)},${f1(baseY)} ${f1(bx+48)},${f1(baseY-20)}" fill="${cor}"/>`;
      s+=`<circle cx="${f1(bx+78)}" cy="${f1(baseY-3)}" r="4" fill="#ff7a2a">${pulseR(4,2.5)}</circle>`;
      luzes.push([bx+78,baseY-3,'fogueira']); regiao=[bx,bx+90];
    }
    else if(tipo==='forte'){
      s+=`<g fill="${cor}"><rect x="${f1(bx)}" y="${f1(baseY-56)}" width="94" height="56"/>`+
         `<rect x="${f1(bx-10)}" y="${f1(baseY-72)}" width="18" height="72"/><rect x="${f1(bx+86)}" y="${f1(baseY-72)}" width="18" height="72"/>`+
         `<polygon points="${f1(bx-10)},${f1(baseY-72)} ${f1(bx-1)},${f1(baseY-84)} ${f1(bx+8)},${f1(baseY-72)}"/>`+
         `<polygon points="${f1(bx+86)},${f1(baseY-72)} ${f1(bx+95)},${f1(baseY-84)} ${f1(bx+104)},${f1(baseY-72)}"/></g>`;
      s+=`<rect x="${f1(bx+40)}" y="${f1(baseY-36)}" width="12" height="16" fill="#ffb24a"><animate attributeName="opacity" values="0.6;1;0.7;1;0.6" dur="5s" repeatCount="indefinite"/></rect>`;
      luzes.push([bx+46,baseY-28,'janela']); regiao=[bx-10,bx+104];
    }
    else if(tipo==='ruinas'){
      s+=`<g fill="${cor}"><rect x="${f1(bx)}" y="${f1(baseY-42)}" width="16" height="42"/><rect x="${f1(bx+30)}" y="${f1(baseY-24)}" width="14" height="24"/>`+
         `<rect x="${f1(bx+54)}" y="${f1(baseY-50)}" width="12" height="50"/><rect x="${f1(bx+18)}" y="${f1(baseY-10)}" width="44" height="10"/></g>`;
      regiao=[bx,bx+70];
    }
    else if(tipo==='cabana'){ s+=casa(bx,baseY,1.0,luzes,cor); regiao=[bx,bx+40]; }
    else if(tipo==='poste'){
      const px=R(W*.3,W*.85);
      s+=`<rect x="${f1(px)}" y="${f1(baseY-50)}" width="3" height="50" fill="${cor}"/>`+
         `<circle cx="${f1(px+1.5)}" cy="${f1(baseY-50)}" r="5" fill="#ffcf7a">${pulse(R(4,7))}</circle>`;
      luzes.push([px+1.5,baseY-50,'poste']); regiao=[px-20,px+20];
    }
    // poste avulso extra às vezes
    if(chance(.35)){
      const px=R(W*.72,W*.92);
      s+=`<rect x="${f1(px)}" y="${f1(baseY-46)}" width="3" height="46" fill="${cor}"/>`+
         `<circle cx="${f1(px+1.5)}" cy="${f1(baseY-46)}" r="4" fill="#ffcf7a">${pulse(R(4,7))}</circle>`;
      luzes.push([px+1.5,baseY-46,'poste']);
    }
    return {svg:s, luzes, regiao};
  }

  /* ---- pássaros voando (batem asa) ---- */
  function passaros(W,H){
    if(chance(.45)) return '';
    const n=RI(3,6), dir=chance(.5)?1:-1; let s='';
    for(let i=0;i<n;i++){
      const y=R(H*.1,H*.34), e=R(6,11), dur=R(16,30), delay=-R(0,dur);
      const x0=dir>0?-40:W+40, x1=dir>0?W+40:-40;
      s+=`<g opacity=".7" transform="translate(${f1(dir>0?-40:W+40)} ${f1(y)})">`+
         `<path d="M0 0 q${f1(e/2)} ${f1(-e*.7)} ${f1(e)} 0 M0 0 q${f1(-e/2)} ${f1(-e*.7)} ${f1(-e)} 0" stroke="#070b12" stroke-width="2" fill="none">`+
         `<animate attributeName="d" values="M0 0 q${f1(e/2)} ${f1(-e*.7)} ${f1(e)} 0 M0 0 q${f1(-e/2)} ${f1(-e*.7)} ${f1(-e)} 0;M0 0 q${f1(e/2)} ${f1(e*.2)} ${f1(e)} 0 M0 0 q${f1(-e/2)} ${f1(e*.2)} ${f1(-e)} 0;M0 0 q${f1(e/2)} ${f1(-e*.7)} ${f1(e)} 0 M0 0 q${f1(-e/2)} ${f1(-e*.7)} ${f1(-e)} 0" dur="0.5s" repeatCount="indefinite"/></path>`+
         `<animateTransform attributeName="transform" type="translate" values="${f1(x0)} ${f1(y)};${f1(x1)} ${f1(y-R(-14,14))}" dur="${f1(dur)}s" begin="${f1(delay)}s" repeatCount="indefinite"/></g>`;
    }
    return s;
  }

  /* ---- figuras andando no chão ---- */
  function figuras(W,groundY,cor){
    if(chance(.5)) return '';
    const n=RI(1,2); let s='';
    for(let i=0;i<n;i++){
      const dir=chance(.5)?1:-1, dur=R(26,46), delay=-R(0,dur), sc=R(.8,1.2);
      const x0=dir>0?-20:W+20, x1=dir>0?W+20:-20;
      s+=`<g transform="translate(${f1(x0)} ${f1(groundY)})">`+
         `<g transform="scale(${f1(dir*sc)} ${f1(sc)})" fill="${cor}">`+
         `<circle cx="0" cy="-20" r="3.2"/><rect x="-2.4" y="-17" width="4.8" height="10" rx="2"/>`+
         `<rect x="-2.4" y="-7" width="2.2" height="7"><animateTransform attributeName="transform" type="rotate" values="12 -1 -7;-12 -1 -7;12 -1 -7" dur="0.8s" repeatCount="indefinite"/></rect>`+
         `<rect x="0.2" y="-7" width="2.2" height="7"><animateTransform attributeName="transform" type="rotate" values="-12 1 -7;12 1 -7;-12 1 -7" dur="0.8s" repeatCount="indefinite"/></rect></g>`+
         `<animateTransform attributeName="transform" type="translate" values="${f1(x0)} ${f1(groundY)};${f1(x1)} ${f1(groundY)}" dur="${f1(dur)}s" begin="${f1(delay)}s" repeatCount="indefinite"/></g>`;
    }
    return s;
  }

  /* ---- detalhes de chão: rochas, montes de neve, arbustos ---- */
  function chaoDetalhe(W,groundY,cor,neve){
    let s='';
    for(let i=0;i<RI(4,8);i++){
      const x=R(0,W), y=groundY+R(0,40);
      s+=`<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(R(10,26))}" ry="${f1(R(4,8))}" fill="${neve?'#dfeaf7':cor}" opacity="${neve?.5:.6}"/>`;
    }
    for(let i=0;i<RI(3,6);i++){
      const x=R(0,W), y=groundY+R(-4,10);
      s+=`<polygon points="${f1(x)},${f1(y)} ${f1(x+R(8,16))},${f1(y)} ${f1(x+R(3,8))},${f1(y-R(6,12))}" fill="${cor}"/>`;
    }
    return s;
  }

  /* ---- névoa (sobre a cidade/horizonte) ---- */
  function nevoa(W,y,regiao){
    let s=`<g filter="url(#blurNevoa)">`;
    const cx = regiao ? (regiao[0]+regiao[1])/2 : W*.4;
    const span = regiao ? Math.max(regiao[1]-regiao[0],180) : W*.5;
    for(let i=0;i<3;i++){
      const w=span*R(.6,1.1), rx=w/2, ry=R(14,26);
      const bx=cx-span*.1+R(-40,40);
      s+=`<ellipse cx="${f1(bx)}" cy="${f1(y+R(-10,14))}" rx="${f1(rx)}" ry="${f1(ry)}" fill="#cdd9ea" opacity="${f1(R(.08,.16))}">`+
         `<animateTransform attributeName="transform" type="translate" values="${f1(-R(10,30))} 0;${f1(R(10,30))} 0;${f1(-R(10,30))} 0" dur="${f1(R(14,26))}s" repeatCount="indefinite"/></ellipse>`;
    }
    return s+`</g>`;
  }

  /* ---- monta a cena ---- */
  function render(){
    const W=window.innerWidth, H=window.innerHeight;
    const B=BIOMAS[pick(Object.keys(BIOMAS))];
    const C=['#18283c','#122032','#0c1725','#070f1a','#050b14']; // profundidade claro->escuro
    const horizY=H*B.horizonte, amp=H*B.pico, groundY=horizY+H*.05;

    const luaR=R(26,Math.min(W,H)*.16), luaX=R(W*.1,W*.9), luaY=R(H*.08,H*.34);
    const quente=chance(.55);

    let svg=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><defs>`+
      `<radialGradient id="gLua" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#eef5ff" stop-opacity="${quente?.45:.85}"/><stop offset="42%" stop-color="#bcd6f0" stop-opacity="${quente?.1:.3}"/><stop offset="100%" stop-color="#bcd6f0" stop-opacity="0"/></radialGradient>`+
      `<radialGradient id="gQuente" cx="50%" cy="55%" r="50%"><stop offset="0%" stop-color="#ffb35a" stop-opacity=".55"/><stop offset="55%" stop-color="#ff8a3d" stop-opacity=".14"/><stop offset="100%" stop-color="#ff8a3d" stop-opacity="0"/></radialGradient>`+
      `<linearGradient id="gChao" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${C[3]}"/><stop offset="100%" stop-color="${C[4]}"/></linearGradient>`+
      `<linearGradient id="gHorizonte" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${B.tint}" stop-opacity="0"/><stop offset="100%" stop-color="${B.tint}" stop-opacity=".4"/></linearGradient>`+
      `<filter id="blurNevoa" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="10"/></filter>`+
      `</defs>`;

    // céu: clarão do horizonte (sem linha reta)
    svg+=`<rect x="0" y="${f1(horizY-H*.3)}" width="${W}" height="${f1(H*.45)}" fill="url(#gHorizonte)"/>`;

    // estrelas
    let est='<g fill="#dfe8f5">'; for(let i=0;i<RI(16,30);i++) est+=`<circle cx="${f1(R(0,W))}" cy="${f1(R(0,H*.42))}" r="${f1(R(.8,2.3))}" opacity="${f1(R(.3,.8))}"><animate attributeName="opacity" values="${f1(R(.2,.5))};${f1(R(.6,.9))};${f1(R(.2,.5))}" dur="${f1(R(3,7))}s" repeatCount="indefinite"/></circle>`; est+='</g>';
    svg+=est;

    // lua
    svg+=`<circle cx="${f1(luaX)}" cy="${f1(luaY)}" r="${f1(luaR*2.6)}" fill="url(#gLua)"/>`;
    svg+=`<circle cx="${f1(luaX)}" cy="${f1(luaY)}" r="${f1(luaR)}" fill="#f1f6ff"/>`;
    svg+=`<circle cx="${f1(luaX+luaR*.4)}" cy="${f1(luaY-luaR*.3)}" r="${f1(luaR*.14)}" fill="#dbe6f5" opacity=".5"/>`;
    svg+=`<circle cx="${f1(luaX-luaR*.3)}" cy="${f1(luaY+luaR*.3)}" r="${f1(luaR*.2)}" fill="#dbe6f5" opacity=".4"/>`;

    // pássaros (atrás das montanhas)
    svg+=passaros(W,H);

    // montanhas distantes (3 camadas pra profundidade)
    if(B.serra!=='plana'){
      svg+=`<path d="${serra(W,H,horizY-amp*.5,amp,B.serra,Math.max(44,W/14))}" fill="${C[0]}" opacity=".8"/>`;
      svg+=`<path d="${serra(W,H,horizY-amp*.25,amp*.8,B.serra,Math.max(40,W/16))}" fill="${C[1]}" opacity=".9"/>`;
      if(B.neveChao) svg+=`<path d="${serra(W,H,horizY-amp*.25,amp*.8,B.serra,Math.max(40,W/16))}" fill="#cfe0f2" opacity=".07"/>`;
    }

    // água (praia/litoral)
    if(B.agua){
      svg+=`<rect x="0" y="${f1(horizY)}" width="${W}" height="${f1(H-horizY)}" fill="#0c2436" opacity=".6"/>`;
      svg+=`<rect x="${f1(luaX-luaR)}" y="${f1(horizY)}" width="${f1(luaR*2)}" height="${f1(H-horizY)}" fill="#bcd6f0" opacity=".06"/>`;
    }

    // morro médio + cidade/construções
    svg+=`<path d="${serra(W,H,horizY,amp*.45,B.serra==='plana'?'plana':'suave',Math.max(56,W/12))}" fill="${C[2]}"/>`;
    const con=construcoes(W,horizY,C[2]);
    svg+=`<g opacity=".95">${floresta(W,horizY+4,B.arvore,C[2],B.dens,24,52)}</g>`;
    svg+=con.svg;

    // névoa sobre a cidade
    svg+=nevoa(W,horizY-6,con.regiao);

    // morro da frente + floresta grande + detalhe de chão
    svg+=`<path d="${serra(W,H,groundY,amp*.3,'suave',Math.max(70,W/9))}" fill="${C[3]}"/>`;
    svg+=`<g>${floresta(W,groundY,B.arvore,C[3],Math.round(B.dens*.6),40,80)}</g>`;
    svg+=chaoDetalhe(W,groundY,C[3],B.neveChao);

    // figuras andando
    svg+=figuras(W,groundY,C[2]);

    // chão sólido (gradiente, sem preto chapado)
    svg+=`<rect x="0" y="${f1(groundY+H*.02)}" width="${W}" height="${H}" fill="url(#gChao)"/>`;
    if(B.neveChao){ for(let i=0;i<RI(5,9);i++) svg+=`<ellipse cx="${f1(R(0,W))}" cy="${f1(groundY+H*.02+R(0,H*.15))}" rx="${f1(R(20,60))}" ry="${f1(R(6,12))}" fill="#dfeaf7" opacity=".06"/>`; }

    // iluminação quente (clarões pulsando nos pontos de luz)
    if(quente){
      con.luzes.forEach(l=>{
        const rr=l[2]==='fogueira'?72:(l[2]==='poste'?58:46);
        svg+=`<circle cx="${f1(l[0])}" cy="${f1(l[1])}" r="${f1(rr)}" fill="url(#gQuente)">${pulseR(rr,R(4,8))}${pulse(R(5,9))}</circle>`;
      });
      svg+=`<rect x="0" y="${f1(horizY-40)}" width="${W}" height="${f1(H-horizY+40)}" fill="#ff8a3d" opacity=".035"/>`;
    }

    svg+=`</svg>`;
    host.innerHTML=svg;

    window.__clima=B.clima;
    window.dispatchEvent(new Event('clima-mudou'));
  }

  render();
  let t; addEventListener('resize',()=>{ clearTimeout(t); t=setTimeout(render,250); });
})();
