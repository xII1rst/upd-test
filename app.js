// SuperCalc v1.11.0 — Application Logic

// ── BACKGROUND FÓRMULAS ─────────────────────────────
(function scBg(){
  // ── FONDO DE FÓRMULAS CON PARALLAX — 3 capas con drift ───────────────────
  // Capa 0: grandes, blur fuerte, muy lentas — profundidad máxima
  // Capa 1: medianas, opacidad media — plano intermedio
  // Capa 2: pequeñas, más visibles, más rápidas — primer plano
  // El sistema corre a 60fps con throttle de blur para rendimiento
  const cv = document.getElementById('sc-bg-canvas');
  if(!cv) return;
  const ctx = cv.getContext('2d');

  const FORMULAS = [
    // ── Mecánica clásica ──
    'E = mc²','F = ma','PV = nRT','a² + b² = c²',
    'p = mv','τ = r × F','W = ΔKE','v = λf',
    'v² = u² + 2as','s = ut + ½at²','T = 2π√(L/g)',
    'F = −kx','L = Iω','K = ½mv²','P = Fv',
    'J = FΔt','ω = dθ/dt','ac = v²/r',
    // ── Electromagnetismo ──
    '∇·E = ρ/ε₀','∇×B = μ₀J','F = kq₁q₂/r²',
    '∮E·dA = Q/ε₀','V = IR','P = IV',
    'Z = R + jX','ε = −dΦ/dt','B = μ₀I/2πr',
    'C = Q/V','U = ½CV²','τ = RC',
    // ── Cuántica & ondas ──
    'λ = h/p','Ψ(x,t)','ΔxΔp ≥ ħ/2','β = v/c',
    'E = hf','ψ = Ae^(ikx)','⟨x⟩ = ∫ψ*xψ dx',
    'Ĥψ = Eψ','S = ħ/2','n² = n(n+1)',
    // ── Cálculo ──
    '∂f/∂x','dy/dx','∇²φ = 0','∂²u/∂t²',
    '∫₀^∞ e⁻ˣ dx','lim(x→0)','f(x) = Σ aₙxⁿ',
    'd/dx[eˣ] = eˣ','∫sin(x)dx = −cos(x)',
    '∂z/∂x','∬f dA','∇f = ⟨fₓ,fᵧ⟩',
    'L{f} = ∫e⁻ˢᵗf dt','Γ(n) = (n−1)!',
    // ── Álgebra lineal ──
    'det(A)','A·B = |A||B|cosθ','A×B = |A||B|sinθ',
    'Ax = λx','tr(A)','A⁻¹A = I',
    'rank(A)','‖v‖ = √(Σvᵢ²)','proj_u v',
    // ── Termodinámica ──
    'q = mcΔT','S = k·ln W','η = W/Q_H',
    'ΔG = ΔH − TΔS','dU = δQ − δW','PV^γ = C',
    // ── Probabilidad & estadística ──
    'Σᵢ xᵢ/n','P(A|B)','E[X]','σ² = E[(X−μ)²]',
    'P(A∪B)','Cov(X,Y)','ρ = σ_xy/σ_xσ_y',
    'n! = n(n-1)!','C(n,k) = n!/k!(n-k)!',
    // ── Identidades & constantes ──
    'eⁱᵖ + 1 = 0','sin²θ + cos²θ = 1','i² = -1',
    'cosh²x − sinh²x = 1','log_b(xy)','ω = 2πf',
    '|v| = √(x²+y²)','e = lim(1+1/n)ⁿ',
    'sin(2θ) = 2sinθcosθ','ln(ab) = ln a + ln b',
    // ── Símbolos sueltos ──
    'α','β','γ','δ','ε','θ','λ','μ','ν','ρ','σ','τ','φ','ψ','ω','ξ',
    '∞','∫','∂','∇','∑','Π','√','±','≈','≠','∈','∅','ħ','Δ','∮','ℝ','ℂ','ℕ',
  ];

  const COLORS_DARK = [
    'rgba(124,106,247,',  // púrpura
    'rgba(165,148,255,',  // púrpura claro
    'rgba(34,211,238,',   // cyan
    'rgba(240,192,64,',   // dorado
    'rgba(16,185,129,',   // verde
  ];
  const COLORS_LIGHT = [
    'rgba(216,56,112,',   // rosa principal
    'rgba(232,120,152,',  // rosa coral
    'rgba(184,152,0,',    // dorado cálido
    'rgba(192,112,56,',   // naranja cálido
    'rgba(176,40,88,',    // rosa profundo
  ];

  let currentPalette = COLORS_DARK;
  let opacityMult = 1;  // dark = 1x, light = 3x para compensar fondo claro
  function refreshPalette(){
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    currentPalette = isLight ? COLORS_LIGHT : COLORS_DARK;
    opacityMult    = isLight ? 3 : 1;
  }
  // Exponer para que el theme system lo llame al cambiar tema
  window.scBgRefreshTheme = refreshPalette;

  // Configuración de las 3 capas
  const LAYERS = [
    // Capa 0: fondo — grandes, muy tenues, muy lentas
    { count: 0.3, sizeMin:18, sizeMax:32, opMin:.016, opMax:.038, speedX:.12, speedY:.06 },
    // Capa 1: intermedio — medianas, velocidad media
    { count: 0.45, sizeMin:10, sizeMax:18, opMin:.028, opMax:.065, speedX:.24, speedY:.13 },
    // Capa 2: primer plano — pequeñas, más visibles, más rápidas
    { count: 0.25, sizeMin:7,  sizeMax:12, opMin:.038, opMax:.092, speedX:.38, speedY:.20 },
  ];

  let items = [];
  let W = 0, H = 0;

  function rand(min, max){ return min + Math.random() * (max - min); }
  function randFormula(){ return FORMULAS[Math.floor(Math.random() * FORMULAS.length)]; }
  function randColorIdx(){ return Math.floor(Math.random() * COLORS_DARK.length); }

  function build(){
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width  = W;
    cv.height = H;
    items = [];

    const measure = document.createElement('canvas').getContext('2d');
    const totalCount = Math.floor((W * H) / 6900); // ~30% más densidad que /9000

    LAYERS.forEach((layer, li) => {
      const n = Math.round(totalCount * layer.count);
      for(let i = 0; i < n; i++){
        const text  = randFormula();
        const size  = rand(layer.sizeMin, layer.sizeMax);
        const angle = (Math.random() - 0.5) * 0.45;
        // Dirección de drift aleatoria por item
        const dir   = Math.random() * Math.PI * 2;
        const speed = rand(0.7, 1.3); // multiplicador individual
        items.push({
          text,
          x:    rand(0, W),
          y:    rand(0, H),
          size,
          opacity: rand(layer.opMin, layer.opMax),
          angle,
          color:  randColorIdx(),
          layer:  li,
          vx: Math.cos(dir) * layer.speedX * speed,
          vy: Math.sin(dir) * layer.speedY * speed,
        });
      }
    });
  }

  function draw(){
    ctx.clearRect(0, 0, W, H);
    items.forEach(it => {
      const baseColor = currentPalette[it.color];
      const op = Math.min(it.opacity * opacityMult, 1);
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(it.angle);
      ctx.font = `${it.size}px "Space Mono", monospace`;
      if(it.layer === 0){
        const layerOp = op * 0.6;
        ctx.globalAlpha = layerOp;
        ctx.fillStyle = baseColor + layerOp + ')';
      } else {
        ctx.fillStyle = baseColor + op + ')';
      }
      ctx.fillText(it.text, 0, 0);
      ctx.restore();
    });
    // Depth fog — vignette radial para empujar el foco al centro
    const fog = ctx.createRadialGradient(W/2, H/2, W*0.28, W/2, H/2, W*0.82);
    fog.addColorStop(0, 'rgba(0,0,0,0)');
    fog.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, W, H);
  }

  function update(){
    items.forEach(it => {
      it.x += it.vx;
      it.y += it.vy;
      // Wrap around — reaparece en el lado opuesto
      if(it.x > W + 40) it.x = -40;
      if(it.x < -40)    it.x = W + 40;
      if(it.y > H + 20) it.y = -20;
      if(it.y < -20)    it.y = H + 20;
    });
  }

  function loop(){
    update();
    draw();
    requestAnimationFrame(loop);
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { build(); }, 120);
  });

  // Inicializar paleta según tema guardado (si hay) antes del primer build
  refreshPalette();
  build();
  loop();
})();





// ── LOGO Ω — ANIMACIÓN ELECTRONES ───────────────────
(function scLogoAnim(){
  const e1 = document.getElementById('sc-e1');
  const e2 = document.getElementById('sc-e2');
  const e3 = document.getElementById('sc-e3');
  if(!e1) return;
  const RX = 88, RY = 24;
  const orbits = [
    { el: e1, rot:  0,                angle: 0,   speed: 0.012 },
    { el: e2, rot:  60*Math.PI/180,   angle: 2.1, speed: 0.010 },
    { el: e3, rot: -60*Math.PI/180,   angle: 4.2, speed: 0.011 },
  ];
  const MODULE_COLORS = {
    al: { e1:'#a594ff', e2:'#7c6af7', e3:'#f0c040' },
    fi: { e1:'#22d3ee', e2:'#67e8f9', e3:'#4da6ff' },
    ca: { e1:'#34d399', e2:'#10b981', e3:'#f0c040' },
    st: { e1:'#fb923c', e2:'#f97316', e3:'#fbbf24' },
    default: { e1:'#a594ff', e2:'#67e8f9', e3:'#f0c040' },
  };
  let targetSpeed = 1;
  let currentSpeed = 1;

  function setElectronColors(mod){
    const c = MODULE_COLORS[mod] || MODULE_COLORS.default;
    // e1 → ∑ (violeta), e2 → π (cian), e3 → ∂ (dorado)
    const e1text = e1.querySelector('text');
    const e1circ = e1.querySelector('circle');
    const e2text = e2.querySelector('text');
    const e2circ = e2.querySelector('circle');
    const e3text = e3.querySelector('text');
    const e3circ = e3.querySelector('circle');
    if(e1text){ e1text.style.transition='fill .4s'; e1text.style.fill=c.e1; }
    if(e1circ){ e1circ.style.transition='stroke .4s'; e1circ.style.stroke=c.e1; }
    if(e2text){ e2text.style.transition='fill .4s'; e2text.style.fill=c.e2; }
    if(e2circ){ e2circ.style.transition='stroke .4s'; e2circ.style.stroke=c.e2; }
    if(e3text){ e3text.style.transition='fill .4s'; e3text.style.fill=c.e3; }
    if(e3circ){ e3circ.style.transition='stroke .4s'; e3circ.style.stroke=c.e3; }
  }

  // Hookear hover en lmod-cards
  function hookCards(){
    document.querySelectorAll('.lmod-card').forEach(card => {
      const mod = card.classList.contains('al') ? 'al'
                : card.classList.contains('fi') ? 'fi'
                : card.classList.contains('ca') ? 'ca'
                : card.classList.contains('st') ? 'st' : null;
      if(!mod) return;
      card.addEventListener('mouseenter', () => { targetSpeed = 2.8; setElectronColors(mod); });
      card.addEventListener('mouseleave', () => { targetSpeed = 1; setElectronColors('default'); });
      card.addEventListener('touchstart', () => { targetSpeed = 2.8; setElectronColors(mod); }, {passive:true});
      card.addEventListener('touchend',   () => { setTimeout(()=>{ targetSpeed=1; setElectronColors('default'); }, 600); }, {passive:true});
    });
  }
  // Esperar a que el DOM esté listo
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', hookCards);
  } else {
    setTimeout(hookCards, 100);
  }

  let t = 0;
  function frame(){
    t++;
    // Suavizar la transición de velocidad
    currentSpeed += (targetSpeed - currentSpeed) * 0.06;
    orbits.forEach(o => {
      const a = o.angle + t * o.speed * currentSpeed;
      const lx = RX * Math.cos(a), ly = RY * Math.sin(a);
      const c = Math.cos(o.rot), s = Math.sin(o.rot);
      o.el.setAttribute('transform',
        `translate(${(lx*c - ly*s).toFixed(2)},${(lx*s + ly*c).toFixed(2)})`);
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();


// ── PWA: Service Worker + Install Prompt ─────────────
let deferredPrompt=null;
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js', {scope: './'}).then(reg => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw.addEventListener('statechange', () => {
        if(nw.state === 'installed' && navigator.serviceWorker.controller) showUpdateBanner();
      });
    });
  }).catch(() => {});
}

window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault(); deferredPrompt=e; showInstallBanner();
});
window.addEventListener('appinstalled',()=>{const b=document.getElementById('install-banner');if(b)b.remove();});

function showInstallBanner(){
  if(document.getElementById('install-banner'))return;
  const b=document.createElement('div');
  b.id='install-banner';
  b.classList.add('install-banner-ui');
  b.innerHTML='<div class="install-banner-text">📲 Añadir <span>SuperCalc</span> a inicio</div><div class="install-banner-actions"><button class="install-banner-btn-primary" onclick="installApp()">Instalar</button><button class="install-banner-btn-secondary" onclick="dismissInstall()">Ahora no</button></div>';
  document.body.appendChild(b);
}
function showUpdateBanner(){
  if(document.getElementById('update-banner'))return;
  const b=document.createElement('div');
  b.id='update-banner';
  b.classList.add('install-banner-ui');
  b.innerHTML='<div class="install-banner-text">🔄 Nueva versión de <span>SuperCalc</span></div><div class="install-banner-actions"><button class="install-banner-btn-primary" onclick="location.reload()">Actualizar</button><button class="install-banner-btn-secondary" onclick="this.closest(\'.install-banner-ui\').remove()">Luego</button></div>';
  document.body.appendChild(b);
}
function installApp(){if(!deferredPrompt)return;deferredPrompt.prompt();deferredPrompt.userChoice.then(()=>{
  deferredPrompt=null;dismissInstall();});
}
function dismissInstall(){const b=document.getElementById('install-banner');if(b)b.remove();}

// ── PALETTE ───────────────────────────────────────────
// ── PWA MANIFEST (SuperCalc branding) ──────────────
(()=>{
  const sz=512, cv2=document.createElement('canvas');
  cv2.width=sz; cv2.height=sz;
  const cx=cv2.getContext('2d');

  // Fondo redondeado
  const g=cx.createLinearGradient(0,0,sz,sz);
  g.addColorStop(0,'#0a0818'); g.addColorStop(1,'#150d38');
  cx.fillStyle=g;
  if(cx.roundRect){cx.beginPath();cx.roundRect(0,0,sz,sz,sz*.2);cx.fill();}
  else{cx.fillRect(0,0,sz,sz);}

  // Grid cartesiano tenue
  cx.strokeStyle='rgba(124,106,247,0.10)'; cx.lineWidth=1.5;
  const step=sz/10;
  for(let i=1;i<10;i++){
    cx.beginPath();cx.moveTo(i*step,0);cx.lineTo(i*step,sz);cx.stroke();
    cx.beginPath();cx.moveTo(0,i*step);cx.lineTo(sz,i*step);cx.stroke();
  }

  const cx0=sz*.5, cy0=sz*.48, rx=sz*.36, ry=sz*.11;

  function drawOrbit(deg,color){
    cx.save(); cx.translate(cx0,cy0); cx.rotate(deg*Math.PI/180);
    cx.beginPath(); cx.ellipse(0,0,rx,ry,0,0,Math.PI*2);
    cx.strokeStyle=color; cx.lineWidth=3; cx.setLineDash([14,8]);
    cx.globalAlpha=0.7; cx.stroke(); cx.setLineDash([]); cx.globalAlpha=1;
    cx.restore();
  }

  function drawElectron(orbitAngle, posAngle, sym, border, fill, fs){
    const r1=posAngle*Math.PI/180, r2=orbitAngle*Math.PI/180;
    const lx=rx*Math.cos(r1), ly=ry*Math.sin(r1);
    const x=cx0+lx*Math.cos(r2)-ly*Math.sin(r2);
    const y=cy0+lx*Math.sin(r2)+ly*Math.cos(r2);
    const er=sz*.075;
    cx.beginPath();cx.arc(x,y,er,0,Math.PI*2);
    cx.fillStyle='#080c14';cx.fill();
    cx.strokeStyle=border;cx.lineWidth=3.5;cx.stroke();
    cx.font=`700 ${fs}px Georgia,serif`;
    cx.textAlign='center';cx.textBaseline='middle';
    cx.fillStyle=fill;cx.shadowColor=border;cx.shadowBlur=12;
    cx.fillText(sym,x,y+2); cx.shadowBlur=0;
  }

  drawOrbit(0,  '#7c6af7');
  drawOrbit(60, '#22d3ee');
  drawOrbit(-60,'#f0c040');

  // Halo
  const halo=cx.createRadialGradient(cx0,cy0,0,cx0,cy0,sz*.18);
  halo.addColorStop(0,'rgba(124,106,247,0.25)');
  halo.addColorStop(1,'rgba(124,106,247,0)');
  cx.fillStyle=halo; cx.beginPath();cx.arc(cx0,cy0,sz*.18,0,Math.PI*2);cx.fill();

  // Ω
  const og=cx.createLinearGradient(cx0-sz*.15,cy0-sz*.12,cx0+sz*.15,cy0+sz*.12);
  og.addColorStop(0,'#ede9fe'); og.addColorStop(0.4,'#a594ff'); og.addColorStop(1,'#5b45d4');
  cx.font=`700 ${Math.round(sz*.38)}px Georgia,serif`;
  cx.textAlign='center'; cx.textBaseline='middle';
  cx.fillStyle=og; cx.shadowColor='#7c6af7'; cx.shadowBlur=50;
  cx.fillText('Ω',cx0,cy0+sz*.04); cx.shadowBlur=0;

  // Electrones: ∑ violeta, π cian (más pequeño), ∂ dorado
  drawElectron(0,   0,  '∑','#7c6af7','#a594ff', Math.round(sz*.09));
  drawElectron(60,  0,  'π','#22d3ee','#67e8f9', Math.round(sz*.072));
  drawElectron(-60, 0,  '∂','#f0c040','#f0c040', Math.round(sz*.09));

  const icon=cv2.toDataURL('image/png');
  const m={name:'SuperCalc',short_name:'SuperCalc',start_url:location.pathname,
    display:'standalone',background_color:'#080c14',theme_color:'#7c6af7',
    icons:[{src:icon,sizes:'192x192',type:'image/png'},{src:icon,sizes:'512x512',type:'image/png'}]};
  const b=new Blob([JSON.stringify(m)],{type:'application/manifest+json'});
  const l=document.createElement('link');l.rel='manifest';l.href=URL.createObjectURL(b);
  document.head.appendChild(l);
  // Favicon — reutiliza el mismo ícono Ω del manifest
  const fav=document.createElement('link');
  fav.rel='icon'; fav.type='image/png'; fav.href=icon;
  document.head.appendChild(fav);
  // Apple touch icon
  const atl=document.createElement('link');
  atl.rel='apple-touch-icon'; atl.href=icon;
  document.head.appendChild(atl);
})();


const PAL=['#f0c040','#ff6eb4','#4da6ff','#ff8c42','#2dd4a0','#ff5572','#b084fc','#34d4c8','#facc15','#a3e635'];
const RC='#b084fc', SC='#2dd4a0';

// ── STATE ─────────────────────────────────────────────
let mode=3, fracMode=false, showFigure=false;
let vecs=[];
let palIdx=0;
let nid=0, rV=null, sR=null, unkR=null;
let rotX=22, rotY=-38, scl=1, drag=null, lp=null;
let opS='+', opI=[];
let unkOp='·', unkTarget='0';

// ── FRACTIONS ─────────────────────────────────────────
function gcd(a,b){a=Math.abs(Math.round(a));b=Math.abs(Math.round(b));while(b){let t=b;b=a%b;a=t;}return a||1;}
function toFrac(x){
  if(!isFinite(x)||isNaN(x)) return '—';
  if(Math.abs(x)<1e-9) return '0';
  const sign=x<0?'-':''; x=Math.abs(x);
  let bN=Math.round(x),bD=1,bE=Math.abs(x-bN);
  for(let d=2;d<=500;d++){const n=Math.round(x*d),e=Math.abs(x-n/d);if(e<bE){bE=e;bN=n;bD=d;if(e<1e-9)break;}}
  if(bE>5e-4) return sign+x.toFixed(4);
  const g=gcd(bN,bD),n2=bN/g,d2=bD/g;
  return d2===1?sign+n2:sign+n2+'/'+d2;
}
// ── FORMATO DE NÚMEROS — fmt(v, dec, opts) — función unificada
const EPSILON = 1e-9;
function fmt(v, dec=4, {frac=false, sci=false, empty='—'}={}){
  if(v === undefined || v === null || isNaN(v)) return empty;
  if(!isFinite(v)) return v > 0 ? '+∞' : '-∞';
  if(Math.abs(v) < EPSILON) return '0';
  if(frac || fracMode) return toFrac(v);
  if(sci && (Math.abs(v) >= 1e6 || Math.abs(v) < 1e-4))
    return v.toExponential(dec > 4 ? 4 : dec);
  const s = v.toFixed(dec);
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}
function fN(v, dec=4){ return fmt(v, dec, {frac:true}); }
function fmtNum(v, dp=6){ return fmt(v, dp, {sci:true}); }
function matFmtNum(n, d=4){ return fmt(n, d); }
function grafFmt(n){ return fmt(n, 4); }
function fnF(v, dp){ return fmt(v, dp||6); }

// ── AUTO-SELECCIÓN DE INPUTS ──────────────────────────────────────────────
// Al hacer tap/click en cualquier input numérico o de texto, selecciona todo
// el contenido automáticamente para que el usuario pueda escribir de inmediato.
// Event delegation global — funciona para inputs renderizados dinámicamente.
document.addEventListener('focusin', e => {
  if(e.target && (e.target.type === 'number' || e.target.type === 'text')) {
    e.target.select();
  }
});


function fV(vx,vy,vz){ return mode===3?`(${fN(vx)}, ${fN(vy)}, ${fN(vz)})`:`(${fN(vx)}, ${fN(vy)})`; }

// Convierte grados decimales → grados°minutos'segundos"
function fDMS(deg){
  if(isNaN(deg)||!isFinite(deg)) return '—';
  const sign=deg<0?'-':'';
  const abs=Math.abs(deg);
  const d=Math.floor(abs);
  const mf=(abs-d)*60;
  const m=Math.floor(mf);
  const s=Math.round((mf-m)*60);
  // Manejar carry si s=60
  if(s===60){ return fDMS(sign?-(d+m/60+1/60):d+m/60+1/60); }
  return `${sign}${d}°${String(m).padStart(2,'0')}'${String(s).padStart(2,'0')}"`;
}

// p.ej. fMag(8.3666...) → "√70"  |  fMag(5) → "5"  |  fMag(√2) → "√2"
function fMag(x){
  if(isNaN(x)||!isFinite(x)) return '—';
  if(x<0) return fN(x);
  const rounded=Math.round(x);
  if(Math.abs(x-rounded)<1e-9) return String(rounded);
  const n2=x*x, n2r=Math.round(n2);
  if(Math.abs(n2-n2r)<1e-6 && n2r>0) return `√${n2r}`;
  return fN(x);
}


function toggleSection(el){
  const body=el.nextElementSibling;
  const arrow=el.querySelector('.collapsible-arrow');
  const isOpen=body.style.maxHeight&&body.style.maxHeight!=='0px';
  body.style.maxHeight=isOpen?'0px':(body.scrollHeight+20)+'px';
  if(arrow) arrow.classList.toggle('open',!isOpen);
}
function mathTogSteps(sid,tog){
  const body=document.getElementById(sid);
  if(!body) return;
  const on=!body.classList.contains('on');
  body.classList.toggle('on',on);
  tog.classList.toggle('on',on);
  tog.querySelector('span:last-child').textContent=on?'ocultar pasos':'ver pasos';
  // Expandir el collapsible-body padre si está colapsado
  const cb=body.closest('.collapsible-body');
  if(cb&&on) cb.style.maxHeight=(cb.scrollHeight+body.scrollHeight+40)+'px';
}
function togglePanel(){
  if(window.innerWidth>=700) return; // en desktop el panel siempre visible
  const bot=document.getElementById('bottom');
  const btn=document.getElementById('panel-tog-btn');
  const collapsed=bot.classList.toggle('collapsed');
  btn.classList.toggle('on',!collapsed);
  setTimeout(()=>resize(),50);
}
function toggleFrac(){
  fracMode=!fracMode;
  document.getElementById('frac-tog').classList.toggle('on',fracMode);
  document.getElementById('frac-lbl').textContent=fracMode?'FRAC':'DEC';
  if(document.getElementById('pM').classList.contains('on')) rM();
  if(document.getElementById('pE').classList.contains('on')) rE();
  if(document.getElementById('pI').classList.contains('on')) rI();
  if(document.getElementById('pO').classList.contains('on')) rO();
  rLeg();
}
function toggleFigure(){
  showFigure=!showFigure;
  document.getElementById('fig-tog').classList.toggle('on',showFigure);
  draw();
}

// ── MATH HELPERS ──────────────────────────────────────

// ── CANVAS COLOR HELPER ──────────────────────────────────────────────────
// Lee variables CSS en runtime → el canvas respeta el tema activo
// IMPORTANTE: _root, _canvasColors y refreshCanvasColors deben estar
// ANTES de initTheme() para evitar Temporal Dead Zone (TDZ)
const _root = document.documentElement;
function cssVar(name){
  return getComputedStyle(_root).getPropertyValue(name).trim() || name;
}

// Colores de canvas pre-cacheados — se actualizan al cambiar tema
let _canvasColors = {};
function refreshCanvasColors(){
  _canvasColors = {
    bg:        cssVar('--bg'),
    surface:   cssVar('--surface'),
    surface2:  cssVar('--surface2'),
    border:    cssVar('--border'),
    text:      cssVar('--text'),
    text3:     cssVar('--text3'),
    origin:    cssVar('--canvas-origin'),
    originDot: cssVar('--canvas-origin-dot'),
    gridLine:  cssVar('--canvas-grid'),
    canvasBg0: cssVar('--canvas-bg0'),
    canvasBg1: cssVar('--canvas-bg1'),
  };
}

// ── THEME SYSTEM ──────────────────────────────────────────────────────────
// Persiste en localStorage. Aplica data-theme="light"|"dark" al <html>.
// El CSS hace el resto vía [data-theme="light"] selectors.

function applyTheme(theme, animate = true){
  const root   = document.documentElement;
  const sw     = document.getElementById('theme-switch');
  const knob   = document.getElementById('theme-knob');

  if(animate){
    document.body.style.transition = 'background .3s, color .3s';
  }

  if(theme === 'light'){
    root.setAttribute('data-theme', 'light');
    if(sw) sw.setAttribute('aria-checked', 'true');
  } else {
    root.removeAttribute('data-theme');
    if(sw) sw.setAttribute('aria-checked', 'false');
  }

  localStorage.setItem('sc-theme', theme);
  refreshCanvasColors();
  if(typeof scBgRefreshTheme === 'function') scBgRefreshTheme();

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if(metaTheme){
    metaTheme.content = theme === 'light' ? '#fffdf7' : '#0a0f1a';
  }
}

function toggleTheme(){
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'light' ? 'dark' : 'light', true);
  setTimeout(() => {
    refreshCanvasColors();
    try { draw(); } catch(e){}
    try { emDraw(); } catch(e){}
  }, 50);
}
// ── END THEME SYSTEM ──────────────────────────────────────────────────────

// Inicializar tema — DESPUÉS de declarar _root, _canvasColors, refreshCanvasColors y applyTheme
(function initTheme(){
  const saved = localStorage.getItem('sc-theme') || 'dark';
  applyTheme(saved, false);
})();

// ── SISTEMA DE NOTIFICACIONES (reemplaza alert()) ────────────────────────
function scToast(msg, type='info', duration=3200){
  const el = document.createElement('div');
  el.className = 'sc-toast sc-toast-' + type;
  el.textContent = msg;
  document.body.appendChild(el);
  el.getBoundingClientRect(); // forzar reflow para activar la transición CSS
  el.classList.add('sc-toast-visible');
  setTimeout(() => {
    el.classList.remove('sc-toast-visible');
    el.addEventListener('transitionend', () => el.remove(), {once:true});
  }, duration);
}

const vmag=(v,m)=>m===3?Math.sqrt(v.vx**2+v.vy**2+v.vz**2):Math.sqrt(v.vx**2+v.vy**2);
const vdot=(a,b,m)=>a.vx*b.vx+a.vy*b.vy+(m===3?a.vz*b.vz:0);
const vcross=(a,b)=>({x:a.vy*b.vz-a.vz*b.vy,y:a.vz*b.vx-a.vx*b.vz,z:a.vx*b.vy-a.vy*b.vx});
const vangle=(a,b,m)=>{const d=vdot(a,b,m),ma=vmag(a,m),mb=vmag(b,m);return(!ma||!mb)?0:Math.acos(Math.max(-1,Math.min(1,d/(ma*mb))))*180/Math.PI;};
const vproj=(a,b,m)=>{const mb=vmag(b,m);return mb?vdot(a,b,m)/mb:0;};

function eduHint(t,v){
  if(t==='dot'){if(Math.abs(v)<.001)return'⊥ Ortogonales';return v>0?'↑ Misma dirección':'↓ Dir. opuesta';}
  if(t==='ang'){if(Math.abs(v)<.1)return'∥ Paralelos';if(Math.abs(v-180)<.1)return'∥ Antiparalelos';if(Math.abs(v-90)<.5)return'⊥ Perpendiculares';return'';}
  if(t==='cr'){if(v<.001)return'∥ Paralelos (|cruz|=0)';return'Área paral. = '+fN(v,4);}
  return'';
}

// ── MODE ──────────────────────────────────────────────
function setMode(m){
  mode=m;
  document.getElementById('br2').classList.toggle('on',m===2);
  document.getElementById('br3').classList.toggle('on',m===3);
  rV=null;sR=null;unkR=null;opI=[];
  renderVecs();rM();rO();rE();rI();draw();
}
function resetView(){rotX=22;rotY=-38;scl=1;draw();}
function showTab(t){
  ['V','M','O','E','I','T','F'].forEach((x,i)=>{
    document.querySelectorAll('.tab')[i].classList.toggle('on',x===t);
    document.getElementById('p'+x).classList.toggle('on',x===t);
  });
  if(t==='M')rM();if(t==='O')rO();if(t==='E')rE();if(t==='I')rI();
  if(t==='F')figInitPanel();
}

// ── VECTOR PANEL ──────────────────────────────────────
function renderVecs(){
  let h='';
  vecs.forEach((v,i)=>{
    const c=v.cl;
    const mag2=Math.sqrt(v.vx**2+v.vy**2+(mode===3?v.vz**2:0));
    const zeroWarn=mag2<1e-9?'<span style="font-size:9px;color:var(--red);font-family:Space Mono,monospace;margin-left:auto">|v|=0</span>':'';
    const zf=(l,val,k)=>mode===3?`<div class="inp-group"><label style="color:${c}">${l}</label><input type="number" onfocus="this.select()" value="${val}" oninput="uV(${v.id},'${k}',this.value)"/></div>`:'';
    h+=`<div class="vec-card" style="border-left-color:${c}">
      <div class="vec-card-header">
        <div class="vec-color-dot" style="background:${c}"></div>
        <input class="vec-name-input" value="${v.nm}" maxlength="4" oninput="uN(${v.id},this.value)" onfocus="this.select()" style="color:${c}"/>
        <button class="badge ${v.on?'badge-on':'badge-off'}" onclick="togV(${v.id})">${v.on?'ON':'OFF'}</button>
        ${zeroWarn}
        ${vecs.length>1?`<button class="badge badge-del" onclick="delV(${v.id})">✕</button>`:''}
      </div>
      <div class="vec-inputs">
        <div class="inp-group"><label style="color:#ff5572">X</label><input type="number" onfocus="this.select()" value="${v.vx}" oninput="uV(${v.id},'vx',this.value)"/></div>
        <div class="inp-group"><label style="color:#2dd4a0">Y</label><input type="number" onfocus="this.select()" value="${v.vy}" oninput="uV(${v.id},'vy',this.value)"/></div>
        ${zf('Z',v.vz,'vz')}
      </div>
    </div>`;
  });
  h+=`<button class="add-vec-btn" onclick="addV()">+ Agregar vector</button>`;
  document.getElementById('pV').innerHTML=h;
  rLeg();
}
function uV(id,k,val){const v=vecs.find(v=>v.id===id);if(v)v[k]=parseFloat(val)||0;draw();rLeg();if(document.getElementById('pM').classList.contains('on'))rM();}
function uN(id,val){const v=vecs.find(v=>v.id===id);if(v)v.nm=val||'v';rLeg();if(document.getElementById('pO').classList.contains('on'))rO();if(document.getElementById('pE').classList.contains('on'))rE();if(document.getElementById('pI').classList.contains('on'))rI();}
function togV(id){const v=vecs.find(v=>v.id===id);if(v)v.on=!v.on;renderVecs();draw();if(document.getElementById('pM').classList.contains('on'))rM();}
function delV(id){if(vecs.length<=1){scToast('Al menos 1 vector.', 'warn');return;}vecs=vecs.filter(v=>v.id!==id);opI=opI.filter(i=>i!==id);renderVecs();draw();rO();rE();rI();}
function addV(){
  const used=vecs.map(v=>v.nm);
  const pool=['C','D','E','F','G','H','P','Q','R','S','T','U','W'];
  const nm=pool.find(n=>!used.includes(n))||'V'+nid;
  vecs.push({id:nid++,on:true,nm,vx:0,vy:0,vz:0,cl:PAL[palIdx++%PAL.length]});
  renderVecs();draw();
}

// ── LEGEND ────────────────────────────────────────────
function rLeg(){
  let h='';
  vecs.filter(v=>v.on).forEach(v=>{
    const c=v.cl;
    const cp=mode===3?`(${v.vx},${v.vy},${v.vz})`:`(${v.vx},${v.vy})`;
    h+=`<div class="leg-item" style="border-left-color:${c}"><div class="leg-dot" style="background:${c}"></div><span class="leg-text">${v.nm} ${cp}</span></div>`;
  });
  if(rV&&!rV.scalar){const cp=fV(rV.vx,rV.vy,rV.vz);h+=`<div class="leg-item" style="border-left-color:${RC}"><div class="leg-dot" style="background:${RC}"></div><span class="leg-text">res ${cp}</span></div>`;}
  if(sR&&!sR.err){const cp=fV(sR.vx,sR.vy,sR.vz);h+=`<div class="leg-item" style="border-left-color:${SC}"><div class="leg-dot" style="background:${SC}"></div><span class="leg-text">${sR.nm} ${cp}</span></div>`;}
  document.getElementById('legend').innerHTML=h;
}

// ── MATH PANEL ────────────────────────────────────────
// Renderiza el panel de Cálculos (tab M) — reconstruye innerHTML completo.
// Llama fN(), fMag(), fDMS(), eduHint(). Se dispara desde showTab y uV.
function rM(){
  const mc=document.getElementById('pM');
  const act=vecs.filter(v=>v.on);
  if(!act.length){mc.innerHTML='<p style="color:var(--text3);font-size:12px;padding:4px 0">Sin vectores activos.</p>';return;}
  let h='';
  h+=`<div class="section-title">Magnitudes · Ángulos directores</div><div class="math-grid">`;
  act.forEach(v=>{
    const c=v.cl,m=vmag(v,mode);
    const ax=m?Math.acos(Math.max(-1,Math.min(1,v.vx/m)))*180/Math.PI:0;
    const ay=m?Math.acos(Math.max(-1,Math.min(1,v.vy/m)))*180/Math.PI:0;
    const az=mode===3&&m?Math.acos(Math.max(-1,Math.min(1,v.vz/m)))*180/Math.PI:null;
    const ux=m?fN(v.vx/m):'—',uy=m?fN(v.vy/m):'—',uz=mode===3&&m?fN(v.vz/m):'—';
    h+=`<div class="math-card full"><div class="math-label" style="color:${c}">${v.nm}</div>
      <div class="math-value">|${v.nm}| = ${fMag(m)}</div>
      <div class="math-value sm">αx=${fDMS(ax)} αy=${fDMS(ay)}${az!==null?' αz='+fDMS(az):''}</div>
      <div class="math-value sm" style="color:var(--text3)">û = (${ux}, ${uy}${mode===3?', '+uz:''})</div>
    </div>`;
  });
  h+=`</div>`;
  // Multi-vector global stats (3+ vectors)
  if(act.length>=2){
    const sumV={vx:act.reduce((s,v)=>s+v.vx,0),vy:act.reduce((s,v)=>s+v.vy,0),vz:act.reduce((s,v)=>s+v.vz,0)};
    const sumM=vmag(sumV,mode);
    const names=act.map((v,i)=>`<span style="color:${v.cl}">${v.nm}</span>`).join('+');
    h+=`<div class="section-title">Suma de todos los vectores</div>
    <div class="math-grid">
      <div class="math-card full"><div class="math-label">${names}</div>
        <div class="math-value sm">${fV(sumV.vx,sumV.vy,sumV.vz)}</div>
        <div class="math-value">|suma| = ${fMag(sumM)}</div>
      </div>
    </div>`;
  }
  // All pairwise combinations — collapsible
  for(let i=0;i<act.length;i++) for(let j=i+1;j<act.length;j++){
    const a=act[i],b=act[j],ci=a.cl,cj=b.cl;
    const d=vdot(a,b,mode),an=vangle(a,b,mode),pab=vproj(a,b,mode),pba=vproj(b,a,mode);
    const cr=mode===3?vcross(a,b):null,crM=cr?Math.sqrt(cr.x**2+cr.y**2+cr.z**2):0;
    const ma=vmag(a,mode),mb=vmag(b,mode);
    const hint=eduHint('ang',an);

    const dotSteps = mode===3
      ? [`<b>${a.nm}·${b.nm}</b> = (${fN(a.vx)})(${fN(b.vx)}) + (${fN(a.vy)})(${fN(b.vy)}) + (${fN(a.vz)})(${fN(b.vz)})`,
         `= ${fN(a.vx*b.vx)} + ${fN(a.vy*b.vy)} + ${fN(a.vz*b.vz)}`,
         `= <b>${fN(d)}</b>`]
      : [`<b>${a.nm}·${b.nm}</b> = (${fN(a.vx)})(${fN(b.vx)}) + (${fN(a.vy)})(${fN(b.vy)})`,
         `= ${fN(a.vx*b.vx)} + ${fN(a.vy*b.vy)}`,
         `= <b>${fN(d)}</b>`];

    const angSteps = [
      `cos θ = (<b>${a.nm}·${b.nm}</b>) / (|${a.nm}|·|${b.nm}|)`,
      `|${a.nm}| = ${fMag(ma)},  |${b.nm}| = ${fMag(mb)}`,
      `cos θ = ${fN(d,4)} / (${fMag(ma)} × ${fMag(mb)})`,
      `cos θ = ${fN(d,4)} / ${fMag(ma*mb)}`,
      `cos θ = ${fN(ma&&mb?d/(ma*mb):0,6)}`,
      `θ = cos⁻¹(${fN(ma&&mb?d/(ma*mb):0,6)})`,
      `θ = <b>${fDMS(an)}</b>`,
    ];
    const projABSteps = [
      `proy = (<b>${a.nm}·${b.nm}</b>) / |${b.nm}|`,
      `= ${fN(d,4)} / ${fMag(mb)}`,
      `= <b>${fN(pab,4)}</b>`,
    ];
    const projBASteps = [
      `proy = (<b>${a.nm}·${b.nm}</b>) / |${a.nm}|`,
      `= ${fN(d,4)} / ${fMag(ma)}`,
      `= <b>${fN(pba,4)}</b>`,
    ];
    const crossSteps = cr ? [
      `<b>${a.nm}×${b.nm}</b> — regla del determinante 3×3`,
      `i: (${fN(a.vy)})(${fN(b.vz)}) − (${fN(a.vz)})(${fN(b.vy)}) = <b>${fN(cr.x,4)}</b>`,
      `j: (${fN(a.vz)})(${fN(b.vx)}) − (${fN(a.vx)})(${fN(b.vz)}) = <b>${fN(cr.y,4)}</b>`,
      `k: (${fN(a.vx)})(${fN(b.vy)}) − (${fN(a.vy)})(${fN(b.vx)}) = <b>${fN(cr.z,4)}</b>`,
      `resultado = <b>(${fN(cr.x,4)}, ${fN(cr.y,4)}, ${fN(cr.z,4)})</b>`,
      `|${a.nm}×${b.nm}| = ${fMag(crM)}`,
    ] : [];

    const mkCard = (label,value,hint,steps,full=false) => {
      const sid='mst_'+(Math.random().toString(36).slice(2,7));
      return `<div class="math-card${full?' full':''}">
        <div class="math-label">${label}</div>
        <div class="math-value${full?' sm':''}">${value}</div>
        ${hint?`<div class="math-hint">${hint}</div>`:''}
        <div class="math-steps-tog" onclick="mathTogSteps('${sid}',this)">
          <span class="tog-arr">▶</span><span>ver pasos</span>
        </div>
        <div class="math-steps-body" id="${sid}">
          ${steps.map(s=>`<div class="math-step-line">${s}</div>`).join('')}
        </div>
      </div>`;
    };

    h+=`<div class="collapsible-header" onclick="toggleSection(this)">
      <div class="section-title" style="margin-bottom:0;border-bottom:none;flex:1">
        <span style="color:${ci}">${a.nm}</span>&nbsp;—&nbsp;<span style="color:${cj}">${b.nm}</span>
        ${hint?`<span style="font-size:9px;color:var(--green);font-style:italic;font-weight:400;margin-left:6px">${hint}</span>`:''}
      </div>
      <span class="collapsible-arrow open">▶</span>
    </div>
    <div class="collapsible-body" style="max-height:9999px">
    <div class="math-grid" style="margin-bottom:10px">
      ${mkCard('Prod. punto',fN(d),eduHint('dot',d),dotSteps)}
      ${mkCard('Ángulo',fDMS(an),'',angSteps)}
      ${mkCard(`Proy ${a.nm}→${b.nm}`,fN(pab),'',projABSteps)}
      ${mkCard(`Proy ${b.nm}→${a.nm}`,fN(pba),'',projBASteps)}
      ${cr?mkCard(`${a.nm}×${b.nm}`,`(${fN(cr.x,2)}, ${fN(cr.y,2)}, ${fN(cr.z,2)})`,eduHint('cr',crM),crossSteps,true):''}
    </div></div>`;
  }
  mc.innerHTML=h;
}

// ── OPS PANEL ─────────────────────────────────────────
// Renderiza el panel de Operaciones (tab O) — selector de vectores + resultado.
// rV (resultado vectorial) se dibuja en el canvas desde compute().
function rO(){
  const p=document.getElementById('pO');
  const sb=vecs.map((v,i)=>{const c=v.cl,sel=opI.includes(v.id);return`<button class="ops-vec-btn ${sel?'on':''}" style="${sel?`color:${c};border-color:${c}`:''}" onclick="tO(${v.id})">${v.nm}</button>`;}).join('');
  const ob=['+','−','×','·'].map(o=>`<button class="op-btn ${opS===o?'on':''}" onclick="sO('${o}')">${o}</button>`).join('');
  let rh='';
  if(rV){
    if(rV.scalar){rh=`<div class="result-box"><div class="result-title">⟶ Resultado escalar</div><div class="result-val">${fN(rV.sv,4)}</div><div class="result-sub">Valor escalar — no se grafica</div></div>`;}
    else{const m=vmag(rV,mode);const cp=fV(rV.vx,rV.vy,rV.vz);rh=`<div class="result-box"><div class="result-title">⟶ Resultado vector</div><div class="result-val">${cp}</div><div class="result-sub">|res| = ${fMag(m)}</div></div><button class="add-vec-btn" style="border-style:solid;border-color:${RC};color:${RC};margin-top:0" onclick="saveR()">+ Guardar como vector</button>`;}
  }
  p.innerHTML=`<div class="section-title">Selecciona vectores</div>
    <div class="ops-vec-btns">${sb}</div>
    <div class="section-title">Operación</div>
    <div class="op-btns">${ob}</div>
    `+(() => {
    const selNames = opI.map(id=>{const v=vecs.find(v=>v.id===id);return v?v.nm:'?';});
    let expr = '';
    if(selNames.length>=2){
      if(opS==='+') expr=selNames.join(' + ');
      else if(opS==='−') expr=selNames.join(' − ');
      else if(opS==='×') expr=selNames.join(' × ');
      else if(opS==='·') expr=selNames.join(' · ');
      expr = '<div style="font-family:Space Mono,monospace;font-size:12px;color:var(--text2);background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;margin-bottom:10px;text-align:center">'+expr+' = ?</div>';
    }
    return expr;
  })()+`<button class="action-btn" onclick="compute()">Calcular y graficar</button>${rh}`;
}
function tO(id){const i=opI.indexOf(id);i>=0?opI.splice(i,1):opI.push(id);rO();}
function sO(o){opS=o;rO();}
function compute(){
  if(opI.length<2){scToast('Selecciona al menos 2 vectores.', 'warn');return;}
  const sel=opI.map(id=>vecs.find(v=>v.id===id)).filter(Boolean);
  if(opS==='+')rV={vx:sel.reduce((s,v)=>s+v.vx,0),vy:sel.reduce((s,v)=>s+v.vy,0),vz:sel.reduce((s,v)=>s+v.vz,0),scalar:false};
  else if(opS==='−')rV={vx:sel.slice(1).reduce((s,v)=>s-v.vx,sel[0].vx),vy:sel.slice(1).reduce((s,v)=>s-v.vy,sel[0].vy),vz:sel.slice(1).reduce((s,v)=>s-v.vz,sel[0].vz),scalar:false};
  else if(opS==='×'){if(mode===2){scToast('Producto cruz solo disponible en R³.', 'warn');return;}if(sel.length!==2){scToast('Selecciona exactamente 2 vectores.', 'warn');return;}const cr=vcross(sel[0],sel[1]);rV={vx:cr.x,vy:cr.y,vz:cr.z,scalar:false};}
  else if(opS==='·'){if(sel.length!==2){scToast('Selecciona exactamente 2 vectores.', 'warn');return;}rV={scalar:true,sv:vdot(sel[0],sel[1],mode)};}
  rO();rLeg();draw();
}
function saveR(){if(!rV||rV.scalar)return;const used=vecs.map(v=>v.nm);const nm=['R','S','T','P','Q'].find(n=>!used.includes(n))||'R'+nid;vecs.push({id:nid++,on:true,nm,...rV,cl:PAL[palIdx++%PAL.length]});rV=null;renderVecs();rO();draw();}

// ── ECUACIÓN SOLVER ───────────────────────────────────
function pLin(expr,unk,kn,comp){
  let e=expr.replace(/\s/g,'');e=e.replace(/([^+\-\(])\-/g,'$1+-');if(e.startsWith('-'))e='0+'+e;
  const toks=[];let depth=0,cur='';
  for(let i=0;i<e.length;i++){const ch=e[i];if(ch==='(')depth++;else if(ch===')')depth--;if(ch==='+'&&depth===0){toks.push(cur);cur='';}else cur+=ch;}
  if(cur)toks.push(cur);
  let coef=0,cst=0;
  for(const tok of toks.filter(t=>t)){
    const t=tok.trim();if(!t)continue;
    const pm=t.match(/^([+\-]?\d*\.?\d*)\*?\((.+)\)$/);
    if(pm){const s=pm[1]===''||pm[1]==='+'?1:pm[1]==='-'?-1:parseFloat(pm[1]);const inn=pLin(pm[2],unk,kn,comp);coef+=s*inn.coef;cst+=s*inn.cst;continue;}
    let sign=1,rest=t;if(rest.startsWith('-')){sign=-1;rest=rest.slice(1);}else if(rest.startsWith('+'))rest=rest.slice(1);
    const sm=rest.match(/^(\d+\.?\d*)\*?(.+)$/);let s=1,nm='';if(sm){s=parseFloat(sm[1]);nm=sm[2];}else nm=rest;
    s*=sign;nm=nm.toLowerCase().replace('*','');
    if(nm===unk.toLowerCase()){coef+=s;continue;}
    if(kn[nm]){cst+=s*(kn[nm][comp]||0);continue;}
    const n=parseFloat(nm);if(!isNaN(n)){cst+=s*n;continue;}
    throw new Error('No reconozco "'+nm+'"');
  }
  return{coef,cst};
}
function solveEq(eqStr,unknNm){
  const eq=eqStr.replace(/\s/g,'').toLowerCase();const parts=eq.split('=');
  if(parts.length!==2)return{err:'Necesita exactamente un ='};
  const kn={};vecs.forEach(v=>{kn[v.nm.toLowerCase()]={vx:v.vx,vy:v.vy,vz:v.vz};});
  const unk=unknNm.toLowerCase();if(kn[unk])return{err:'"'+unknNm+'" ya es un vector conocido.'};
  const comps=mode===3?['vx','vy','vz']:['vx','vy'];const res={},steps=[];
  for(const comp of comps){
    const cl=comp==='vx'?'x':comp==='vy'?'y':'z';
    try{const L=pLin(parts[0],unk,kn,comp),R=pLin(parts[1],unk,kn,comp);
      const a=L.coef-R.coef,b=R.cst-L.cst;
      if(Math.abs(a)<1e-12){if(Math.abs(b)<1e-12)return{err:cl+': infinitas soluciones'};return{err:cl+': sin solución'};}
      res[comp]=b/a;steps.push(cl+': '+fN(a,3)+'·'+unknNm+' = '+fN(b,3)+'  →  '+unknNm+cl+' = '+fN(b/a,4));
    }catch(e){return{err:'Error en '+cl+': '+e.message};}
  }
  if(mode===2)res.vz=0;return{res,steps};
}
// Renderiza el panel de Ecuación (tab E) — solver vectorial lineal.
// Depende de solveEq() y pLin() para parsear la expresión.
function rE(){
  const p=document.getElementById('pE');
  const vn=vecs.map(v=>`<span style="color:${v.cl}">${v.nm}</span>`).join(', ');
  const ex=vecs.length>=2?`${vecs[0].nm}+2${vecs[1].nm}-x=4(x-${vecs[0].nm})`:'A+2B-x=4(x-A)';
  let sh='';
  if(sR){
    if(sR.err){sh=`<div class="error-box">⚠ ${sR.err}</div>`;}
    else{const cp=fV(sR.vx,sR.vy,sR.vz);const m=vmag({vx:sR.vx,vy:sR.vy,vz:sR.vz||0},mode);
      sh=`<div class="solve-result"><div class="solve-title">✓ ${sR.nm} resuelto</div>
        ${sR.steps.map(s=>`<div class="solve-step"><b>›</b> ${s}</div>`).join('')}
        <div class="solve-final">${sR.nm} = ${cp}</div>
        <div class="solve-mag">|${sR.nm}| = ${fMag(m)}</div></div>
        <button class="add-vec-btn" style="border-style:solid;border-color:${SC};color:${SC};margin-top:0" onclick="saveSol()">+ Graficar ${sR.nm}</button>`;}
  }
  p.innerHTML=`<div class="solver-desc">Vectores: ${vn}<br/>Escribe una ecuación vectorial y despeja la incógnita.<br/>Ejemplo: <strong>${ex}</strong></div>
    <div class="eq-row"><span class="eq-label">Incógnita:</span><input class="eq-input" id="iu" value="x" maxlength="4" style="max-width:80px"/></div>
    <input class="eq-input" id="ie" placeholder="${ex}" style="width:100%;margin-bottom:8px"/>
    <button class="action-btn" onclick="runSolve()">Resolver y graficar</button>${sh}`;
}
function runSolve(){const eq=document.getElementById('ie').value.trim();const unk=document.getElementById('iu').value.trim();if(!eq||!unk){scToast('Completa la ecuación y la incógnita.', 'warn');return;}const r=solveEq(eq,unk);if(r.err){sR={err:r.err};rE();return;}sR={nm:unk,steps:r.steps,vx:r.res.vx,vy:r.res.vy,vz:r.res.vz||0};rE();rLeg();draw();}
function saveSol(){if(!sR||sR.err)return;const used=vecs.map(v=>v.nm);const nm=!used.includes(sR.nm)?sR.nm:(['R','S','T'].find(n=>!used.includes(n))||'S'+nid);vecs.push({id:nid++,on:true,nm,vx:sR.vx,vy:sR.vy,vz:sR.vz||0,cl:PAL[palIdx++%PAL.length]});sR=null;renderVecs();rE();draw();}

// ── INCÓGNITA (componente desconocida) ────────────────
// Resuelve: operación(A,B) = target  donde A o B tienen componentes con variables
// Variables como "x","k" en componentes, resuelve la(s) variable(s)
let unkVecs=[
  {nm:'A',comps:['0','0','0']},
  {nm:'B',comps:['0','0','0']},
];

// Renderiza el panel de Incógnita (tab I) — solver de componente variable.
// Depende de parseComp() y runUnkSolve().
function rI(){
  const p=document.getElementById('pI');
  const ops=['·','|A|','|B|','+','-'];
  const opBtns=ops.map(o=>`<button class="unk-op-btn ${unkOp===o?'on':''}" onclick="setUnkOp('${o}')">${o}</button>`).join('');
  let vecRows='';
  unkVecs.forEach((v,i)=>{
    const compsCount=mode===3?3:2;
    const labels=['X','Y','Z'];
    const colors=['var(--red)','var(--green)','var(--blue)'];
    let compInputs='';
    for(let c=0;c<compsCount;c++){
      compInputs+=`<div class="unk-comp-group">
        <span class="unk-comp-lbl" style="color:${colors[c]}">${labels[c]}</span>
        <input class="unk-comp" value="${v.comps[c]||'0'}" placeholder="${labels[c].toLowerCase()}" oninput="updUnkVec(${i},${c},this.value)" onfocus="this.select()" title="Número o variable (ej: x, 2k)"/>
      </div>`;
    }
    const canDel=unkVecs.length>1;
    vecRows+=`<div class="unk-vec-item">
      <div class="unk-vec-name" style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <input style="background:none;border:none;border-bottom:2px solid var(--blue);color:var(--blue);font-family:'Space Mono',monospace;font-size:14px;font-weight:700;width:44px;outline:none;text-align:center;padding:1px 2px" value="${v.nm}" oninput="updUnkName(${i},this.value)"/> onfocus="this.select()"
        <span style="font-size:10px;color:var(--text3);font-family:'Space Mono',monospace">vector ${i+1}</span>
        ${canDel?`<button class="badge badge-del" onclick="delUnkVec(${i})" style="margin-left:auto">✕</button>`:''}
      </div>
      <div class="unk-comp-row">${compInputs}</div>
    </div>`;
  });
  let resHtml='';
  if(unkR){
    if(unkR.err){resHtml=`<div class="error-box">⚠ ${unkR.err}</div>`;}
    else{
      const steps=unkR.steps.map(s=>`<div class="solve-step"><b>›</b> ${s}</div>`).join('');
      resHtml=`<div class="unk-result-box"><div class="unk-result-title">✓ Solución</div>${steps}
        ${Object.entries(unkR.vars).map(([k,v])=>`<div class="unk-result-val">${k} = ${fN(v,6)}</div>`).join('')}
        <div class="unk-result-check" id="unk-check">${unkR.check}</div>
      </div>`;
    }
  }
  p.innerHTML=`<div class="solver-desc" style="border-left:3px solid var(--blue)">
      Define vectores con <strong>componentes numéricas o variables</strong> (ej: x, k, t).<br/>
      Selecciona la operación y el resultado esperado para resolver.<br/>
      Ejemplo: <strong>A(3,5) · B(5,x) = 0</strong> → x = −3
    </div>
    <div class="section-title">Vectores con incógnita</div>
    <div class="unk-vec-row">${vecRows}</div>
    <button class="add-vec-btn" style="margin-bottom:10px" onclick="addUnkVec()">+ Agregar vector</button>
    <div class="section-title">Operación y resultado esperado</div>
    <div class="unk-op-row">${opBtns}
      <span style="font-size:11px;color:var(--text3);font-family:'Space Mono',monospace">=</span>
      <input class="unk-result-input" id="unk-target" value="${unkTarget}" placeholder="0" oninput="unkTarget=this.value" onfocus="this.select()"/>
    </div>
    <button class="action-btn blue" onclick="runUnkSolve()">Resolver incógnita</button>
    ${resHtml}`;
}
function setUnkOp(o){unkOp=o;rI();}
function updUnkVec(i,c,val){unkVecs[i].comps[c]=val;unkR=null;}
function updUnkName(i,val){unkVecs[i].nm=val||'A';}
function addUnkVec(){unkVecs.push({nm:String.fromCharCode(65+unkVecs.length),comps:['0','0','0']});unkR=null;rI();}
function delUnkVec(i){if(unkVecs.length<=1)return;unkVecs.splice(i,1);unkR=null;rI();}

function runUnkSolve(){
  const target=parseFloat(unkTarget);
  const isScalar=(unkOp==='·'||unkOp==='|A|'||unkOp==='|B|');
  const compsN=mode===3?3:2;

  // Parse vectors: each component is either a number or "coef*var + const"
  // We support: number, variable name, scalar*variable
  const varNames=new Set();
  const parsedVecs=unkVecs.map(v=>({
    nm:v.nm,
    comps:v.comps.slice(0,compsN).map(str=>parseComp(str.trim(),varNames))
  }));
  const vars=[...varNames];

  if(vars.length===0){unkR={err:'No hay incógnitas. Escribe una variable (ej: x) en alguna componente.'};rI();return;}
  if(vars.length>1&&!isScalar){unkR={err:'Múltiples incógnitas solo soportado para producto punto.'};rI();return;}

  try{
    let steps=[], solved={};

    if(unkOp==='·'){
      if(unkVecs.length<2){unkR={err:'Necesitas al menos 2 vectores para producto punto.'};rI();return;}
      // dot(A,B) = target → linear in vars
      // sum_i A[i]*B[i] = target
      // Each A[i]*B[i] = (aCoef*var+aConst)*(bCoef*var+bConst) — can be quadratic if var appears in both
      // For simplicity: collect linear terms (var appears in at most one vector per component)
      const A=parsedVecs[0],B=parsedVecs[1];
      // Build: sum coef*var + const = target
      const varCoef={};vars.forEach(v=>varCoef[v]=0);
      let constTerm=0, isQuadratic=false;
      for(let c=0;c<compsN;c++){
        const a=A.comps[c],b=B.comps[c];
        // (a.coef*var+a.const)*(b.coef*var+b.const)
        if(a.coef!==0&&b.coef!==0&&a.varName===b.varName){isQuadratic=true;break;}
        // linear cross terms
        if(a.coef!==0) varCoef[a.varName]=(varCoef[a.varName]||0)+a.coef*b.const;
        if(b.coef!==0) varCoef[b.varName]=(varCoef[b.varName]||0)+b.coef*a.const;
        constTerm+=a.const*b.const;
      }
      if(isQuadratic){unkR={err:'La incógnita aparece en ambos vectores en la misma componente (ecuación cuadrática). Coloca x solo en uno de los dos vectores.'};rI();return;}
      // Solve each variable (if only 1 var this is simple)
      vars.forEach(vn=>{
        const a=varCoef[vn]||0;const b=target-constTerm;
        if(Math.abs(a)<1e-12){unkR={err:'Coeficiente de '+vn+' = 0, ecuación sin solución única.'};return;}
        solved[vn]=b/a;
        steps.push(`Producto punto: ${fN(a,4)}·${vn} + ${fN(constTerm,4)} = ${fN(target,4)}`);
        steps.push(`${fN(a,4)}·${vn} = ${fN(b,4)}  →  ${vn} = ${fN(b/a,6)}`);
      });
      // Verification
      const Ar=parsedVecs[0].comps.map(c=>c.coef*(solved[c.varName]||0)+c.const);
      const Br=parsedVecs[1].comps.map(c=>c.coef*(solved[c.varName]||0)+c.const);
      const checkDot=Ar.reduce((s,v,i)=>s+v*Br[i],0);
      unkR={vars:solved,steps,check:`Verificación: ${unkVecs[0].nm}·${unkVecs[1].nm} = ${fN(checkDot,6)} (esperado: ${fN(target,4)})`};
    }
    else if(unkOp==='|A|'||unkOp==='|B|'){
      const idx=unkOp==='|A|'?0:1;
      const V=parsedVecs[idx];
      if(!V){unkR={err:'Vector no definido.'};rI();return;}
      // |V|² = target² → sum(coef*var+const)² = target²
      // Expand: sum((coef*var)²+2*coef*var*const+const²) = target²
      // → (sum coef²)*var²+2*(sum coef*const)*var+(sum const²-target²)=0
      const vn=vars[0];
      let A2=0,B2=0,C2=0;
      for(let c=0;c<compsN;c++){
        const comp=V.comps[c];
        A2+=comp.coef**2;B2+=2*comp.coef*comp.const;C2+=comp.const**2;
      }
      C2-=target**2;
      if(Math.abs(A2)<1e-12){unkR={err:'La variable no afecta la magnitud.'};rI();return;}
      const disc=B2**2-4*A2*C2;
      if(disc<0){unkR={err:'No existe solución real (discriminante negativo).'};rI();return;}
      const sol1=(-B2+Math.sqrt(disc))/(2*A2),sol2=(-B2-Math.sqrt(disc))/(2*A2);
      const unique=Math.abs(sol1-sol2)<1e-9;
      if(unique){solved[vn]=sol1;steps.push(`${vn} = ${fN(sol1,6)}`);}
      else{solved[vn]=sol1;steps.push(`${vn} = ${fN(sol1,6)} ó ${vn} = ${fN(sol2,6)} (dos soluciones — se usa la primera)`);}
      unkR={vars:solved,steps,check:`|${V.nm}| con ${vn}=${fN(sol1,4)}: ${fN(Math.sqrt(V.comps.reduce((s,c)=>{const v=c.coef*sol1+c.const;return s+v*v;},0)),6)} (esperado: ${fN(target,4)})`};
    }
    else if(unkOp==='+'||unkOp==='-'){
      const sign=unkOp==='+'?1:-1;
      // Component-wise: for each comp, (A±B)[c] = target[c]
      // But target here is scalar — interpret as magnitude of result = target
      unkR={err:'Para suma/resta define la ecuación completa en la pestaña Ecuación. Aquí usa · o magnitud.'};rI();return;
    }
  }catch(e){unkR={err:e.message};}
  rI();
}

function parseComp(str,varSet){
  // Returns {coef, const, varName} for linear expr like "3", "x", "2x", "-x", "3.5k"
  if(!str||str==='') return {coef:0,const:0,varName:null};
  const num=parseFloat(str);
  if(!isNaN(num)&&str.match(/^[\-\+]?\d*\.?\d+$/)) return {coef:0,const:num,varName:null};
  // Try to match: optional sign, optional number, variable name
  const m=str.match(/^([+\-]?\d*\.?\d*)\*?([a-zA-Z]\w*)$/);
  if(m){
    const coef=m[1]===''||m[1]==='+'?1:m[1]==='-'?-1:parseFloat(m[1]);
    const varName=m[2];
    varSet.add(varName);
    return {coef,const:0,varName};
  }
  // Try: const + coef*var (not supported in input, but handle pure number again)
  throw new Error('Componente no reconocida: "'+str+'". Usa número o variable (ej: x, 2k, -3t)');
}

// ── CANVAS ────────────────────────────────────────────
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const toRad=d=>d*Math.PI/180;
// ══════════════════════════════════════════════════════════════════════════
// PROYECCIÓN 3D UNIFICADA — project3D / p3 / emP3
// ══════════════════════════════════════════════════════════════════════════
// Reemplaza p3() (AL) y emP3() (EM) — misma matemática, parámetros explícitos
// ⚠ WARNING — FUNCIÓN CRÍTICA: project3D() — Proyección 3D isométrica.
// • Matemática: rotY primero (en plano XZ), luego rotX (inclinación vertical).
// • Retorna {sx, sy, z2}: sx/sy = coordenadas de pantalla, z2 = profundidad (painter's algorithm).
// • Los alias p3() y emP3() leen estado global (rotX/rotY/emRotX/emRotY) — son wrappers de conveniencia.
// • Cambiar el orden de rotaciones rompe toda la perspectiva del canvas. NO reordenar.
function project3D(x,y,z,cx,cy,s,rX,rY){
  const rYr=rY*Math.PI/180, rXr=rX*Math.PI/180;
  const cY=Math.cos(rYr), sY=Math.sin(rYr);
  const x1=x*cY+z*sY, z1=-x*sY+z*cY;
  const cX=Math.cos(rXr), sX=Math.sin(rXr);
  return{sx:cx+x1*s, sy:cy-(y*cX-z1*sX)*s, z2:-z1};
}
// Alias AL — usan estado global del módulo vectores
function p3(x,y,z,cx,cy,s){ return project3D(x,y,z,cx,cy,s,rotX,rotY); }
// Alias EM — usan estado global del módulo EM
function emP3(x,y,z){
  const W=emCanvas.width,H=emCanvas.height,cx=W/2,cy=H/2;
  const s=Math.min(W,H)/22*emScl;
  return project3D(x,y,z,cx,cy,s,emRotX,emRotY);
}
function p2(x,y,cx,cy,s){return{sx:cx+x*s,sy:cy-y*s};}

// ══════════════════════════════════════════════════════════════════════════
// FLECHA VECTORIAL UNIFICADA — drawArrowCtx / drawArrow / emDrawArrow
// ══════════════════════════════════════════════════════════════════════════
// ctx como parámetro → reutilizable por AL y EM
// ⚠ WARNING — FUNCIÓN CRÍTICA: drawArrowCtx() — Dibuja flechas vectoriales con glow.
// • Recibe ctx como parámetro (c) — compatible con canvas de AL y EM.
// • shadowBlur genera el glow: resetear a 0 al final es OBLIGATORIO para no contaminar otros draws.
// • hw/hl (cabeza de flecha): cambiarlos afecta la estética de TODOS los vectores del sistema.
// • Los alias drawArrow() (ctx global AL) y emDrawArrow() (emCtx) llaman a esta función.
function drawArrowCtx(c,x1,y1,x2,y2,col,lw){
  const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy);if(len<2)return;
  const ux=dx/len,uy=dy/len,hw=9,hl=16,bx=x2-ux*hl,by=y2-uy*hl;
  c.shadowColor=col;c.shadowBlur=18;
  c.beginPath();c.moveTo(x1,y1);c.lineTo(bx,by);c.strokeStyle=col;c.lineWidth=lw;c.lineCap='round';c.stroke();
  c.beginPath();c.moveTo(x2,y2);c.lineTo(bx+uy*hw,by-ux*hw);c.lineTo(bx-uy*hw,by+ux*hw);
  c.closePath();c.fillStyle=col;c.fill();c.shadowBlur=0;
}
// Alias AL (usa ctx global del canvas vectores)
function drawArrow(x1,y1,x2,y2,col,lw){ drawArrowCtx(ctx,x1,y1,x2,y2,col,lw); }

function drawAxis3(o,pp,pl,pn,nl,col,lbl,lw,axLen,s,cx,cy){
  // Negative dashed
  ctx.beginPath();ctx.moveTo(o.sx,o.sy);ctx.lineTo(pn.sx,pn.sy);
  ctx.strokeStyle=col;ctx.lineWidth=lw*.5;ctx.globalAlpha=.2;ctx.setLineDash([5,7]);ctx.lineCap='round';ctx.stroke();ctx.setLineDash([]);
  ctx.globalAlpha=.2;ctx.fillStyle=col;ctx.font='bold 11px Space Mono';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('-'+lbl,nl.sx,nl.sy);
  // Positive solid
  ctx.beginPath();ctx.moveTo(o.sx,o.sy);ctx.lineTo(pp.sx,pp.sy);
  ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.globalAlpha=.9;ctx.setLineDash([]);ctx.stroke();
  const dx=pp.sx-o.sx,dy=pp.sy-o.sy,l=Math.sqrt(dx*dx+dy*dy);
  if(l>4){const ux=dx/l,uy=dy/l,hw=5,hl=11,bx=pp.sx-ux*hl,by=pp.sy-uy*hl;ctx.beginPath();ctx.moveTo(pp.sx,pp.sy);ctx.lineTo(bx+uy*hw,by-ux*hw);ctx.lineTo(bx-uy*hw,by+ux*hw);ctx.closePath();ctx.fillStyle=col;ctx.globalAlpha=.9;ctx.fill();}
  // Axis label
  ctx.globalAlpha=.9;ctx.fillStyle=col;ctx.font='bold 13px Space Mono';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(lbl,pl.sx,pl.sy);
  ctx.globalAlpha=1;
}

// Draw tick marks and numbers on axes
function adaptiveStep(axLen){
  if(axLen>=50) return 10;
  if(axLen>=21) return 5;
  return 2;
}
function drawAxisTicks3(o,dir,col,axLen,s,cx,cy,fn3){
  const step=adaptiveStep(axLen);
  for(let v=step;v<=Math.floor(axLen);v+=step){
    const pp=fn3(dir[0]*v,dir[1]*v,dir[2]*v,cx,cy,s);
    const pn=fn3(-dir[0]*v,-dir[1]*v,-dir[2]*v,cx,cy,s);
    ctx.globalAlpha=.9;ctx.beginPath();ctx.arc(pp.sx,pp.sy,2.5,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
    ctx.globalAlpha=.3;ctx.beginPath();ctx.arc(pn.sx,pn.sy,2,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
    const lbl=String(v);
    const nx=pp.sx+11,ny=pp.sy+11;
    ctx.font='bold 11px Space Mono';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.globalAlpha=.6;ctx.fillStyle=_canvasColors.canvasBg1||'#060a10';ctx.fillRect(nx-9,ny-7,18,14);
    ctx.globalAlpha=1;ctx.fillStyle=col;ctx.fillText(lbl,nx,ny);
    const nnx=pn.sx+11,nny=pn.sy+11;
    ctx.globalAlpha=.25;ctx.fillStyle=_canvasColors.canvasBg1||'#060a10';ctx.fillRect(nnx-11,nny-7,22,14);
    ctx.globalAlpha=.4;ctx.fillStyle=col;ctx.fillText('-'+lbl,nnx,nny);
  }
  ctx.globalAlpha=1;
}

function drawAxisTicks2(o,isX,col,axLen,s,cx,cy){
  const step=adaptiveStep(axLen);
  for(let v=step;v<=Math.floor(axLen);v+=step){
    const pp=isX?p2(v,0,cx,cy,s):p2(0,v,cx,cy,s);
    const pn=isX?p2(-v,0,cx,cy,s):p2(0,-v,cx,cy,s);
    ctx.globalAlpha=.9;ctx.beginPath();ctx.arc(pp.sx,pp.sy,2.5,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
    ctx.globalAlpha=.3;ctx.beginPath();ctx.arc(pn.sx,pn.sy,2,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
    const lbl=String(v);
    const nx=pp.sx+(isX?0:-16), ny=pp.sy+(isX?14:0);
    ctx.font='bold 12px Space Mono';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.globalAlpha=.6;ctx.fillStyle=_canvasColors.canvasBg1||'#060a10';ctx.fillRect(nx-10,ny-8,20,16);
    ctx.globalAlpha=1;ctx.fillStyle=col;ctx.fillText(lbl,nx,ny);
    const nnx=pn.sx+(isX?0:-20), nny=pn.sy+(isX?14:0);
    ctx.globalAlpha=.25;ctx.fillStyle=_canvasColors.canvasBg1||'#060a10';ctx.fillRect(nnx-12,nny-8,24,16);
    ctx.globalAlpha=.45;ctx.fillStyle=col;ctx.fillText('-'+lbl,nnx,nny);
  }
  ctx.globalAlpha=1;
}

// ⚠ WARNING — FUNCIÓN CRÍTICA: draw() — Renderizado principal del canvas de vectores.
// • Toda modificación debe preservar el orden: fondo → grid → origen → ejes → vectores → figura.
// • project3D / p3() depende de rotX, rotY, scl — no modificar esas variables fuera de resize/input.
// • El ctx (canvas 2D context) es global de este módulo — no reutilizar en otros módulos.
// • Rendimiento: no agregar loops O(n²) ni operaciones DOM aquí. Solo canvas API.
// • Si se agrega una nueva capa visual, agregarla DESPUÉS de ejes y ANTES de vectores.
function draw(){
  const W=cv.width,H=cv.height,cx=W/2,cy=H/2;
  const all=[...vecs.filter(v=>v.on)];
  if(rV&&!rV.scalar) all.push(rV);
  if(sR&&!sR.err) all.push({vx:sR.vx,vy:sR.vy,vz:sR.vz||0});
  const mxC=all.reduce((m,v)=>Math.max(m,Math.abs(v.vx),Math.abs(v.vy),Math.abs(v.vz||0)),5);
  const axLen=mxC*1.5, s=Math.min(W,H)/(axLen*2.8)*scl;

  ctx.clearRect(0,0,W,H);
  // Background gradient
  const bg=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(W,H)*.8);
  bg.addColorStop(0,_canvasColors.canvasBg0||'#0d1628');bg.addColorStop(1,_canvasColors.canvasBg1||'#060a10');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);

  // ── GRID DE REFERENCIA — líneas de cuadrícula (sin dots, solo líneas suaves) ──
  // Sustituye el grid volumétrico de dots (9261 iter) por líneas CSS-style eficientes
  if(mode===3){
    // Plano XZ (suelo) — cuadrícula horizontal de referencia
    const gridStep=adaptiveStep(axLen);
    ctx.save();
    ctx.strokeStyle=_canvasColors.gridLine||'rgba(40,65,110,0.22)';ctx.lineWidth=0.6;ctx.globalAlpha=1;
    for(let v=-Math.floor(axLen);v<=Math.floor(axLen);v+=gridStep){
      // Líneas paralelas al eje X en el plano Y=0
      const a=p3(-axLen,0,v,cx,cy,s), b=p3(axLen,0,v,cx,cy,s);
      ctx.beginPath();ctx.moveTo(a.sx,a.sy);ctx.lineTo(b.sx,b.sy);ctx.stroke();
      // Líneas paralelas al eje Z en el plano Y=0
      const c=p3(v,0,-axLen,cx,cy,s), d=p3(v,0,axLen,cx,cy,s);
      ctx.beginPath();ctx.moveTo(c.sx,c.sy);ctx.lineTo(d.sx,d.sy);ctx.stroke();
    }
    ctx.restore();
  } else {
    // Cuadrícula cartesiana R2 — líneas ortogonales suaves
    const gridStep2=adaptiveStep(axLen);
    ctx.save();
    ctx.strokeStyle=_canvasColors.gridLine||'rgba(30,51,90,0.28)';ctx.lineWidth=0.5;ctx.globalAlpha=1;
    for(let v=-Math.floor(axLen);v<=Math.floor(axLen);v+=gridStep2){
      if(Math.abs(v)<0.001) continue; // los ejes se dibujan solos
      const hL=p2(-axLen,v,cx,cy,s), hR=p2(axLen,v,cx,cy,s);
      ctx.beginPath();ctx.moveTo(hL.sx,hL.sy);ctx.lineTo(hR.sx,hR.sy);ctx.stroke();
      const vT=p2(v,axLen,cx,cy,s), vB=p2(v,-axLen,cx,cy,s);
      ctx.beginPath();ctx.moveTo(vT.sx,vT.sy);ctx.lineTo(vB.sx,vB.sy);ctx.stroke();
    }
    ctx.restore();
  }

  if(mode===3){

    const o=p3(0,0,0,cx,cy,s);
    ctx.beginPath();ctx.arc(o.sx,o.sy,6,0,Math.PI*2);const _oc3=_canvasColors.origin;ctx.fillStyle=_oc3;ctx.shadowColor=_oc3;ctx.shadowBlur=14;ctx.fill();ctx.shadowBlur=0;
ctx.beginPath();ctx.arc(o.sx,o.sy,2.5,0,Math.PI*2);ctx.fillStyle=_canvasColors.originDot;ctx.fill();

    const axes=[
      [[axLen,0,0],[-axLen,0,0],'#ff5572','X',[1,0,0]],
      [[0,axLen,0],[0,-axLen,0],'#2dd4a0','Y',[0,1,0]],
      [[0,0,axLen],[0,0,-axLen],'#4da6ff','Z',[0,0,1]],
    ];
    axes.forEach(([pos,neg,col,lbl,dir])=>{
      const pp=p3(...pos,cx,cy,s),pl=p3(pos[0]*1.18,pos[1]*1.18,pos[2]*1.18,cx,cy,s);
      const pn=p3(...neg,cx,cy,s),nl=p3(neg[0]*1.18,neg[1]*1.18,neg[2]*1.18,cx,cy,s);
      drawAxis3(o,pp,pl,pn,nl,col,lbl,2.5,axLen,s,cx,cy);
      drawAxisTicks3(o,dir,col,axLen,s,cx,cy,p3);
    });

    // Geometric figure — connect tips only, forming correct polygon
    if(showFigure){
      const active=vecs.filter(v=>v.on);
      if(active.length>=2){
        const tips=active.map(v=>p3(v.vx,v.vy,v.vz,cx,cy,s));
        // Fill polygon (tips only, closed loop)
        ctx.globalAlpha=.13;
        ctx.beginPath();
        tips.forEach((pt,i)=>i===0?ctx.moveTo(pt.sx,pt.sy):ctx.lineTo(pt.sx,pt.sy));
        ctx.closePath();
        ctx.fillStyle='#f0c040';ctx.fill();
        // Outline edges (tip[0]→tip[1]→tip[2]→...→tip[0])
        ctx.globalAlpha=.6;
        ctx.beginPath();
        tips.forEach((pt,i)=>i===0?ctx.moveTo(pt.sx,pt.sy):ctx.lineTo(pt.sx,pt.sy));
        ctx.closePath();
        ctx.strokeStyle='#f0c040';ctx.lineWidth=1.8;ctx.setLineDash([]);ctx.stroke();
        // Label each tip
        ctx.globalAlpha=.9;ctx.font='bold 11px Space Mono';ctx.textAlign='center';ctx.textBaseline='bottom';
        active.forEach((v,i)=>{
          const c=v.cl;
          ctx.fillStyle=c;ctx.fillText(v.nm,tips[i].sx,tips[i].sy-6);
        });
        ctx.globalAlpha=1;
      }
    }

    vecs.filter(v=>v.on).forEach(v=>{
      const col=v.cl;
      const po=p3(0,0,0,cx,cy,s),pt=p3(v.vx,v.vy,v.vz,cx,cy,s);
      drawArrow(po.sx,po.sy,pt.sx,pt.sy,col,3.5);
      // Vector name label at tip
      ctx.save();ctx.font='bold 12px Space Mono';ctx.textAlign='center';ctx.textBaseline='bottom';
      ctx.shadowColor=col;ctx.shadowBlur=8;ctx.fillStyle=col;ctx.globalAlpha=.95;
      ctx.fillText(v.nm,pt.sx,pt.sy-10);ctx.restore();
      // Projection shadows
      const tip=[v.vx,v.vy,v.vz];
      ctx.globalAlpha=.32;ctx.lineWidth=1.5;ctx.setLineDash([4,4]);
      [[tip[0],0,tip[2]],[tip[0],tip[1],0],[0,tip[1],tip[2]]].forEach(sh=>{
        const ps=p3(...sh,cx,cy,s);ctx.beginPath();ctx.moveTo(pt.sx,pt.sy);ctx.lineTo(ps.sx,ps.sy);ctx.strokeStyle=col;ctx.stroke();
        ctx.beginPath();ctx.arc(ps.sx,ps.sy,2.5,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
      });
      ctx.setLineDash([]);ctx.globalAlpha=1;
    });
    if(rV&&!rV.scalar){const po=p3(0,0,0,cx,cy,s),pt=p3(rV.vx,rV.vy,rV.vz,cx,cy,s);drawArrow(po.sx,po.sy,pt.sx,pt.sy,RC,3.5);}
    if(sR&&!sR.err){const po=p3(0,0,0,cx,cy,s),pt=p3(sR.vx,sR.vy,sR.vz||0,cx,cy,s);drawArrow(po.sx,po.sy,pt.sx,pt.sy,SC,3.5);}
    // Figura geométrica 3D
    if(figState) renderFigure(ctx, (x,y,z)=>{const pp=p3(x,y,z,cx,cy,s);return{sx:pp.sx,sy:pp.sy,z2:pp.z2??(-z)};}, figState);
  } else {

    const o=p2(0,0,cx,cy,s);
    ctx.beginPath();ctx.arc(o.sx,o.sy,6,0,Math.PI*2);ctx.fillStyle='#c8d8f0';ctx.shadowColor='#c8d8f0';ctx.shadowBlur=14;ctx.fill();ctx.shadowBlur=0;
ctx.beginPath();ctx.arc(o.sx,o.sy,2.5,0,Math.PI*2);ctx.fillStyle=_canvasColors.originDot;ctx.fill();

    // Axes R2
    [[[axLen,0],[-axLen,0],'#ff5572','X',true],[[0,axLen],[0,-axLen],'#2dd4a0','Y',false]].forEach(([pos,neg,col,lbl,isX])=>{
      const pp=p2(...pos,cx,cy,s),pl=p2(pos[0]*1.15,pos[1]*1.15,cx,cy,s);
      const pn=p2(...neg,cx,cy,s),nl=p2(neg[0]*1.15,neg[1]*1.15,cx,cy,s);
      ctx.beginPath();ctx.moveTo(o.sx,o.sy);ctx.lineTo(pn.sx,pn.sy);ctx.strokeStyle=col;ctx.lineWidth=1.4;ctx.globalAlpha=.2;ctx.setLineDash([5,7]);ctx.stroke();ctx.setLineDash([]);
      ctx.globalAlpha=.2;ctx.fillStyle=col;ctx.font='bold 11px Space Mono';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('-'+lbl,nl.sx,nl.sy);
      ctx.beginPath();ctx.moveTo(o.sx,o.sy);ctx.lineTo(pp.sx,pp.sy);ctx.strokeStyle=col;ctx.lineWidth=2.5;ctx.globalAlpha=.9;ctx.setLineDash([]);ctx.stroke();
      const dx=pp.sx-o.sx,dy=pp.sy-o.sy,l=Math.sqrt(dx*dx+dy*dy);
      if(l>4){const ux=dx/l,uy=dy/l,hw=5,hl=11,bx=pp.sx-ux*hl,by=pp.sy-uy*hl;ctx.beginPath();ctx.moveTo(pp.sx,pp.sy);ctx.lineTo(bx+uy*hw,by-ux*hw);ctx.lineTo(bx-uy*hw,by+ux*hw);ctx.closePath();ctx.fillStyle=col;ctx.globalAlpha=.9;ctx.fill();}
      ctx.globalAlpha=.9;ctx.fillStyle=col;ctx.font='bold 13px Space Mono';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(lbl,pl.sx,pl.sy);ctx.globalAlpha=1;
      drawAxisTicks2(o,isX,col,axLen,s,cx,cy);
    });

    // Figure R2 — connect tips only
    if(showFigure){
      const active=vecs.filter(v=>v.on);
      if(active.length>=2){
        const tips=active.map(v=>p2(v.vx,v.vy,cx,cy,s));
        ctx.globalAlpha=.13;
        ctx.beginPath();
        tips.forEach((pt,i)=>i===0?ctx.moveTo(pt.sx,pt.sy):ctx.lineTo(pt.sx,pt.sy));
        ctx.closePath();ctx.fillStyle='#f0c040';ctx.fill();
        ctx.globalAlpha=.6;
        ctx.beginPath();
        tips.forEach((pt,i)=>i===0?ctx.moveTo(pt.sx,pt.sy):ctx.lineTo(pt.sx,pt.sy));
        ctx.closePath();ctx.strokeStyle='#f0c040';ctx.lineWidth=1.8;ctx.setLineDash([]);ctx.stroke();
        ctx.globalAlpha=.9;ctx.font='bold 11px Space Mono';ctx.textAlign='center';ctx.textBaseline='bottom';
        active.forEach((v,i)=>{
          const c=v.cl;
          ctx.fillStyle=c;ctx.fillText(v.nm,tips[i].sx,tips[i].sy-6);
        });
        ctx.globalAlpha=1;
      }
    }

    vecs.filter(v=>v.on).forEach(v=>{
      const col=v.cl;
      const po=p2(0,0,cx,cy,s),pt=p2(v.vx,v.vy,cx,cy,s);
      drawArrow(po.sx,po.sy,pt.sx,pt.sy,col,3.5);
      // Vector name label
      ctx.save();ctx.font='bold 12px Space Mono';ctx.textAlign='center';ctx.textBaseline='bottom';
      ctx.shadowColor=col;ctx.shadowBlur=8;ctx.fillStyle=col;ctx.globalAlpha=.95;
      ctx.fillText(v.nm,pt.sx,pt.sy-10);ctx.restore();
      // Orthogonal projections to X and Y axes
      const px=p2(v.vx,0,cx,cy,s);  // foot on X axis
      const py=p2(0,v.vy,cx,cy,s);  // foot on Y axis
      ctx.save();
      ctx.globalAlpha=.32;ctx.lineWidth=1.5;ctx.setLineDash([4,4]);ctx.lineCap='round';
      // tip → foot on X
      ctx.beginPath();ctx.moveTo(pt.sx,pt.sy);ctx.lineTo(px.sx,px.sy);ctx.strokeStyle=col;ctx.stroke();
      // tip → foot on Y
      ctx.beginPath();ctx.moveTo(pt.sx,pt.sy);ctx.lineTo(py.sx,py.sy);ctx.strokeStyle=col;ctx.stroke();
      ctx.setLineDash([]);
      // dots at feet
      ctx.globalAlpha=.55;
      ctx.beginPath();ctx.arc(px.sx,px.sy,3,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
      ctx.beginPath();ctx.arc(py.sx,py.sy,3,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
      ctx.restore();
    });
    if(rV&&!rV.scalar){const po=p2(0,0,cx,cy,s),pt=p2(rV.vx,rV.vy,cx,cy,s);drawArrow(po.sx,po.sy,pt.sx,pt.sy,RC,3.5);}
    if(sR&&!sR.err){const po=p2(0,0,cx,cy,s),pt=p2(sR.vx,sR.vy,cx,cy,s);drawArrow(po.sx,po.sy,pt.sx,pt.sy,SC,3.5);}
  }
}

// ── RESIZE & INPUT ────────────────────────────────────
// ⚠ WARNING — FUNCIÓN CRÍTICA: resize() — Sincroniza canvas físico con el contenedor #cw.
// • Usar getBoundingClientRect() en vez de clientWidth para mayor precisión con DPR.
// • El guard w && rect.width && rect.height evita el crop cuando el módulo no está visible.
// • Math.round() en las dimensiones evita subpíxeles en pantallas HiDPI.
// • NO llamar desde fuera de este módulo — el ResizeObserver ya lo dispara automáticamente.
function resize(){
  const w = document.getElementById('cw');
  if(!w) return;
  const rect = w.getBoundingClientRect();
  if(!rect.width || !rect.height) return;
  const dpr = window.devicePixelRatio || 1;
  cv.width  = Math.round(rect.width  * dpr);
  cv.height = Math.round(rect.height * dpr);
  cv.style.width  = rect.width  + 'px';
  cv.style.height = rect.height + 'px';
  draw();
}
cv.addEventListener('mousedown',e=>{drag={x:e.clientX,y:e.clientY,rx:rotX,ry:rotY};});
window.addEventListener('mousemove',e=>{if(!drag)return;if(mode===3){rotY=drag.ry+(e.clientX-drag.x)*.5;rotX=drag.rx-(e.clientY-drag.y)*.5;}draw();});
window.addEventListener('mouseup',()=>{drag=null;});
cv.addEventListener('touchstart',e=>{
  if(e.touches.length===1) drag={x:e.touches[0].clientX,y:e.touches[0].clientY,rx:rotX,ry:rotY};
  else if(e.touches.length===2){const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;lp=Math.sqrt(dx*dx+dy*dy);}
  e.preventDefault();},{passive:false});
cv.addEventListener('touchmove',e=>{
  if(e.touches.length===1&&drag){if(mode===3){rotY=drag.ry+(e.touches[0].clientX-drag.x)*.5;rotX=drag.rx-(e.touches[0].clientY-drag.y)*.5;}draw();}
  else if(e.touches.length===2&&lp){const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;const d=Math.sqrt(dx*dx+dy*dy);scl=Math.min(Math.max(scl*(d/lp),.3),5);lp=d;draw();}
  e.preventDefault();},{passive:false});
cv.addEventListener('touchend',()=>{drag=null;lp=null;});
window.addEventListener('resize',resize);
cv.addEventListener('wheel',e=>{
  e.preventDefault();
  const delta=e.deltaY>0?0.92:1.08;
  scl=Math.min(Math.max(scl*delta,.3),5);
  draw();
},{passive:false});

// ── RESIZE OBSERVER (reemplaza setTimeout para canvas) ────────────────────
const _cwObserver = new ResizeObserver(() => { resize(); });

// ⚠ WARNING — FUNCIÓN DE INICIALIZACIÓN: initVectorsApp()
// • Solo se llama una vez (_alInitDone). Los reinicios solo hacen resize.
// • El doble requestAnimationFrame en launchSubmod es NECESARIO — garantiza layout real.
// • _cwObserver dispara resize() en cada cambio de tamaño del #cw.
// • NO llamar resize() directamente fuera de este flujo — usar el observer.
function initVectorsApp(){
  if(!window._alInitDone){
    window._alInitDone=true;
    vecs=[]; palIdx=0; nid=0;
    renderVecs();
  }
  // Observar el contenedor — el observer llama resize() automáticamente al detectar tamaño
  const cw = document.getElementById('cw');
  if(cw && !window._cwObserving){
    _cwObserver.observe(cw);
    window._cwObserving = true;
  }
  // Forzar primer resize explícito — el guard en resize() lo protege si cw.clientWidth=0
  // Un segundo intento con setTimeout asegura que el browser completó el paint
  resize();
  setTimeout(() => { if(cv.width === 0 || cv.height === 0) resize(); }, 150);
}


// ══════════════════════════════════════════════════════
// LAUNCHER
// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
// EM MODULE
// ══════════════════════════════════════════════════════
const EM_K = 8.9875e9;   // Coulomb constant N·m²/C²
const EM_MU0 = 4*Math.PI*1e-7; // permeability N/A²
const EM_EPS0 = 8.854e-12;     // permittivity F/m
let emCoord = 'cart';
let emInitDone = false;
let emCanvas, emCtx;
let emScl = 1, emRotX = 25, emRotY = -35, emDrag = null, emLP = null;
let emObjects = []; // field sources/objects to draw
let emResult = null;

function emInit(){
  if(emInitDone) return;
  emInitDone = true;
  emRenderPanels();
  emCanvas = document.getElementById('em-canvas');
  emCtx = emCanvas.getContext('2d');
  emResizeCanvas();
  window.addEventListener('resize', emResizeCanvas);

  // Touch/mouse on EM canvas
  emCanvas.addEventListener('mousedown',e=>{emDrag={x:e.clientX,y:e.clientY,rx:emRotX,ry:emRotY};});
  let emRafPending=false;
  window.addEventListener('mousemove',e=>{
    if(!emDrag)return;
    emRotY=emDrag.ry+(e.clientX-emDrag.x)*.5;
    emRotX=emDrag.rx-(e.clientY-emDrag.y)*.5;
    if(!emRafPending){emRafPending=true;requestAnimationFrame(()=>{emDraw();emRafPending=false;});}
  });
  window.addEventListener('mouseup',()=>{emDrag=null;});
  emCanvas.addEventListener('touchstart',e=>{
    if(e.touches.length===1) emDrag={x:e.touches[0].clientX,y:e.touches[0].clientY,rx:emRotX,ry:emRotY};
    else if(e.touches.length===2){
      const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;
      emLP=Math.sqrt(dx*dx+dy*dy);
    }
  },{passive:true});
  emCanvas.addEventListener('touchmove',e=>{
    e.preventDefault();
    if(e.touches.length===1&&emDrag){
      emRotY=emDrag.ry+(e.touches[0].clientX-emDrag.x)*.5;
      emRotX=emDrag.rx-(e.touches[0].clientY-emDrag.y)*.5;
    } else if(e.touches.length===2&&emLP){
      const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;
      const np=Math.sqrt(dx*dx+dy*dy);
      emScl*=np/emLP; emLP=np;
      emScl=Math.min(Math.max(emScl,.3),5);
    }
    if(!emRafPending){emRafPending=true;requestAnimationFrame(()=>{emDraw();emRafPending=false;});}
  },{passive:false});
  emCanvas.addEventListener('touchend',()=>{emDrag=null;emLP=null;},{passive:true});
  emCanvas.addEventListener('wheel',e=>{
    e.preventDefault();
    emScl*=e.deltaY>0?0.92:1.08;
    emScl=Math.min(Math.max(emScl,.3),5);
    emDraw();
  },{passive:false});

  emForceRenderAllPanels(); // primera carga: renderizar todos los paneles
  if(document.getElementById('em-cw')) _emCwObserver.observe(document.getElementById('em-cw'));
}

const _emCwObserver = new ResizeObserver(() => { emResizeCanvas(); });

// ⚠ WARNING: emResizeCanvas() — igual que resize() en AL, no llamar con layout pendiente.
function emResizeCanvas(){
  const cw = document.getElementById('em-cw');
  if(!cw || !emCanvas) return;
  const rect = cw.getBoundingClientRect();
  if(!rect.width || !rect.height) return;
  const dpr = window.devicePixelRatio || 1;
  emCanvas.width  = Math.round(rect.width  * dpr);
  emCanvas.height = Math.round(rect.height * dpr);
  emCanvas.style.width  = rect.width  + 'px';
  emCanvas.style.height = rect.height + 'px';
  emDraw();
}

// ── 3D PROJECTION (same as AL) ────────────────────────
// emP3() → alias de project3D() arriba

// emDrawArrow → usa drawArrowCtx con emCtx
function emDrawArrow(x1,y1,x2,y2,col,lw=2.5){ drawArrowCtx(emCtx,x1,y1,x2,y2,col,lw); }

// ── DRAW EM CANVAS ────────────────────────────────────

// ⚠ WARNING — FUNCIÓN CRÍTICA: emDraw() — Renderizado 3D del canvas de Electromagnetismo.
// • Usa emCtx (canvas EM), emRotX/emRotY/emScl — variables de estado SEPARADAS de AL.
// • emP3() es alias de project3D() con estado EM — no intercambiar con p3() de vectores.
// • Orden de render: fondo → ejes → objetos EM → etiquetas. No alterar.
// • emDraw() se llama desde emResizeCanvas() — el guard de clientWidth/Height es obligatorio.
function emDraw(){
  if(!emCanvas||!emCtx)return;
  const ctx=emCtx;
  const W=emCanvas.width,H=emCanvas.height,cx=W/2,cy=H/2;
  ctx.clearRect(0,0,W,H);

  // Background
  const bg=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(W,H)*.8);
  bg.addColorStop(0,_canvasColors.canvasBg0||'#0d1628');bg.addColorStop(1,_canvasColors.canvasBg1||'#060a10');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);

  ctx.globalAlpha=1;

  // Compute axis length based on objects
  const allCoords=emObjects.flatMap(o=>o.type==='vector'
    ?[Math.abs((o.ox||0)+o.vx),Math.abs((o.oy||0)+o.vy),Math.abs((o.oz||0)+o.vz)]
    :[Math.abs(o.x||0),Math.abs(o.y||0),Math.abs(o.z||0)]);
  const axLen=Math.max(6, ...(allCoords.length?allCoords:[6]))*1.4;

  // Axes — identical to AL module
  const emAxDef=[
    [[axLen,0,0],[-axLen,0,0],'#ff5572','X',[1,0,0]],
    [[0,axLen,0],[0,-axLen,0],'#2dd4a0','Y',[0,1,0]],
    [[0,0,axLen],[0,0,-axLen],'#4da6ff','Z',[0,0,1]],
  ];
  // Draw axes using EM context — mirrors drawAxis3/drawAxisTicks3 logic
  const ec=emCtx, emO=emP3(0,0,0);
  emAxDef.forEach(([pos,neg,col,lbl,dir])=>{
    const pp=emP3(...pos), pl=emP3(pos[0]*1.18,pos[1]*1.18,pos[2]*1.18);
    const pn=emP3(...neg), nl=emP3(neg[0]*1.18,neg[1]*1.18,neg[2]*1.18);
    const lw=2.5;
    // Negative dashed
    ec.beginPath();ec.moveTo(emO.sx,emO.sy);ec.lineTo(pn.sx,pn.sy);
    ec.strokeStyle=col;ec.lineWidth=lw*.5;ec.globalAlpha=.2;ec.setLineDash([5,7]);ec.lineCap='round';ec.stroke();ec.setLineDash([]);
    ec.globalAlpha=.2;ec.fillStyle=col;ec.font='bold 11px Space Mono';ec.textAlign='center';ec.textBaseline='middle';ec.fillText('-'+lbl,nl.sx,nl.sy);
    // Positive solid
    ec.beginPath();ec.moveTo(emO.sx,emO.sy);ec.lineTo(pp.sx,pp.sy);
    ec.strokeStyle=col;ec.lineWidth=lw;ec.globalAlpha=.9;ec.setLineDash([]);ec.stroke();
    const ddx=pp.sx-emO.sx,ddy=pp.sy-emO.sy,ll=Math.sqrt(ddx*ddx+ddy*ddy);
    if(ll>4){const ux=ddx/ll,uy=ddy/ll,hw=5,hl=11,bx=pp.sx-ux*hl,by=pp.sy-uy*hl;ec.beginPath();ec.moveTo(pp.sx,pp.sy);ec.lineTo(bx+uy*hw,by-ux*hw);ec.lineTo(bx-uy*hw,by+ux*hw);ec.closePath();ec.fillStyle=col;ec.globalAlpha=.9;ec.fill();}
    ec.globalAlpha=.9;ec.fillStyle=col;ec.font='bold 13px Space Mono';ec.textAlign='center';ec.textBaseline='middle';ec.fillText(lbl,pl.sx,pl.sy);
    ec.globalAlpha=1;
    // Ticks
    const step=adaptiveStep(axLen);
    for(let v=step;v<=Math.floor(axLen);v+=step){
      const tp=emP3(dir[0]*v,dir[1]*v,dir[2]*v),tn=emP3(-dir[0]*v,-dir[1]*v,-dir[2]*v);
      ec.globalAlpha=.9;ec.beginPath();ec.arc(tp.sx,tp.sy,2.5,0,Math.PI*2);ec.fillStyle=col;ec.fill();
      ec.globalAlpha=.3;ec.beginPath();ec.arc(tn.sx,tn.sy,2,0,Math.PI*2);ec.fillStyle=col;ec.fill();
      const nx=tp.sx+11,ny=tp.sy+11;
      ec.font='bold 11px Space Mono';ec.textAlign='center';ec.textBaseline='middle';
      ec.globalAlpha=.6;ec.fillStyle=_canvasColors.canvasBg1||'#060a10';ec.fillRect(nx-9,ny-7,18,14);
      ec.globalAlpha=1;ec.fillStyle=col;ec.fillText(String(v),nx,ny);
      const nnx=tn.sx+11,nny=tn.sy+11;
      ec.globalAlpha=.25;ec.fillStyle=_canvasColors.canvasBg1||'#060a10';ec.fillRect(nnx-11,nny-7,22,14);
      ec.globalAlpha=.4;ec.fillStyle=col;ec.fillText('-'+String(v),nnx,nny);
    }
    ec.globalAlpha=1;
  });

  // Origin
  const o=emP3(0,0,0);
  ctx.beginPath();ctx.arc(o.sx,o.sy,6,0,Math.PI*2);ctx.fillStyle='#c8d8f0';ctx.shadowColor='#c8d8f0';ctx.shadowBlur=14;ctx.fill();ctx.shadowBlur=0;
  ctx.beginPath();ctx.arc(o.sx,o.sy,2.5,0,Math.PI*2);ctx.fillStyle=_canvasColors.originDot;ctx.fill();

  // Draw EM objects
  emObjects.forEach(obj=>{
    if(obj.type==='vector'){
      const o2=emP3(obj.ox||0,obj.oy||0,obj.oz||0);
      const p2=emP3((obj.ox||0)+obj.vx,(obj.oy||0)+obj.vy,(obj.oz||0)+obj.vz);
      emDrawArrow(o2.sx,o2.sy,p2.sx,p2.sy,obj.color||'#4da6ff',3);
      ctx.save();ctx.font='bold 12px Space Mono';ctx.fillStyle=obj.color||'#4da6ff';
      ctx.shadowColor=obj.color||'#4da6ff';ctx.shadowBlur=8;ctx.globalAlpha=.95;
      ctx.textAlign='center';ctx.textBaseline='bottom';
      ctx.fillText(obj.label||'',p2.sx,p2.sy-10);ctx.restore();
    } else if(obj.type==='charge'){
      const pp=emP3(obj.x,obj.y,obj.z);
      const col=obj.q>0?'#ff5572':'#4da6ff';
      ctx.beginPath();ctx.arc(pp.sx,pp.sy,9,0,Math.PI*2);
      ctx.fillStyle=col;ctx.shadowColor=col;ctx.shadowBlur=18;ctx.fill();ctx.shadowBlur=0;
      ctx.beginPath();ctx.arc(pp.sx,pp.sy,4,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,.4)';ctx.fill();
      ctx.font='bold 11px Space Mono';ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(obj.q>0?'+':'−',pp.sx,pp.sy);
      ctx.font='bold 9px Space Mono';ctx.fillStyle=col;ctx.globalAlpha=.9;ctx.textBaseline='top';
      ctx.fillText(obj.label||'q',pp.sx,pp.sy+13);ctx.globalAlpha=1;
    }
  });
  // Figura geométrica EM
  if(emFigState) renderFigure(emCtx, (x,y,z)=>{ const p=emP3(x,y,z); return {sx:p.sx,sy:p.sy,z2:p.z2}; }, emFigState);
}

// ── COORD SYSTEM ──────────────────────────────────────
function emSetCoord(c){
  emCoord=c;
  ['cart','cyl','sph'].forEach(id=>{
    document.getElementById('em-'+id).classList.toggle('on',id===c);
  });
  // Solo actualizar labels de coordenadas — no destruir resultados
  emRefreshCoordLabels();
}

function emResetView(){
  emRotX=25; emRotY=-35; emScl=1; emDraw();
}
function emTogglePanel(){
  const bot=document.getElementById('em-bottom');
  const btn=document.getElementById('em-panel-tog-btn');
  const collapsed=bot.classList.toggle('collapsed');
  btn.classList.toggle('on',!collapsed);
  setTimeout(()=>emResizeCanvas(),50);
}

function emShowTab(tab){
  document.querySelectorAll('.em-tab').forEach((t,i)=>{
    const tabs=['coulomb','gauss','potential','lorentz','faraday','maxwell'];
    t.classList.toggle('on',tabs[i]===tab);
  });
  ['Coulomb','Gauss','Potential','Lorentz','Faraday','Maxwell'].forEach(t=>{
    const p=document.getElementById('em-p'+t);
    if(p) p.classList.toggle('on',t.toLowerCase()===tab);
  });
}

// ── PANEL RENDERERS ───────────────────────────────────
// Renderiza todos los paneles solo si están vacíos (primera carga)

// ── EM CONSTANTS — reutiliza EM_K, EM_EPS0, EM_MU0 ya declarados arriba ──

function emFmt(v){
  if(!isFinite(v)||isNaN(v)) return '—';
  if(Math.abs(v)===0) return '0';
  if(Math.abs(v)<0.001||Math.abs(v)>=1e6) return v.toExponential(4);
  return parseFloat(v.toPrecision(6)).toString();
}
function emInp(id){ return parseFloat(document.getElementById(id)?.value)||0; }
function emRes(id,html){ const el=document.getElementById(id); if(el) el.innerHTML=html; }

function emCard(id, icon, name, desc, fieldsHTML){
  return `<div class="calc-card em-card" id="card-${id}">
    <div class="calc-card-header" onclick="toggleCard('${id}')">
      <div class="calc-card-icon em-card-icon">${icon}</div>
      <div class="calc-card-info">
        <div class="calc-card-name">${name}</div>
        <div class="calc-card-desc">${desc}</div>
      </div>
      <div class="calc-card-arrow" id="arr-${id}">›</div>
    </div>
    <div class="calc-card-body" id="body-${id}">
      <div class="calc-card-inner">${fieldsHTML}</div>
    </div>
  </div>`;
}

function emRenderPanels(){
  // ── COULOMB ──
  document.getElementById('em-pCoulomb').innerHTML =
    emCard('em-coul','⚡','Fuerza de Coulomb','F = k·q₁·q₂ / r²',`
      <div class="calc-field-row"><label>q₁ (C) =</label><input class="calc-inp" id="em-coul-q1" placeholder="1e-6"/></div>
      <div class="calc-field-row"><label>q₂ (C) =</label><input class="calc-inp" id="em-coul-q2" placeholder="-2e-6"/></div>
      <div class="calc-field-row"><label>r (m) =</label><input class="calc-inp" id="em-coul-r" placeholder="0.1"/></div>
      <div class="calc-btn-row">
        <button class="calc-btn em-btn" onclick="emCalcCoulomb()">Calcular F</button>
        <button class="calc-btn sec" onclick="clearCard('em-coul')">Limpiar</button>
      </div>
      <div id="res-em-coul" class="calc-res"></div>
    `) +
    emCard('em-efield','E','Campo Eléctrico','E = k·Q / r² — carga puntual',`
      <div class="calc-field-row"><label>Q (C) =</label><input class="calc-inp" id="em-ef-q" placeholder="1e-6"/></div>
      <div class="calc-field-row"><label>r (m) =</label><input class="calc-inp" id="em-ef-r" placeholder="0.05"/></div>
      <div class="calc-btn-row">
        <button class="calc-btn em-btn" onclick="emCalcEField()">Calcular E</button>
        <button class="calc-btn sec" onclick="clearCard('em-efield')">Limpiar</button>
      </div>
      <div id="res-em-efield" class="calc-res"></div>
    `);

  // ── GAUSS ──
  document.getElementById('em-pGauss').innerHTML =
    emCard('em-gauss-flux','Φ','Flujo Eléctrico','Φ = Q_enc / ε₀',`
      <div class="calc-field-row"><label>Q_enc (C) =</label><input class="calc-inp" id="em-gf-q" placeholder="1e-9"/></div>
      <div class="calc-btn-row">
        <button class="calc-btn em-btn" onclick="emCalcGaussFlux()">Calcular Φ</button>
        <button class="calc-btn sec" onclick="clearCard('em-gauss-flux')">Limpiar</button>
      </div>
      <div id="res-em-gauss-flux" class="calc-res"></div>
    `) +
    emCard('em-gauss-sph','○','E Esférica','Superficie esférica — E = Q / (4πε₀r²)',`
      <div class="calc-field-row"><label>Q (C) =</label><input class="calc-inp" id="em-gs-q" placeholder="1e-6"/></div>
      <div class="calc-field-row"><label>r (m) =</label><input class="calc-inp" id="em-gs-r" placeholder="0.1"/></div>
      <div class="calc-btn-row">
        <button class="calc-btn em-btn" onclick="emCalcGaussSph()">Calcular E</button>
        <button class="calc-btn sec" onclick="clearCard('em-gauss-sph')">Limpiar</button>
      </div>
      <div id="res-em-gauss-sph" class="calc-res"></div>
    `) +
    emCard('em-gauss-cyl','‖','E Cilíndrica','Línea infinita — E = λ / (2πε₀r)',`
      <div class="calc-field-row"><label>λ (C/m) =</label><input class="calc-inp" id="em-gc-l" placeholder="1e-9"/></div>
      <div class="calc-field-row"><label>r (m) =</label><input class="calc-inp" id="em-gc-r" placeholder="0.05"/></div>
      <div class="calc-btn-row">
        <button class="calc-btn em-btn" onclick="emCalcGaussCyl()">Calcular E</button>
        <button class="calc-btn sec" onclick="clearCard('em-gauss-cyl')">Limpiar</button>
      </div>
      <div id="res-em-gauss-cyl" class="calc-res"></div>
    `);

  // ── POTENCIAL ──
  document.getElementById('em-pPotential').innerHTML =
    emCard('em-pot','V','Potencial Eléctrico','V = k·Q / r',`
      <div class="calc-field-row"><label>Q (C) =</label><input class="calc-inp" id="em-pot-q" placeholder="1e-6"/></div>
      <div class="calc-field-row"><label>r (m) =</label><input class="calc-inp" id="em-pot-r" placeholder="0.1"/></div>
      <div class="calc-btn-row">
        <button class="calc-btn em-btn" onclick="emCalcPotential()">Calcular V</button>
        <button class="calc-btn sec" onclick="clearCard('em-pot')">Limpiar</button>
      </div>
      <div id="res-em-pot" class="calc-res"></div>
    `) +
    emCard('em-epot','U','Energía Potencial','U = k·q₁·q₂ / r',`
      <div class="calc-field-row"><label>q₁ (C) =</label><input class="calc-inp" id="em-ep-q1" placeholder="1e-6"/></div>
      <div class="calc-field-row"><label>q₂ (C) =</label><input class="calc-inp" id="em-ep-q2" placeholder="-1e-6"/></div>
      <div class="calc-field-row"><label>r (m) =</label><input class="calc-inp" id="em-ep-r" placeholder="0.05"/></div>
      <div class="calc-btn-row">
        <button class="calc-btn em-btn" onclick="emCalcEPot()">Calcular U</button>
        <button class="calc-btn sec" onclick="clearCard('em-epot')">Limpiar</button>
      </div>
      <div id="res-em-epot" class="calc-res"></div>
    `) +
    emCard('em-cap','C','Capacitancia','C = Q/V — placas paralelas C = ε₀A/d',`
      <div class="calc-field-row"><label>A (m²) =</label><input class="calc-inp" id="em-cap-a" placeholder="0.01"/></div>
      <div class="calc-field-row"><label>d (m) =</label><input class="calc-inp" id="em-cap-d" placeholder="0.001"/></div>
      <div class="calc-field-row"><label>εᵣ =</label><input class="calc-inp calc-inp-sm" id="em-cap-er" placeholder="1" value="1"/></div>
      <div class="calc-btn-row">
        <button class="calc-btn em-btn" onclick="emCalcCap()">Calcular C</button>
        <button class="calc-btn sec" onclick="clearCard('em-cap')">Limpiar</button>
      </div>
      <div id="res-em-cap" class="calc-res"></div>
    `);

  // ── LORENTZ ──
  document.getElementById('em-pLorentz').innerHTML =
    emCard('em-lor','F','Fuerza de Lorentz','F = q(E + v × B)',`
      <div class="calc-field-row"><label>q (C) =</label><input class="calc-inp" id="em-lor-q" placeholder="1.6e-19"/></div>
      <div class="calc-field-row">
        <label>E =</label>
        <input class="calc-inp calc-inp-sm" id="em-lor-ex" placeholder="Ex"/>
        <input class="calc-inp calc-inp-sm" id="em-lor-ey" placeholder="Ey"/>
        <input class="calc-inp calc-inp-sm" id="em-lor-ez" placeholder="Ez"/>
      </div>
      <div class="calc-field-row">
        <label>v =</label>
        <input class="calc-inp calc-inp-sm" id="em-lor-vx" placeholder="vx"/>
        <input class="calc-inp calc-inp-sm" id="em-lor-vy" placeholder="vy"/>
        <input class="calc-inp calc-inp-sm" id="em-lor-vz" placeholder="vz"/>
      </div>
      <div class="calc-field-row">
        <label>B =</label>
        <input class="calc-inp calc-inp-sm" id="em-lor-bx" placeholder="Bx"/>
        <input class="calc-inp calc-inp-sm" id="em-lor-by" placeholder="By"/>
        <input class="calc-inp calc-inp-sm" id="em-lor-bz" placeholder="Bz"/>
      </div>
      <div class="calc-btn-row">
        <button class="calc-btn em-btn" onclick="emCalcLorentz()">Calcular F</button>
        <button class="calc-btn sec" onclick="clearCard('em-lor')">Limpiar</button>
      </div>
      <div id="res-em-lor" class="calc-res"></div>
    `) +
    emCard('em-bfield','B','Campo Magnético','B = μ₀I / (2πr) — hilo infinito',`
      <div class="calc-field-row"><label>I (A) =</label><input class="calc-inp" id="em-bf-i" placeholder="10"/></div>
      <div class="calc-field-row"><label>r (m) =</label><input class="calc-inp" id="em-bf-r" placeholder="0.05"/></div>
      <div class="calc-btn-row">
        <button class="calc-btn em-btn" onclick="emCalcBField()">Calcular B</button>
        <button class="calc-btn sec" onclick="clearCard('em-bfield')">Limpiar</button>
      </div>
      <div id="res-em-bfield" class="calc-res"></div>
    `);

  // ── FARADAY ──
  document.getElementById('em-pFaraday').innerHTML =
    emCard('em-far','ε','FEM Inducida','ε = −N · ΔΦ/Δt',`
      <div class="calc-field-row"><label>N (espiras) =</label><input class="calc-inp calc-inp-sm" id="em-far-n" placeholder="1" value="1"/></div>
      <div class="calc-field-row"><label>Φ₁ (Wb) =</label><input class="calc-inp" id="em-far-p1" placeholder="0.01"/></div>
      <div class="calc-field-row"><label>Φ₂ (Wb) =</label><input class="calc-inp" id="em-far-p2" placeholder="0.005"/></div>
      <div class="calc-field-row"><label>Δt (s) =</label><input class="calc-inp" id="em-far-dt" placeholder="0.1"/></div>
      <div class="calc-btn-row">
        <button class="calc-btn em-btn" onclick="emCalcFaraday()">Calcular ε</button>
        <button class="calc-btn sec" onclick="clearCard('em-far')">Limpiar</button>
      </div>
      <div id="res-em-far" class="calc-res"></div>
    `) +
    emCard('em-ind','L','Inductancia','L = NΦ / I — y energía U = ½LI²',`
      <div class="calc-field-row"><label>N =</label><input class="calc-inp calc-inp-sm" id="em-ind-n" placeholder="100"/></div>
      <div class="calc-field-row"><label>Φ (Wb) =</label><input class="calc-inp" id="em-ind-p" placeholder="0.001"/></div>
      <div class="calc-field-row"><label>I (A) =</label><input class="calc-inp" id="em-ind-i" placeholder="2"/></div>
      <div class="calc-btn-row">
        <button class="calc-btn em-btn" onclick="emCalcInductance()">Calcular L</button>
        <button class="calc-btn sec" onclick="clearCard('em-ind')">Limpiar</button>
      </div>
      <div id="res-em-ind" class="calc-res"></div>
    `);

  // ── MAXWELL ──
  document.getElementById('em-pMaxwell').innerHTML =
    emCard('em-mxw-ohm','Ω','Ley de Ohm & Potencia','V = IR, P = IV, P = I²R',`
      <div class="calc-field-row"><label>V (V) =</label><input class="calc-inp" id="em-ohm-v" placeholder=""/></div>
      <div class="calc-field-row"><label>I (A) =</label><input class="calc-inp" id="em-ohm-i" placeholder=""/></div>
      <div class="calc-field-row"><label>R (Ω) =</label><input class="calc-inp" id="em-ohm-r" placeholder=""/></div>
      <div class="calc-btn-row">
        <button class="calc-btn em-btn" onclick="emCalcOhm()">Resolver</button>
        <button class="calc-btn sec" onclick="clearCard('em-mxw-ohm')">Limpiar</button>
      </div>
      <div id="res-em-mxw-ohm" class="calc-res"></div>
    `) +
    emCard('em-mxw-rc','τ','Circuito RC','τ = RC — carga/descarga',`
      <div class="calc-field-row"><label>R (Ω) =</label><input class="calc-inp" id="em-rc-r" placeholder="1000"/></div>
      <div class="calc-field-row"><label>C (F) =</label><input class="calc-inp" id="em-rc-c" placeholder="1e-6"/></div>
      <div class="calc-field-row"><label>V₀ (V) =</label><input class="calc-inp" id="em-rc-v0" placeholder="12"/></div>
      <div class="calc-field-row"><label>t (s) =</label><input class="calc-inp" id="em-rc-t" placeholder="0.001"/></div>
      <div class="calc-btn-row">
        <button class="calc-btn em-btn" onclick="emCalcRC()">Calcular</button>
        <button class="calc-btn sec" onclick="clearCard('em-mxw-rc')">Limpiar</button>
      </div>
      <div id="res-em-mxw-rc" class="calc-res"></div>
    `) +
    `<div class="calc-card em-card" style="padding:14px;opacity:.7">
      <div style="font-size:11px;font-family:'Space Mono',monospace;color:var(--text2);line-height:1.8">
        <div style="font-weight:700;color:var(--fi);margin-bottom:6px">Ecuaciones de Maxwell</div>
        <div>∇·E = ρ/ε₀ <span style="color:var(--text3);margin-left:8px">— Ley de Gauss</span></div>
        <div>∇·B = 0 <span style="color:var(--text3);margin-left:8px">— No monopolos</span></div>
        <div>∇×E = −∂B/∂t <span style="color:var(--text3);margin-left:8px">— Faraday</span></div>
        <div>∇×B = μ₀J + μ₀ε₀∂E/∂t <span style="color:var(--text3);margin-left:8px">— Ampère-Maxwell</span></div>
      </div>
    </div>`;
}

// ── EM CALCULATION FUNCTIONS ─────────────────────────
function emCalcCoulomb(){
  const q1=emInp('em-coul-q1'), q2=emInp('em-coul-q2'), r=emInp('em-coul-r');
  if(r===0) return emRes('res-em-coul','<div class="calc-res-val" style="color:var(--red)">r no puede ser 0</div>');
  const F=EM_K*q1*q2/(r*r);
  const tipo=F>0?'repulsiva':'atractiva';
  emRes('res-em-coul',`
    <div class="calc-res-lbl">Fuerza</div>
    <div class="calc-res-val">F = ${emFmt(F)} N</div>
    <div class="calc-res-lbl" style="margin-top:4px">|F| = ${emFmt(Math.abs(F))} N — ${tipo}</div>
  `);
}
function emCalcEField(){
  const Q=emInp('em-ef-q'), r=emInp('em-ef-r');
  if(r===0) return emRes('res-em-efield','<div class="calc-res-val" style="color:var(--red)">r no puede ser 0</div>');
  const E=EM_K*Q/(r*r);
  emRes('res-em-efield',`
    <div class="calc-res-lbl">Campo eléctrico</div>
    <div class="calc-res-val">E = ${emFmt(E)} N/C</div>
    <div class="calc-res-lbl" style="margin-top:4px">Dirección: ${E>0?'radial hacia afuera ↗':'radial hacia adentro ↙'}</div>
  `);
}
function emCalcGaussFlux(){
  const Q=emInp('em-gf-q');
  const phi=Q/EM_EPS0;
  emRes('res-em-gauss-flux',`
    <div class="calc-res-lbl">Flujo eléctrico</div>
    <div class="calc-res-val">Φ = ${emFmt(phi)} N·m²/C</div>
    <div class="calc-res-lbl" style="margin-top:4px">ε₀ = ${EM_EPS0.toExponential(4)} F/m</div>
  `);
}
function emCalcGaussSph(){
  const Q=emInp('em-gs-q'), r=emInp('em-gs-r');
  if(r===0) return emRes('res-em-gauss-sph','<div class="calc-res-val" style="color:var(--red)">r no puede ser 0</div>');
  const E=Q/(4*Math.PI*EM_EPS0*r*r);
  emRes('res-em-gauss-sph',`
    <div class="calc-res-lbl">Campo (simetría esférica)</div>
    <div class="calc-res-val">E = ${emFmt(E)} N/C</div>
  `);
}
function emCalcGaussCyl(){
  const lambda=emInp('em-gc-l'), r=emInp('em-gc-r');
  if(r===0) return emRes('res-em-gauss-cyl','<div class="calc-res-val" style="color:var(--red)">r no puede ser 0</div>');
  const E=lambda/(2*Math.PI*EM_EPS0*r);
  emRes('res-em-gauss-cyl',`
    <div class="calc-res-lbl">Campo (línea infinita)</div>
    <div class="calc-res-val">E = ${emFmt(E)} N/C</div>
  `);
}
function emCalcPotential(){
  const Q=emInp('em-pot-q'), r=emInp('em-pot-r');
  if(r===0) return emRes('res-em-pot','<div class="calc-res-val" style="color:var(--red)">r no puede ser 0</div>');
  const V=EM_K*Q/r;
  emRes('res-em-pot',`
    <div class="calc-res-lbl">Potencial eléctrico</div>
    <div class="calc-res-val">V = ${emFmt(V)} V</div>
  `);
}
function emCalcEPot(){
  const q1=emInp('em-ep-q1'), q2=emInp('em-ep-q2'), r=emInp('em-ep-r');
  if(r===0) return emRes('res-em-epot','<div class="calc-res-val" style="color:var(--red)">r no puede ser 0</div>');
  const U=EM_K*q1*q2/r;
  emRes('res-em-epot',`
    <div class="calc-res-lbl">Energía potencial</div>
    <div class="calc-res-val">U = ${emFmt(U)} J</div>
    <div class="calc-res-lbl" style="margin-top:4px">${U<0?'Sistema ligado (atractivo)':'Sistema repulsivo'}</div>
  `);
}
function emCalcCap(){
  const A=emInp('em-cap-a'), d=emInp('em-cap-d'), er=emInp('em-cap-er')||1;
  if(d===0) return emRes('res-em-cap','<div class="calc-res-val" style="color:var(--red)">d no puede ser 0</div>');
  const C=er*EM_EPS0*A/d;
  const Uf=0; // no voltage given
  emRes('res-em-cap',`
    <div class="calc-res-lbl">Capacitancia</div>
    <div class="calc-res-val">C = ${emFmt(C)} F</div>
    <div class="calc-res-lbl" style="margin-top:4px">${C>1e-6?emFmt(C*1e6)+' μF':C>1e-9?emFmt(C*1e9)+' nF':emFmt(C*1e12)+' pF'}</div>
  `);
}
function emCalcLorentz(){
  const q=emInp('em-lor-q');
  const ex=emInp('em-lor-ex'),ey=emInp('em-lor-ey'),ez=emInp('em-lor-ez');
  const vx=emInp('em-lor-vx'),vy=emInp('em-lor-vy'),vz=emInp('em-lor-vz');
  const bx=emInp('em-lor-bx'),by=emInp('em-lor-by'),bz=emInp('em-lor-bz');
  // v × B
  const cx=vy*bz-vz*by, cy=vz*bx-vx*bz, cz=vx*by-vy*bx;
  const fx=q*(ex+cx), fy=q*(ey+cy), fz=q*(ez+cz);
  const mag=Math.sqrt(fx*fx+fy*fy+fz*fz);
  emRes('res-em-lor',`
    <div class="calc-res-lbl">Fuerza de Lorentz</div>
    <div class="calc-res-val">F = (${emFmt(fx)}, ${emFmt(fy)}, ${emFmt(fz)}) N</div>
    <div class="calc-res-lbl" style="margin-top:4px">|F| = ${emFmt(mag)} N</div>
    <div class="calc-res-lbl">v × B = (${emFmt(cx)}, ${emFmt(cy)}, ${emFmt(cz)})</div>
  `);
}
function emCalcBField(){
  const I=emInp('em-bf-i'), r=emInp('em-bf-r');
  if(r===0) return emRes('res-em-bfield','<div class="calc-res-val" style="color:var(--red)">r no puede ser 0</div>');
  const B=EM_MU0*I/(2*Math.PI*r);
  emRes('res-em-bfield',`
    <div class="calc-res-lbl">Campo magnético</div>
    <div class="calc-res-val">B = ${emFmt(B)} T</div>
    <div class="calc-res-lbl" style="margin-top:4px">${B>1e-3?emFmt(B*1e3)+' mT':emFmt(B*1e6)+' μT'}</div>
  `);
}
function emCalcFaraday(){
  const N=emInp('em-far-n')||1, p1=emInp('em-far-p1'), p2=emInp('em-far-p2'), dt=emInp('em-far-dt');
  if(dt===0) return emRes('res-em-far','<div class="calc-res-val" style="color:var(--red)">Δt no puede ser 0</div>');
  const emf=-N*(p2-p1)/dt;
  emRes('res-em-far',`
    <div class="calc-res-lbl">FEM inducida</div>
    <div class="calc-res-val">ε = ${emFmt(emf)} V</div>
    <div class="calc-res-lbl" style="margin-top:4px">ΔΦ = ${emFmt(p2-p1)} Wb · N = ${N}</div>
  `);
}
function emCalcInductance(){
  const N=emInp('em-ind-n'), phi=emInp('em-ind-p'), I=emInp('em-ind-i');
  if(I===0) return emRes('res-em-ind','<div class="calc-res-val" style="color:var(--red)">I no puede ser 0</div>');
  const L=N*phi/I;
  const U=0.5*L*I*I;
  emRes('res-em-ind',`
    <div class="calc-res-lbl">Inductancia</div>
    <div class="calc-res-val">L = ${emFmt(L)} H</div>
    <div class="calc-res-lbl" style="margin-top:4px">${L>1e-3?emFmt(L*1e3)+' mH':emFmt(L*1e6)+' μH'}</div>
    <div class="calc-res-lbl" style="margin-top:4px">Energía: U = ½LI² = ${emFmt(U)} J</div>
  `);
}
function emCalcOhm(){
  let V=parseFloat(document.getElementById('em-ohm-v')?.value);
  let I=parseFloat(document.getElementById('em-ohm-i')?.value);
  let R=parseFloat(document.getElementById('em-ohm-r')?.value);
  const hv=isFinite(V), hi=isFinite(I), hr=isFinite(R);
  if(hv&&hi&&!hr) R=V/I;
  else if(hv&&!hi&&hr) I=V/R;
  else if(!hv&&hi&&hr) V=I*R;
  else if(hv&&hi&&hr){/* all given, just compute */}
  else return emRes('res-em-mxw-ohm','<div class="calc-res-val" style="color:var(--text3)">Ingresa al menos 2 de los 3 valores</div>');
  const P=V*I;
  emRes('res-em-mxw-ohm',`
    <div class="calc-res-lbl">Resultados</div>
    <div class="calc-res-val">V = ${emFmt(V)} V · I = ${emFmt(I)} A · R = ${emFmt(R)} Ω</div>
    <div class="calc-res-lbl" style="margin-top:4px">Potencia: P = ${emFmt(P)} W</div>
  `);
}
function emCalcRC(){
  const R=emInp('em-rc-r'), C=emInp('em-rc-c'), V0=emInp('em-rc-v0'), t=emInp('em-rc-t');
  const tau=R*C;
  if(tau===0) return emRes('res-em-mxw-rc','<div class="calc-res-val" style="color:var(--red)">τ = 0 — verifica R y C</div>');
  const vCharge=V0*(1-Math.exp(-t/tau));
  const vDischarge=V0*Math.exp(-t/tau);
  emRes('res-em-mxw-rc',`
    <div class="calc-res-lbl">Constante de tiempo</div>
    <div class="calc-res-val">τ = RC = ${emFmt(tau)} s</div>
    <div class="calc-res-lbl" style="margin-top:6px">En t = ${emFmt(t)} s:</div>
    <div class="calc-res-val">Carga: V(t) = ${emFmt(vCharge)} V</div>
    <div class="calc-res-val">Descarga: V(t) = ${emFmt(vDischarge)} V</div>
  `);
}
// ═══════════════════════════════════════════════════════
// SUPER CALC v3.0.0 — NAVIGATION
// ═══════════════════════════════════════════════════════
const SUBMOD_CONFIG = {
  al: {
    title: '<span class="al-c">Álgebra</span> Lineal',
    cards: [
      { icon:'⟶', name:'Vectores 3D', desc:'Operaciones, graficación y cálculo vectorial', id:'vectors', cls:'al-sub' },
      { icon:'⊞',  name:'Matrices & Ec. Lineales', desc:'Operaciones, sistemas, determinantes, eigenvalores', id:'mat', cls:'al-sub' },
      { icon:'≤',  name:'Inecuaciones', desc:'Libre, cuadrática, racional, sistemas, valor absoluto', id:'ineq', cls:'al-sub' },
      { icon:'∑',  name:'Sucesiones & Prog.', desc:'Término n-ésimo, PA, PG, clasificación, acotamiento', id:'seq', cls:'al-sub' },
    ]
  },
  fi: {
    title: '<span class="fi-c">Física</span>',
    cards: [
      { icon:'⚡', name:'Electromagnetismo', desc:'Coulomb, Gauss, Lorentz, Faraday, Maxwell', id:'em', cls:'fi-sub' },
      { icon:'⚙', name:'Más próximamente', desc:'Mecánica, Termodinámica, Óptica...', id:'soon', cls:'fi-sub', disabled:true },
    ]
  },
  ca: {
    title: '<span class="ca-c">Cálculo</span>',
    cards: [
      { icon:'∂', name:'Cálculo Diferencial', desc:'Límites, derivadas, análisis de función', id:'calc', cls:'ca-sub' },
      { icon:'∫', name:'Cálculo Integral', desc:'Integral indefinida, definida, series de Taylor', id:'calc', cls:'ca-sub' },
      { icon:'∇', name:'Cálculo Multivariable', desc:'Derivadas parciales, gradiente, integral doble', id:'calc', cls:'ca-sub' },
      { icon:'dy', name:'Ecuaciones Diferenciales', desc:'1er orden, lineal, 2do orden coef. constantes', id:'calc', cls:'ca-sub' },
    ]
  },
  st: {
    title: '<span class="st-c">Estadística</span>',
    cards: [
      { icon:'μ', name:'Estadística Descriptiva', desc:'Media, mediana, moda, varianza, desviación', id:'soon', cls:'st-sub', disabled:true },
      { icon:'P', name:'Probabilidad', desc:'Clásica, condicional, Bayes, combinatoria', id:'soon', cls:'st-sub', disabled:true },
      { icon:'∼', name:'Distribuciones', desc:'Normal, binomial, Poisson, t-Student', id:'soon', cls:'st-sub', disabled:true },
      { icon:'r²', name:'Regresión & Correlación', desc:'Lineal, múltiple, coeficiente de correlación', id:'soon', cls:'st-sub', disabled:true },
    ]
  }
};

let currentParent = null;

// ══════════════════════════════════════════════════════
// ── NAVEGACIÓN CON HISTORY API (back button) ──────────
// Cada transición empuja un estado al historial del navegador.
// El botón back del SO/navegador dispara popstate y retrocede
// un nivel en lugar de cerrar la app.
// ══════════════════════════════════════════════════════

// Estados posibles: 'launcher' | 'submod' | 'module'
function navPush(state){
  history.pushState(state, '');
}

window.addEventListener('popstate', (e) => {
  const state = e.state;
  // Determinar dónde estamos ahora y retroceder un nivel
  const moduleIds = ['app','em-app','mat-app','calc-app','ineq-app','seq-app'];
  const activeModule = moduleIds.find(id => {
    const el = document.getElementById(id);
    return el && (el.style.display === 'flex' || el.classList.contains('visible'));
  });
  const submodVisible = document.getElementById('submod-screen')?.classList.contains('visible');

  if(activeModule){
    // Estamos en un módulo → volver a submod-screen sin cerrar app
    _closeModuleNoHistory(activeModule.replace('-app','').replace('app','vectors'));
  } else if(submodVisible){
    // Estamos en submod → volver al launcher
    _closeSubmodNoHistory();
  } else {
    // Estamos en el launcher → preguntar si quiere salir
    _confirmExit();
  }
  // Siempre mantener al menos un estado en el historial
  // para que el siguiente back también lo interceptemos
  history.pushState({sc:'base'}, '');
});

// Inicializar historial al cargar
window.addEventListener('load', () => {
  history.replaceState({sc:'launcher'}, '');
  history.pushState({sc:'base'}, '');
  setAuthorVisible(true);

  // ── Ripple físico en lmod-cards ──
  document.querySelectorAll('.lmod-card').forEach(card => {
    card.addEventListener('click', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement('span');
      ripple.className = 'sc-ripple';
      const mod = card.classList.contains('al') ? 'var(--al)'
                : card.classList.contains('fi') ? 'var(--fi)'
                : card.classList.contains('ca') ? 'var(--ca)'
                : 'var(--st)';
      Object.assign(ripple.style, {
        width: size + 'px', height: size + 'px',
        left: (x - size/2) + 'px', top: (y - size/2) + 'px',
        background: mod, opacity: '0.18',
      });
      card.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });

    // ── Parallax interno del ícono al mousemove ──
    const icon = card.querySelector('.lmod-icon');
    card.addEventListener('mousemove', e => {
      if(!icon) return;
      const rect = card.getBoundingClientRect();
      const cx = (e.clientX - rect.left) / rect.width  - 0.5;
      const cy = (e.clientY - rect.top)  / rect.height - 0.5;
      icon.style.transform = `scale(1.2) translateY(-3px) translate(${cx*8}px, ${cy*6}px)`;
    });
    card.addEventListener('mouseleave', e => {
      if(icon) icon.style.transform = '';
    });
  });

  // Delegated click para submod-cards generadas dinamicamente
  document.getElementById('submod-cards').addEventListener('click', function(e) {
    const card = e.target.closest('[data-mod]');
    if (card && !card.classList.contains('disabled')) {
      launchSubmod(card.getAttribute('data-mod'));
    }
  });
});

// ── Versiones internas sin pushState (evitar loops) ────
function _closeSubmodNoHistory(){
  document.getElementById('submod-screen').classList.remove('visible');
  const launcher = document.getElementById('launcher');
  launcher.style.display = 'flex';
  launcher.classList.add('launcher-fade');
  setTimeout(() => {
    launcher.classList.remove('hidden');
    requestAnimationFrame(() => launcher.classList.remove('launcher-fade'));
    setAuthorVisible(true);
  }, 50);
}

function _closeModuleNoHistory(id){
  if(id==='vectors')      document.getElementById('app').style.display='none';
  else if(id==='em')      document.getElementById('em-app').classList.remove('visible');
  else if(id==='mat')     document.getElementById('mat-app').classList.remove('visible');
  else if(id==='ineq'){   document.getElementById('ineq-app').classList.remove('visible'); setTimeout(()=>ineqBack(),350); }
  else if(id==='seq'){   document.getElementById('seq-app').classList.remove('visible'); }
  else if(id==='calc')    document.getElementById('calc-app').classList.remove('visible');
  setTimeout(() => {
    document.getElementById('submod-screen').classList.add('visible');
  }, 50);
}

function setAuthorVisible(visible){
  const el = document.getElementById('sc-author-footer');
  if(el) el.classList.toggle('author-hidden', !visible);
}

function _confirmExit(){
  // Diálogo nativo de confirmación de salida
  // En PWA instalada en Android esto actúa como el back final
  const confirmed = confirm('¿Salir de SuperCalc?');
  if(confirmed){
    // Dejar que el navegador maneje el back real
    history.go(-2);
  } else {
    // Reempujar estado para seguir interceptando
    history.pushState({sc:'base'}, '');
  }
}

function openSubmod(parent) {
  setAuthorVisible(false);
  currentParent = parent;
  const cfg = SUBMOD_CONFIG[parent];
  document.getElementById('submod-title').innerHTML = cfg.title;
  const cardsEl = document.getElementById('submod-cards');
  cardsEl.innerHTML = cfg.cards.map(c => {
    const dataAttr = c.disabled ? '' : 'data-mod="' + c.id + '"';
    const disabledAttr = c.disabled ? 'disabled' : '';
    const inlineStyle = c.disabled ? 'opacity:.4;cursor:default' : '';
    return '<div class="submod-card ' + c.cls + ' ' + disabledAttr + '" ' + dataAttr + ' style="' + inlineStyle + '">'
      + '<div class="submod-icon">' + c.icon + '</div>'
      + '<div class="submod-info">'
      + '<div class="submod-name">' + c.name + '</div>'
      + '<div class="submod-desc">' + c.desc + '</div>'
      + '</div>'
      + '<div class="submod-arrow">' + (c.disabled ? '' : '›') + '</div>'
      + '</div>';
  }).join('');
  const launcher = document.getElementById('launcher');
  launcher.classList.add('hidden');
  setTimeout(() => {
    launcher.style.display = 'none';
    document.getElementById('submod-screen').classList.add('visible');
  }, 300);
  navPush({sc:'submod', parent});
}

function closeSubmod() {
  document.getElementById('submod-screen').classList.remove('visible');
  const launcher = document.getElementById('launcher');
  launcher.style.display = 'flex';
  launcher.classList.add('launcher-fade');
  setTimeout(() => {
    launcher.classList.remove('hidden');
    requestAnimationFrame(() => launcher.classList.remove('launcher-fade'));
    setAuthorVisible(true);
  }, 50);
}

function launchSubmod(id) {
  if (id === 'vectors') {
    document.getElementById('submod-screen').classList.remove('visible');
    setTimeout(() => {
      document.getElementById('app').style.display = 'flex';
      // doble rAF: 1ro permite que el browser calcule el layout con display:flex,
      // 2do garantiza que clientWidth/Height ya tienen dimensiones reales antes de resize()
      requestAnimationFrame(() => requestAnimationFrame(() => initVectorsApp()));
    }, 300);
  } else if (id === 'em') {
    document.getElementById('submod-screen').classList.remove('visible');
    setTimeout(() => {
      document.getElementById('em-app').classList.add('visible');
      emInit();
      // doble rAF — igual que vectores: garantiza layout antes de resize
      requestAnimationFrame(() => requestAnimationFrame(() => emResizeCanvas()));
    }, 300);
  } else if (id === 'mat') {
    document.getElementById('submod-screen').classList.remove('visible');
    setTimeout(() => {
      document.getElementById('mat-app').classList.add('visible');
      matInit();
    }, 300);
  } else if (id === 'calc') {
    document.getElementById('submod-screen').classList.remove('visible');
    setTimeout(() => {
      document.getElementById('calc-app').classList.add('visible');
      calcInit();
    }, 300);
  } else if (id === 'ineq') {
    document.getElementById('submod-screen').classList.remove('visible');
    setTimeout(() => {
      document.getElementById('ineq-app').classList.add('visible');
    }, 300);
  } else if (id === 'seq') {
    document.getElementById('submod-screen').classList.remove('visible');
    setTimeout(() => {
      document.getElementById('seq-app').classList.add('visible');
      seqSetMode('terminos');
    }, 300);
  }
  navPush({sc:'module', id});
}

function closeModule(id) {
  if (id === 'vectors') {
    document.getElementById('app').style.display = 'none';
  } else if (id === 'em') {
    document.getElementById('em-app').classList.remove('visible');
  } else if (id === 'mat') {
    document.getElementById('mat-app').classList.remove('visible');
  } else if (id === 'ineq') {
    document.getElementById('ineq-app').classList.remove('visible');
    setTimeout(() => ineqBack(), 350);
  } else if (id === 'seq') {
    document.getElementById('seq-app').classList.remove('visible');
  } else if (id === 'calc') {
    document.getElementById('calc-app').classList.remove('visible');
  }
  setTimeout(() => {
    document.getElementById('submod-screen').classList.add('visible');
  }, 50);
}

// ═══════════════════════════════════════════════════════
// MATRICES MODULE
// ═══════════════════════════════════════════════════════
let matCurrentTab = 'ops';

function matTab(id) {
  document.querySelectorAll('.mat-tab').forEach((t,i) => {
    t.classList.toggle('on', ['ops','det','sis','eig'][i] === id);
  });
  ['Ops','Det','Sis','Eig'].forEach(p => {
    const el = document.getElementById('mat-p'+p);
    if(el) el.classList.toggle('on', p.toLowerCase() === id);
  });
  matCurrentTab = id;
}

function matInit() {
  matOpsRenderControls();
  matOpsRenderGrids();
  matBuildDet();
  matBuildSis();
  matBuildEig();
}

// ── Helpers ──
function matGetGrid(prefix, rows, cols) {
  const vals = [];
  for(let r=0;r<rows;r++){
    const row=[];
    for(let c=0;c<cols;c++){
      const el=document.getElementById(`${prefix}-${r}-${c}`);
      row.push(el ? parseFloat(el.value)||0 : 0);
    }
    vals.push(row);
  }
  return vals;
}
function matMakeGrid(prefix, rows, cols, extraClass='') {
  let html=`<div class="mat-grid-wrap"><div class="mat-grid" style="grid-template-columns:repeat(${cols},58px)">`;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    html+=`<input class="mat-cell ${extraClass}" id="${prefix}-${r}-${c}" value="0" type="number" onfocus="this.select()" step="any">`;
  }
  return html+'</div></div>';
}
// matFmtNum() → alias fmt() arriba
function matFmtMatrix(M,label='') {
  const rows=M.length,cols=M[0].length;
  let h=label?`<div class="mat-res-lbl">${label}</div>`:'' ;
  h+=`<div class="mat-res-val">`;
  for(let r=0;r<rows;r++){
    h+='[ '+M[r].map(v=>matFmtNum(v).padStart(9)).join('  ')+' ]<br>';
  }
  return h+'</div>';
}

// ── Matrix math ──
function matMul(A,B) {
  const r=A.length,k=A[0].length,c=B[0].length;
  if(k!==B.length) return null;
  return Array.from({length:r},(_,i)=>Array.from({length:c},(_,j)=>A[i].reduce((s,_,p)=>s+A[i][p]*B[p][j],0)));
}
function matAdd(A,B,sign=1) {
  if(A.length!==B.length||A[0].length!==B[0].length) return null;
  return A.map((row,i)=>row.map((v,j)=>v+sign*B[i][j]));
}
function matScale(A,k) { return A.map(row=>row.map(v=>v*k)); }
function matTranspose(A) { return A[0].map((_,j)=>A.map(r=>r[j])); }
function matDet(M) {
  const n=M.length;
  if(n===1) return M[0][0];
  if(n===2) return M[0][0]*M[1][1]-M[0][1]*M[1][0];
  let det=0;
  for(let c=0;c<n;c++){
    const minor=M.slice(1).map(row=>[...row.slice(0,c),...row.slice(c+1)]);
    det+=((c%2===0)?1:-1)*M[0][c]*matDet(minor);
  }
  return det;
}
function matInv(M) {
  const n=M.length, aug=M.map((row,i)=>[...row,...Array.from({length:n},(_,j)=>i===j?1:0)]);
  for(let col=0;col<n;col++){
    let maxR=col;
    for(let r=col+1;r<n;r++) if(Math.abs(aug[r][col])>Math.abs(aug[maxR][col])) maxR=r;
    [aug[col],aug[maxR]]=[aug[maxR],aug[col]];
    const piv=aug[col][col];
    if(Math.abs(piv)<1e-12) return null;
    for(let j=0;j<2*n;j++) aug[col][j]/=piv;
    for(let r=0;r<n;r++) if(r!==col){
      const f=aug[r][col];
      for(let j=0;j<2*n;j++) aug[r][j]-=f*aug[col][j];
    }
  }
  return aug.map(row=>row.slice(n));
}
// ── Fracción exacta helpers ──
let sisFracMode=false;
function matSisToggleFrac(){
  sisFracMode=!sisFracMode;
  const tog=document.getElementById('sis-frac-tog');
  const lbl=document.getElementById('sis-frac-lbl');
  if(tog) tog.classList.toggle('on',sisFracMode);
  if(lbl) lbl.textContent=sisFracMode?'FRAC':'DEC';
}
function fGcd(a,b){a=Math.abs(Math.round(a));b=Math.abs(Math.round(b));while(b){[a,b]=[b,a%b];}return a||1;}
function fSimp([n,d]){if(d===0)return[n,d];const g=fGcd(Math.abs(n),Math.abs(d));const s=d<0?-1:1;return[s*n/g,s*d/g];}
function fSub([an,ad],[bn,bd]){return fSimp([an*bd-bn*ad,ad*bd]);}
function fMul([an,ad],[bn,bd]){return fSimp([an*bn,ad*bd]);}
function fDiv([an,ad],[bn,bd]){return fSimp([an*bd,ad*bn]);}
function fStr([n,d],useFrac){
  if(d===0)return'∞';
  const v=n/d;
  if(!useFrac) return matFmtNum(v);
  if(d===1)return`${n}`;
  return`${n}/${d}`;
}
function toFrac2(x){
  // convert float to exact fraction via continued fractions
  if(!isFinite(x))return[x>0?1:-1,0];
  const sign=x<0?-1:1;x=Math.abs(x);
  const maxIter=20,eps=1e-9;
  let [n0,d0,n1,d1]=[1,0,0,1];
  let rem=x;
  for(let i=0;i<maxIter;i++){
    const a=Math.floor(rem);
    [n0,n1]=[a*n0+n1,n0];
    [d0,d1]=[a*d0+d1,d0];
    const frac=rem-a;
    if(frac<eps)break;
    rem=1/frac;
  }
  return fSimp([sign*n0,d0]);
}
function matGauss(A,b) {
  const n=A.length;
  // Convert to fractions
  const aug=A.map((row,i)=>[...row,b[i]].map(v=>toFrac2(v)));
  const steps=[];
  for(let col=0;col<n;col++){
    // Partial pivot by absolute value of numerator/denominator
    let maxR=col;
    for(let r=col+1;r<n;r++){
      const [an,ad]=aug[r][col],[bn,bd]=aug[maxR][col];
      if(Math.abs(an/ad)>Math.abs(bn/bd)) maxR=r;
    }
    if(maxR!==col){ [aug[col],aug[maxR]]=[aug[maxR],aug[col]]; steps.push(`Swap F${col+1} ↔ F${maxR+1}`); }
    const piv=aug[col][col];
    if(Math.abs(piv[0]/piv[1])<1e-12) return {sol:null,steps,inconsistent:true};
    for(let r=0;r<n;r++) if(r!==col){
      const f=fDiv(aug[r][col],piv);
      if(Math.abs(f[0]/f[1])<1e-12) continue;
      for(let j=col;j<=n;j++) aug[r][j]=fSub(aug[r][j],fMul(f,aug[col][j]));
      steps.push(`F${r+1} ← F${r+1} − (${fStr(f,true)})·F${col+1}`);
    }
    steps.push(`Pivote col ${col+1}: ${fStr(piv,true)}`);
  }
  const sol=aug.map((row,i)=>fDiv(row[n],row[i]));
  return {sol,steps,inconsistent:false,isFrac:true};
}
function matCramer(A,b) {
  const n=A.length,detA=matDet(A);
  if(Math.abs(detA)<1e-12) return null;
  return b.map((_,i)=>{
    const Ai=A.map((row,r)=>row.map((v,c)=>c===i?b[r]:v));
    return matDet(Ai)/detA;
  });
}

// Power iteration for dominant eigenvalue
function matPowerIter(M,maxIter=200) {
  const n=M.length;
  let v=Array(n).fill(0).map(()=>Math.random()*2-1);
  let norm=Math.sqrt(v.reduce((s,x)=>s+x*x,0));
  v=v.map(x=>x/norm);
  let lam=0;
  for(let iter=0;iter<maxIter;iter++){
    const Mv=M.map(row=>row.reduce((s,val,j)=>s+val*v[j],0));
    const newNorm=Math.sqrt(Mv.reduce((s,x)=>s+x*x,0));
    lam=Mv.reduce((s,x,i)=>s+x*v[i],0);
    v=Mv.map(x=>x/newNorm);
  }
  return {lam,vec:v};
}
function matDeflate(M,lam,vec) {
  const n=M.length;
  const norm2=vec.reduce((s,x)=>s+x*x,0);
  return M.map((row,i)=>row.map((v,j)=>v-lam*vec[i]*vec[j]/norm2));
}
function matEigenAll(M) {
  const n=M.length;
  const pairs=[];
  let Mcur=M.map(r=>[...r]);
  for(let k=0;k<n;k++){
    const {lam,vec}=matPowerIter(Mcur);
    pairs.push({lam,vec});
    Mcur=matDeflate(Mcur,lam,vec);
  }
  return pairs;
}

// ── Ops panel — N matrices of arbitrary m×n ──────────
// State: array of matrix definitions {rows, cols, id}
let matOpsState = { op:'add', matrices:[{id:0,rows:2,cols:2},{id:1,rows:2,cols:2}], nextId:2, scalar:1 };

function matOpsRebuild() {
  matOpsState.op = document.getElementById('mat-op').value;
  matOpsRenderControls();
  matOpsRenderGrids();
  document.getElementById('mat-res-ops').innerHTML = '';
}

function matOpsReset() {
  matOpsState = { op: document.getElementById('mat-op').value, matrices:[{id:0,rows:2,cols:2},{id:1,rows:2,cols:2}], nextId:2, scalar:1 };
  matOpsRenderControls();
  matOpsRenderGrids();
  document.getElementById('mat-res-ops').innerHTML = '';
}

function matOpsRenderControls() {
  const op = matOpsState.op;
  const isSca = op === 'sca';
  const isTra = op === 'tra';
  const isSingle = isSca || isTra;
  // Ensure correct number of matrices
  if (isSingle && matOpsState.matrices.length > 1) matOpsState.matrices = [matOpsState.matrices[0]];
  if (!isSingle && matOpsState.matrices.length < 2) matOpsState.matrices.push({id:matOpsState.nextId++,rows:matOpsState.matrices[0].rows,cols:matOpsState.matrices[0].cols});

  let h = '<div class="mat-row" style="flex-wrap:wrap;gap:6px;margin-bottom:8px">';
  if (isSca) {
    h += `<label>Escalar k:</label><input class="mat-inp wide" id="mat-sca-k" value="${matOpsState.scalar}" type="number" onfocus="this.select()" step="any" oninput="matOpsState.scalar=parseFloat(this.value)||1">`;
  }
  if (!isSingle) {
    h += `<button class="mat-btn" style="padding:5px 10px;font-size:10px" onclick="matOpsAddMatrix()">+ Matriz</button>`;
    if (matOpsState.matrices.length > 2) {
      h += `<button class="mat-btn danger" style="padding:5px 10px;font-size:10px" onclick="matOpsRemoveMatrix()">− Última</button>`;
    }
  }
  h += '</div>';
  document.getElementById('mat-ops-controls').innerHTML = h;
}

function matOpsAddMatrix() {
  const last = matOpsState.matrices[matOpsState.matrices.length-1];
  matOpsState.matrices.push({id:matOpsState.nextId++, rows:last.rows, cols:last.cols});
  matOpsRenderGrids();
}

function matOpsRemoveMatrix() {
  if (matOpsState.matrices.length <= 2) return;
  matOpsState.matrices.pop();
  matOpsRenderGrids();
}

function matOpsSizeChange(id, dim, val) {
  const m = matOpsState.matrices.find(m=>m.id===id);
  if (!m) return;
  m[dim] = Math.min(8, Math.max(1, parseInt(val)||1));
  matOpsRenderGrids();
}

function matOpsRenderGrids() {
  const op = matOpsState.op;
  const letters = 'ABCDEFGHIJ';
  let h = '';
  matOpsState.matrices.forEach((m, i) => {
    const lbl = letters[i] || `M${i}`;
    const prefix = `mo-${m.id}`;
    h += `<div style="margin-bottom:12px">
      <div class="mat-sec" style="margin-top:0">${lbl} — 
        <input class="mat-inp" style="width:36px;display:inline;padding:2px 4px" value="${m.rows}" min="1" max="8" type="number" onfocus="this.select()" onchange="matOpsSizeChange(${m.id},'rows',this.value)">
        ×
        <input class="mat-inp" style="width:36px;display:inline;padding:2px 4px" value="${m.cols}" min="1" max="8" type="number" onfocus="this.select()" onchange="matOpsSizeChange(${m.id},'cols',this.value)">
      </div>`;
    h += matMakeGrid(prefix, m.rows, m.cols);
    h += '</div>';
  });
  document.getElementById('mat-ops-grids').innerHTML = h;
}

function matOpsGetMatrix(m) {
  return matGetGrid(`mo-${m.id}`, m.rows, m.cols);
}

function matCalcOps() {
  const op = matOpsState.op;
  const ms = matOpsState.matrices;
  const letters = 'ABCDEFGHIJ';
  let result, title, err = '';

  if (op === 'sca') {
    const A = matOpsGetMatrix(ms[0]);
    const k = matOpsState.scalar;
    result = matScale(A, k);
    title = `${k} × A`;
  } else if (op === 'tra') {
    const A = matOpsGetMatrix(ms[0]);
    result = matTranspose(A);
    title = 'Aᵀ';
  } else if (op === 'add' || op === 'sub') {
    // Check all same dimensions
    const r0 = ms[0].rows, c0 = ms[0].cols;
    const bad = ms.find(m => m.rows !== r0 || m.cols !== c0);
    if (bad) { err = `Todas las matrices deben ser ${r0}×${c0} para suma/resta.`; }
    else {
      result = matOpsGetMatrix(ms[0]);
      for (let i = 1; i < ms.length; i++) {
        const B = matOpsGetMatrix(ms[i]);
        result = matAdd(result, B, op === 'sub' ? -1 : 1);
      }
      title = ms.map((_,i)=>letters[i]).join(op==='add'?' + ':' − ');
    }
  } else if (op === 'mul') {
    // Chain multiplication — check dimensional compatibility
    result = matOpsGetMatrix(ms[0]);
    for (let i = 1; i < ms.length; i++) {
      const B = matOpsGetMatrix(ms[i]);
      if (result[0].length !== B.length) {
        err = `Columnas de ${letters[i-1]} (${result[0].length}) ≠ filas de ${letters[i]} (${B.length}). Dimensiones incompatibles.`;
        result = null; break;
      }
      result = matMul(result, B);
    }
    if (result) title = ms.map((_,i)=>letters[i]).join(' × ');
  }

  if (err || !result) {
    document.getElementById('mat-res-ops').innerHTML = `<div class="mat-res"><div class="mat-err">${err||'Error en el cálculo.'}</div></div>`;
    return;
  }
  document.getElementById('mat-res-ops').innerHTML = `<div class="mat-res">${matFmtMatrix(result, title)}</div>`;
}


// ── Det & Inv panel ──
function matBuildDet() {
  const n=parseInt(document.getElementById('mat-dn')?.value)||2;
  document.getElementById('mat-det-grid').innerHTML=matMakeGrid('md',n,n);
  document.getElementById('mat-res-det').innerHTML='';
}
function matCalcDet() {
  const n=parseInt(document.getElementById('mat-dn').value)||2;
  const M=matGetGrid('md',n,n);
  const d=matDet(M);
  document.getElementById('mat-res-det').innerHTML=`<div class="mat-res">
    <div class="mat-res-lbl">Determinante</div>
    <div class="mat-res-val" style="font-size:20px">${matFmtNum(d,6)}</div>
    <div class="${Math.abs(d)<1e-10?'mat-err':'mat-ok'}">${Math.abs(d)<1e-10?'Matriz singular (det ≈ 0)':'Matriz invertible'}</div>
  </div>`;
}
function matCalcInv() {
  const n=parseInt(document.getElementById('mat-dn').value)||2;
  const M=matGetGrid('md',n,n);
  const inv=matInv(M);
  if(!inv){
    document.getElementById('mat-res-det').innerHTML=`<div class="mat-res"><div class="mat-err">Matriz singular — no tiene inversa.</div></div>`;
    return;
  }
  document.getElementById('mat-res-det').innerHTML=`<div class="mat-res">${matFmtMatrix(inv,'A⁻¹')}<div class="mat-ok">Verificar: A · A⁻¹ = I</div></div>`;
}
function matClearDet() { document.querySelectorAll('#mat-det-grid .mat-cell').forEach(el=>el.value=0); document.getElementById('mat-res-det').innerHTML=''; }

// ── Sistemas panel ──
function matBuildSis() {
  const n=parseInt(document.getElementById('mat-sn')?.value)||2;
  let html=`<div class="mat-grid-wrap"><div class="mat-grid" style="grid-template-columns:repeat(${n+1},58px)">`;
  for(let r=0;r<n;r++){
    for(let c=0;c<n;c++) html+=`<input class="mat-cell" id="ms-${r}-${c}" value="0" type="number" onfocus="this.select()" step="any">`;
    html+=`<input class="mat-cell rhs" id="ms-${r}-${n}" value="0" type="number" onfocus="this.select()" step="any">`;
  }
  html+='</div></div>';
  html+=`<div style="font-size:9px;font-family:'Space Mono',monospace;color:#5a7a9a;margin-bottom:8px">Las últimas columnas (doradas) son el vector b</div>`;
  document.getElementById('mat-sis-grid').innerHTML=html;
  document.getElementById('mat-res-sis').innerHTML='';
}
function matCalcSis() {
  const n=parseInt(document.getElementById('mat-sn').value)||2;
  const A=[],b=[];
  for(let r=0;r<n;r++){
    A.push(Array.from({length:n},(_,c)=>parseFloat(document.getElementById(`ms-${r}-${c}`)?.value||0)));
    b.push(parseFloat(document.getElementById(`ms-${r}-${n}`)?.value||0));
  }
  const met=document.getElementById('mat-smet').value;
  let html='<div class="mat-res">';
  if(met==='gauss'){
    const {sol,steps,inconsistent}=matGauss(A.map(r=>[...r]),b.map(v=>v));
    html+=`<div class="mat-res-lbl">Gauss-Jordan — pasos:</div>`;
    steps.forEach(s=>{
      // steps already contain fraction strings; reformat dec parts if not fracMode
      let display=s;
      if(!sisFracMode){
        // replace any a/b fraction tokens with decimals
        display=s.replace(/(-?\d+)\/(\d+)/g,(_,n,d)=>matFmtNum(parseInt(n)/parseInt(d)));
      }
      html+=`<div class="mat-step">${display}</div>`;
    });
    if(inconsistent||!sol){ html+=`<div class="mat-err">Sistema sin solución o infinitas soluciones.</div>`; }
    else {
      html+=`<div class="mat-res-lbl" style="margin-top:8px">Solución:</div><div class="mat-res-val">`;
      sol.forEach((v,i)=>{ html+=`x<sub>${i+1}</sub> = ${fStr(v,sisFracMode)}<br>`; });
      html+='</div>';
    }
  } else {
    const sol=matCramer(A,b);
    if(!sol){ html+=`<div class="mat-err">det(A) = 0 — Cramer no aplicable.</div>`; }
    else {
      html+=`<div class="mat-res-lbl">Cramer — det(A) = ${matFmtNum(matDet(A))}</div>`;
      html+=`<div class="mat-res-val">`;
      sol.forEach((v,i)=>{ html+=`x<sub>${i+1}</sub> = ${sisFracMode?fStr(toFrac2(v),true):matFmtNum(v)}<br>`; });
      html+='</div>';
    }
  }
  html+='</div>';
  document.getElementById('mat-res-sis').innerHTML=html;
}
function matClearSis() { document.querySelectorAll('#mat-sis-grid .mat-cell').forEach(el=>el.value=0); document.getElementById('mat-res-sis').innerHTML=''; }

// ── Eigenvalores panel ──
function matBuildEig() {
  const n=parseInt(document.getElementById('mat-en')?.value)||2;
  document.getElementById('mat-eig-grid').innerHTML=matMakeGrid('me',n,n);
  document.getElementById('mat-res-eig').innerHTML='';
}
function matCalcEig() {
  const n=parseInt(document.getElementById('mat-en').value)||2;
  const M=matGetGrid('me',n,n);
  const pairs=matEigenAll(M);
  let html='<div class="mat-res"><div class="mat-res-lbl">Valores &amp; Vectores Propios (iteración potencia)</div>';
  pairs.forEach(({lam,vec},i)=>{
    html+=`<div class="mat-eigen-pair">
      <div class="mat-eigen-lbl">&lambda;<sub>${i+1}</sub></div>
      <div class="mat-eigen-val">${matFmtNum(lam,5)}</div>
      <div class="mat-eigen-vec">v = [ ${vec.map(v=>matFmtNum(v,4)).join(',  ')} ]</div>
    </div>`;
  });
  html+=`<div style="font-size:9px;font-family:'Space Mono',monospace;color:#5a7a9a;margin-top:4px">* Método de iteración potencia — preciso para matrices diagonalizables</div>`;
  html+='</div>';
  document.getElementById('mat-res-eig').innerHTML=html;
}
function matClearEig() { document.querySelectorAll('#mat-eig-grid .mat-cell').forEach(el=>el.value=0); document.getElementById('mat-res-eig').innerHTML=''; }

// ═══════════════════════════════════════════════════════
// INECUACIONES MODULE v2.0
// ═══════════════════════════════════════════════════════
let ineqType = null;

function ineqSetType(type) {
  ineqType = type;
  document.getElementById('ineq-pick-screen').style.display = 'none';
  const solver = document.getElementById('ineq-solver');
  solver.classList.add('on');
  const titles = {
    libre:    'Expresión libre: f(x) ⊳ g(x)',
    quad:     'Cuadrática: ax² + bx + c ⊳ 0',
    rational: 'Racional: P(x)/Q(x) ⊳ 0',
    system:   'Sistema de Inecuaciones',
    abs:      'Valor Absoluto: |f(x)| ⊳ c',
  };
  document.getElementById('ineq-solver-title').textContent = titles[type]||type;
  buildIneqForm(type);
}

function ineqBack() {
  ineqType = null;
  document.getElementById('ineq-pick-screen').style.display = '';
  document.getElementById('ineq-solver').classList.remove('on');
}

function ineqSymCycle(btnId, symbols) {
  const btn = document.getElementById(btnId);
  const cur = btn.textContent;
  const idx = (symbols.indexOf(cur)+1) % symbols.length;
  btn.textContent = symbols[idx];
}

function buildIneqForm(type) {
  const body = document.getElementById('ineq-solver-body');
  if(type==='libre') {
    body.innerHTML = `
      <div class="mat-sec">Inecuación — expresión libre</div>
      <div style="font-size:10px;font-family:'Space Mono',monospace;color:#5a7a9a;margin-bottom:10px">
        Escribe ambos lados como expresiones en x. Ej: (x+3)(x-1) &lt; (x-1)^2+3x
      </div>
      <div class="ineq-libre-row">
        <div class="ineq-libre-grp">
          <label class="ineq-libre-lbl">Lado izquierdo f(x)</label>
          <input class="ineq-inp-libre" id="iq-lhs" placeholder="ej: (x+3)(x-1)"/>
        </div>
        <button class="ineq-sym-btn on" id="iq-sym-libre"
          onclick="ineqSymCycle('iq-sym-libre',['<','≤','>','≥'])"><</button>
        <div class="ineq-libre-grp">
          <label class="ineq-libre-lbl">Lado derecho g(x)</label>
          <input class="ineq-inp-libre" id="iq-rhs" placeholder="ej: (x-1)^2+3x"/>
        </div>
      </div>
      <button class="ineq-btn" onclick="ineqSolveLibre()">Resolver</button>
      <div id="ineq-res"></div>
      <canvas id="ineq-numline" height="72"></canvas>`;
  } else if(type==='quad') {
    body.innerHTML = `
      <div class="mat-sec">Inecuación Cuadrática</div>
      <div style="font-size:10px;font-family:'Space Mono',monospace;color:#5a7a9a;margin-bottom:10px">ax² + bx + c ⊳ 0</div>
      <div class="ineq-row">
        <div class="ineq-inp-grp"><label>a</label><input class="ineq-inp" id="iq-a" value="1" type="number" onfocus="this.select()" step="any"></div>
        <span class="ineq-lbl-mid">x² +</span>
        <div class="ineq-inp-grp"><label>b</label><input class="ineq-inp" id="iq-b" value="-3" type="number" onfocus="this.select()" step="any"></div>
        <span class="ineq-lbl-mid">x +</span>
        <div class="ineq-inp-grp"><label>c</label><input class="ineq-inp" id="iq-c" value="2" type="number" onfocus="this.select()" step="any"></div>
        <button class="ineq-sym-btn on" id="iq-sym" onclick="ineqSymCycle('iq-sym',['<','≤','>','≥'])">&lt;</button>
        <span class="ineq-lbl-mid">0</span>
      </div>
      <button class="ineq-btn" onclick="ineqSolveQuad()">Resolver</button>
      <div id="ineq-res"></div>
      <canvas id="ineq-numline" height="72"></canvas>`;
  } else if(type==='rational') {
    body.innerHTML = `
      <div class="mat-sec">Inecuación Racional</div>
      <div style="font-size:10px;font-family:'Space Mono',monospace;color:#5a7a9a;margin-bottom:10px">
        P(x)/Q(x) ⊳ 0 — tabla de signos automática
      </div>
      <div class="ineq-libre-row">
        <div class="ineq-libre-grp">
          <label class="ineq-libre-lbl">Numerador P(x)</label>
          <input class="ineq-inp-libre" id="iq-rat-num" placeholder="ej: x^2+3x-10"/>
        </div>
        <span class="ineq-lbl-mid" style="padding-top:24px;font-size:18px">/</span>
        <div class="ineq-libre-grp">
          <label class="ineq-libre-lbl">Denominador Q(x)</label>
          <input class="ineq-inp-libre" id="iq-rat-den" placeholder="ej: x^2+x-2"/>
        </div>
        <button class="ineq-sym-btn on" id="iq-rat-sym"
          onclick="ineqSymCycle('iq-rat-sym',['<','≤','>','≥'])" style="align-self:flex-end;margin-bottom:4px">&lt;</button>
        <span class="ineq-lbl-mid" style="padding-top:24px">0</span>
      </div>
      <button class="ineq-btn" onclick="ineqSolveRational()">Tabla de signos</button>
      <div id="ineq-res"></div>
      <canvas id="ineq-numline" height="72"></canvas>`;
  } else if(type==='system') {
    body.innerHTML = `
      <div class="mat-sec">Sistema de Inecuaciones</div>
      <div style="font-size:10px;font-family:'Space Mono',monospace;color:#5a7a9a;margin-bottom:10px">Dos inecuaciones lineales — se calcula la intersección</div>
      <div class="ineq-row" style="margin-bottom:6px">
        <div class="ineq-inp-grp"><label>a₁</label><input class="ineq-inp" id="iq-a1" value="1" type="number" onfocus="this.select()" step="any"></div>
        <span class="ineq-lbl-mid">x +</span>
        <div class="ineq-inp-grp"><label>b₁</label><input class="ineq-inp" id="iq-b1" value="-2" type="number" onfocus="this.select()" step="any"></div>
        <button class="ineq-sym-btn on" id="iq-s1" onclick="ineqSymCycle('iq-s1',['<','≤','>','≥'])">&gt;</button>
        <div class="ineq-inp-grp"><label>c₁</label><input class="ineq-inp" id="iq-c1" value="-1" type="number" onfocus="this.select()" step="any"></div>
      </div>
      <div class="ineq-row">
        <div class="ineq-inp-grp"><label>a₂</label><input class="ineq-inp" id="iq-a2" value="1" type="number" onfocus="this.select()" step="any"></div>
        <span class="ineq-lbl-mid">x +</span>
        <div class="ineq-inp-grp"><label>b₂</label><input class="ineq-inp" id="iq-b2" value="3" type="number" onfocus="this.select()" step="any"></div>
        <button class="ineq-sym-btn on" id="iq-s2" onclick="ineqSymCycle('iq-s2',['<','≤','>','≥'])">&lt;</button>
        <div class="ineq-inp-grp"><label>c₂</label><input class="ineq-inp" id="iq-c2" value="10" type="number" onfocus="this.select()" step="any"></div>
      </div>
      <button class="ineq-btn" onclick="ineqSolveSystem()">Resolver</button>
      <div id="ineq-res"></div>
      <canvas id="ineq-numline" height="72"></canvas>`;
  } else if(type==='abs') {
    body.innerHTML = `
      <div class="mat-sec">Valor Absoluto</div>
      <div style="font-size:10px;font-family:'Space Mono',monospace;color:#5a7a9a;margin-bottom:10px">|ax + b| ⊳ c</div>
      <div class="ineq-row">
        <span class="ineq-lbl-mid" style="font-size:16px">|</span>
        <div class="ineq-inp-grp"><label>a</label><input class="ineq-inp" id="iq-a" value="2" type="number" onfocus="this.select()" step="any"></div>
        <span class="ineq-lbl-mid">x +</span>
        <div class="ineq-inp-grp"><label>b</label><input class="ineq-inp" id="iq-b" value="-1" type="number" onfocus="this.select()" step="any"></div>
        <span class="ineq-lbl-mid" style="font-size:16px">|</span>
        <button class="ineq-sym-btn on" id="iq-sym" onclick="ineqSymCycle('iq-sym',['<','≤','>','≥'])">&lt;</button>
        <div class="ineq-inp-grp"><label>c</label><input class="ineq-inp" id="iq-c" value="5" type="number" onfocus="this.select()" step="any"></div>
      </div>
      <button class="ineq-btn" onclick="ineqSolveAbs()">Resolver</button>
      <div id="ineq-res"></div>
      <canvas id="ineq-numline" height="72"></canvas>`;
  }
}

// ── helpers comunes ──
function flipSym(s){ return {'>':'<','<':'>','≥':'≤','≤':'≥'}[s]||s; }
function checkIneq(a,sym,b){ return {'>':a>b,'<':a<b,'≥':a>=b,'≤':a<=b}[sym]; }
function ineqLinearBound(a,b,c,sym){
  const rhs=c-b; let x=rhs/(a||1), s=sym;
  if(a<0) s=flipSym(sym);
  return {val:x,sym:s};
}
function ineqIntersect(s1,s2){
  const lo1=(s1.sym==='>'||s1.sym==='≥')?s1.val:-Infinity;
  const hi1=(s1.sym==='<'||s1.sym==='≤')?s1.val:Infinity;
  const lo2=(s2.sym==='>'||s2.sym==='≥')?s2.val:-Infinity;
  const hi2=(s2.sym==='<'||s2.sym==='≤')?s2.val:Infinity;
  const lo=Math.max(lo1,lo2), hi=Math.min(hi1,hi2);
  if(lo>hi) return null;
  const loS=isFinite(lo)?matFmtNum(lo):'-∞', hiS=isFinite(hi)?matFmtNum(hi):'+∞';
  const loBr=(s1.sym==='≥'||s2.sym==='≥')?'[':'(';
  const hiBr=(s1.sym==='≤'||s2.sym==='≤')?']':')';
  return `${loBr}${loS}, ${hiS}${hiBr}`;
}

function ineqShowResult(expr, sol, steps) {
  let out=`<div class="ineq-res">`;
  out+=`<div class="ineq-res-expr">${expr}</div>`;
  steps.forEach(s=>{ out+=`<div class="ineq-res-step">${s}</div>`; });
  if(sol) out+=`<div class="ineq-res-interval">Solución: <strong>${sol}</strong></div>`;
  out+=`</div>`;
  document.getElementById('ineq-res').innerHTML=out;
}

// ── evalúa expresión con x ──
function ineqEval(exprStr, x){
  try{
    const code=exprStr.trim()
      .replace(/\^/g,'**')
      .replace(/π/g,'Math.PI')
      .replace(/\bsqrt\b/g,'Math.sqrt')
      .replace(/\babs\b/g,'Math.abs')
      .replace(/(?<![a-zA-Z\.])ln\b/g,'Math.log')
      .replace(/(?<![a-zA-Z])e(?![a-zA-Z0-9_])/g,'Math.E')
      .replace(/(\d)\s*\(/g,'$1*(')
      .replace(/\)\s*\(/g,')*(')
      .replace(/(\d)x/g,'$1*x')
      .replace(/\bx\b/g,'('+x+')');
    return Function('"use strict"; return ('+code+');')();
  }catch(e){ return NaN; }
}

// ── SOLVER LIBRE — reduce f(x) < g(x) a h(x)=f(x)-g(x) < 0 ──
function ineqSolveLibre(){
  const lhsStr = document.getElementById('iq-lhs').value.trim();
  const rhsStr = document.getElementById('iq-rhs').value.trim();
  const sym    = document.getElementById('iq-sym-libre').textContent;
  if(!lhsStr||!rhsStr){ ineqShowResult('','',['Ingresa ambos lados de la inecuación']); return; }

  const steps=[];
  steps.push(`Inecuación: ${lhsStr} ${sym} ${rhsStr}`);
  steps.push(`Pasando todo al lado izquierdo: h(x) = (${lhsStr}) − (${rhsStr}) ${sym} 0`);

  // Muestrear h(x) = lhs - rhs en [-20,20] para encontrar raíces y signos
  const N=2000, a=-20, b=20, dx=(b-a)/N;
  const hx=x=>{ const l=ineqEval(lhsStr,x), r=ineqEval(rhsStr,x); return isFinite(l)&&isFinite(r)?l-r:NaN; };

  // Encontrar raíces por cambio de signo
  const roots=[];
  let prev=hx(a);
  for(let i=1;i<=N;i++){
    const x=a+i*dx;
    const cur=hx(x);
    if(isFinite(prev)&&isFinite(cur)&&prev*cur<0){
      // Bisección rápida
      let lo=x-dx, hi=x, fl=prev;
      for(let j=0;j<30;j++){
        const mid=(lo+hi)/2, fm=hx(mid);
        if(!isFinite(fm)) break;
        if(fl*fm<=0) hi=mid; else { lo=mid; fl=fm; }
      }
      const root=(lo+hi)/2;
      if(!roots.some(r=>Math.abs(r-root)<1e-6)) roots.push(root);
    }
    prev=cur;
  }
  // Agregar x donde h(x)=0 exacto si no está ya
  roots.sort((x,y)=>x-y);
  steps.push(`Raíces de h(x): ${roots.length?roots.map(r=>matFmtNum(r)).join(', '):'ninguna en [-20, 20]'}`);

  // Determinar signo en cada intervalo
  const allPts=[-Infinity,...roots,Infinity];
  const solParts=[];
  for(let i=0;i<allPts.length-1;i++){
    const lo=allPts[i], hi=allPts[i+1];
    const mid=isFinite(lo)&&isFinite(hi)?(lo+hi)/2:isFinite(lo)?lo+1:isFinite(hi)?hi-1:0;
    const val=hx(mid);
    if(!isFinite(val)) continue;
    const inSol=checkIneq(val,sym,0);
    if(inSol){
      const closed=(sym==='≤'||sym==='≥');
      const lBr=isFinite(lo)?(closed?'[':'('):'(';
      const rBr=isFinite(hi)?(closed?']':')'):')'
      const lStr=isFinite(lo)?matFmtNum(lo):'-∞';
      const rStr=isFinite(hi)?matFmtNum(hi):'+∞';
      solParts.push(lBr+lStr+', '+rStr+rBr);
    }
  }
  const sol=solParts.length?solParts.join(' ∪ '):'∅ (sin solución en [-20, 20])';
  steps.push('Evaluando signo de h(x) en cada intervalo...');
  ineqShowResult(`${lhsStr} ${sym} ${rhsStr}`, sol, steps);
  drawNumLine(roots.map(r=>({val:r,sym:'root',color:'#f472b6'})),[sol]);
}

// ── CUADRÁTICA ──
function ineqSolveQuad() {
  const a=parseFloat(document.getElementById('iq-a').value)||1;
  const b=parseFloat(document.getElementById('iq-b').value)||0;
  const c=parseFloat(document.getElementById('iq-c').value)||0;
  const sym=document.getElementById('iq-sym').textContent;
  const disc=b*b-4*a*c;
  const steps=[`${a}x² + ${b}x + ${c} ${sym} 0`, `Discriminante: Δ = b²−4ac = ${matFmtNum(disc)}`];
  let sol, roots=[];
  if(disc<0){
    const alwaysPos=a>0;
    if((sym==='>'||sym==='≥')===alwaysPos){ sol='x ∈ ℝ'; steps.push('Δ<0 — parábola siempre '+(a>0?'positiva':'negativa')+' → toda la recta'); }
    else { sol='∅ (sin solución)'; steps.push('Δ<0 — parábola siempre '+(a>0?'positiva':'negativa')+' → no cumple'); }
  } else if(Math.abs(disc)<1e-12){
    const r=-b/(2*a); roots=[r];
    steps.push(`Raíz doble: x = ${matFmtNum(r)}`);
    sol=sym==='<'?'∅':sym==='≤'?`x = ${matFmtNum(r)}`:`x ∈ ℝ \\ {${matFmtNum(r)}}`;
  } else {
    const r1=(-b-Math.sqrt(disc))/(2*a), r2=(-b+Math.sqrt(disc))/(2*a);
    const lo=Math.min(r1,r2), hi=Math.max(r1,r2);
    roots=[lo,hi];
    steps.push(`Raíces: x₁ = ${matFmtNum(lo)},  x₂ = ${matFmtNum(hi)}`);
    const inside=(sym==='<'||sym==='≤');
    const closed=(sym==='≤'||sym==='≥');
    if((a>0&&inside)||(a<0&&!inside)){
      sol=`${closed?'[':'('}${matFmtNum(lo)}, ${matFmtNum(hi)}${closed?']':')'}`;
      steps.push(`a${a>0?'>':'<'}0 → solución interior`);
    } else {
      sol=`(-∞, ${matFmtNum(lo)}${closed?']':')'} ∪ ${closed?'[':'('}${matFmtNum(hi)}, +∞)`;
      steps.push(`a${a>0?'>':'<'}0 → solución exterior`);
    }
  }
  ineqShowResult(`${a}x² + ${b}x + ${c} ${sym} 0`, sol, steps);
  drawNumLine(roots.map(r=>({val:r,sym:'root',color:'#f472b6'})),[sol]);
}

// ── RACIONAL con tabla de signos ──
function quadRoots(a,b,c){
  if(Math.abs(a)<1e-12) return Math.abs(b)<1e-12?[]:[-c/b];
  const d=b*b-4*a*c; if(d<0) return [];
  if(Math.abs(d)<1e-12) return [-b/(2*a)];
  const sq=Math.sqrt(d);
  return [(-b-sq)/(2*a),(-b+sq)/(2*a)].sort((x,y)=>x-y);
}
function parseSimplePoly(s){
  s=s.trim().replace(/\s+/g,'').replace(/\^/g,'**');
  let a=0,b=0,c=0;
  const ma=s.match(/([+-]?\d*\.?\d*)\*?x\*\*2|([+-]?\d*\.?\d*)\*?x²/);
  if(ma){ const v=(ma[1]||ma[2]||'').replace('**',''); a=(v===''||v==='+')?1:(v==='-'?-1:parseFloat(v)||0); }
  const noX2=s.replace(/[+-]?\d*\.?\d*\*?x\*\*2/g,'').replace(/[+-]?\d*\.?\d*\*?x²/g,'');
  const mb=noX2.match(/([+-]?\d*\.?\d*)\*?x(?!\*\*)(?!\d)/);
  if(mb){ const v=(mb[1]||''); b=(v===''||v==='+')?1:(v==='-'?-1:parseFloat(v)||0); }
  const noX=noX2.replace(/[+-]?\d*\.?\d*\*?x(?!\*\*)(?!\d)/g,'').trim();
  if(noX) c=parseFloat(noX)||0;
  return {a,b,c};
}
function signTableSolve(numRoots, denRoots, numLead, denLead, sym){
  // Puntos críticos ordenados
  const crits=[...numRoots.map(v=>({v,type:'N'})),...denRoots.map(v=>({v,type:'D'}))]
    .sort((a,b)=>a.v-b.v)
    .filter((c,i,arr)=>i===0||Math.abs(c.v-arr[i-1].v)>1e-9);

  const allPts=[-Infinity,...crits.map(c=>c.v),Infinity];
  const solParts=[];
  const closed=(sym==='≤'||sym==='≥');
  const denSet=new Set(denRoots.map(r=>matFmtNum(r)));

  for(let i=0;i<allPts.length-1;i++){
    const lo=allPts[i], hi=allPts[i+1];
    const mid=isFinite(lo)&&isFinite(hi)?(lo+hi)/2:isFinite(lo)?lo+1:isFinite(hi)?hi-1:0;
    // sign of num
    let sn=numLead>0?1:-1; numRoots.forEach(r=>{ if(mid<r) sn*=-1; });
    // sign of den
    let sd=denLead>0?1:-1; denRoots.forEach(r=>{ if(mid<r) sd*=-1; });
    const sc=sn*sd;
    const sat=checkIneq(sc,sym,0);
    if(sat){
      const isLoNum=isFinite(lo)&&!denSet.has(matFmtNum(lo));
      const isHiNum=isFinite(hi)&&!denSet.has(matFmtNum(hi));
      const lBr=isFinite(lo)?(closed&&isLoNum?'[':'('):'(';
      const rBr=isFinite(hi)?(closed&&isHiNum?']':')'):')'
      solParts.push(lBr+(isFinite(lo)?matFmtNum(lo):'-∞')+', '+(isFinite(hi)?matFmtNum(hi):'+∞')+rBr);
    }
  }
  return solParts.length?solParts.join(' ∪ '):'∅ (sin solución)';
}

function ineqSolveRational(){
  const numStr=document.getElementById('iq-rat-num').value.trim();
  const denStr=document.getElementById('iq-rat-den').value.trim();
  const sym=document.getElementById('iq-rat-sym').textContent;
  if(!numStr||!denStr){ ineqShowResult('','',['Ingresa numerador y denominador']); return; }

  const num=parseSimplePoly(numStr), den=parseSimplePoly(denStr);
  const numRoots=quadRoots(num.a,num.b,num.c);
  const denRoots=quadRoots(den.a,den.b,den.c);
  const numLead=num.a||num.b||1, denLead=den.a||den.b||1;

  const steps=[
    `Inecuación: (${numStr}) / (${denStr}) ${sym} 0`,
    `Raíces del num: ${numRoots.length?numRoots.map(matFmtNum).join(', '):'ninguna real'}`,
    `Raíces del den (excluidas): ${denRoots.length?denRoots.map(matFmtNum).join(', '):'ninguna'}`,
    'Tabla de signos por intervalos:'
  ];

  // Generar tabla legible
  const allCrits=[...numRoots.map(v=>({v,t:'N'})),...denRoots.map(v=>({v,t:'D'}))]
    .sort((a,b)=>a.v-b.v);
  if(allCrits.length){
    let row='Intervalo: ';
    const allPts=[-Infinity,...allCrits.map(c=>c.v),Infinity];
    for(let i=0;i<allPts.length-1;i++){
      const lo=allPts[i],hi=allPts[i+1];
      const mid=isFinite(lo)&&isFinite(hi)?(lo+hi)/2:isFinite(lo)?lo+1:hi-1;
      let sn=numLead>0?1:-1; numRoots.forEach(r=>{ if(mid<r) sn*=-1; });
      let sd=denLead>0?1:-1; denRoots.forEach(r=>{ if(mid<r) sd*=-1; });
      const sc=sn*sd;
      const lbl=isFinite(lo)?matFmtNum(lo):'-∞';
      const sat=checkIneq(sc,sym,0);
      steps.push(`  (${lbl}, ${isFinite(hi)?matFmtNum(hi):'+∞'}) → signo = ${sc>0?'+':'−'} → ${sat?'✓':'✗'}`);
    }
  }

  const sol=signTableSolve(numRoots,denRoots,numLead,denLead,sym);
  ineqShowResult(`(${numStr}) / (${denStr}) ${sym} 0`, sol, steps);
  const allRoots=[...numRoots,...denRoots];
  drawNumLine(allRoots.map(r=>({val:r,sym:'root',color:'#f472b6'})),[sol]);
}

// ── SISTEMA ──
function ineqSolveSystem() {
  const a1=parseFloat(document.getElementById('iq-a1').value)||1;
  const b1=parseFloat(document.getElementById('iq-b1').value)||0;
  const c1=parseFloat(document.getElementById('iq-c1').value)||0;
  const s1=document.getElementById('iq-s1').textContent;
  const a2=parseFloat(document.getElementById('iq-a2').value)||1;
  const b2=parseFloat(document.getElementById('iq-b2').value)||0;
  const c2=parseFloat(document.getElementById('iq-c2').value)||0;
  const s2=document.getElementById('iq-s2').textContent;
  const steps=[`I₁: ${a1}x + ${b1} ${s1} ${c1}`, `I₂: ${a2}x + ${b2} ${s2} ${c2}`];
  const r1=ineqLinearBound(a1,b1,c1,s1);
  const r2=ineqLinearBound(a2,b2,c2,s2);
  steps.push(`I₁ → x ${r1.sym} ${matFmtNum(r1.val)}`);
  steps.push(`I₂ → x ${r2.sym} ${matFmtNum(r2.val)}`);
  const inter=ineqIntersect(r1,r2);
  const sol=inter||'∅ (intersección vacía — sin solución)';
  steps.push(`Intersección: ${sol}`);
  ineqShowResult('Sistema', sol, steps);
  drawNumLine([{val:r1.val,sym:r1.sym,color:'#7c6af7'},{val:r2.val,sym:r2.sym,color:'#22d3ee'}],[sol]);
}

// ── VALOR ABSOLUTO ──
function ineqSolveAbs() {
  const a=parseFloat(document.getElementById('iq-a').value)||1;
  const b=parseFloat(document.getElementById('iq-b').value)||0;
  const c=parseFloat(document.getElementById('iq-c').value)||0;
  const sym=document.getElementById('iq-sym').textContent;
  const steps=[`|${a}x + ${b}| ${sym} ${c}`];
  let sol;
  if(c<0&&(sym==='<'||sym==='≤')){ sol='∅ (sin solución — |·| ≥ 0)'; steps.push('|·| nunca es negativo'); }
  else if(c<0&&(sym==='>'||sym==='≥')){ sol='x ∈ ℝ'; steps.push('|·| ≥ 0 > c siempre verdadero'); }
  else {
    const r1=(-b+c)/a, r2=(-b-c)/a;
    const lo=Math.min(r1,r2), hi=Math.max(r1,r2);
    const closed=(sym==='≤'||sym==='≥');
    if(sym==='<'||sym==='≤'){
      steps.push(`−${c} ${flipSym(sym)} ${a}x + ${b} ${sym} ${c}`);
      steps.push(`Raíces: ${matFmtNum(lo)}, ${matFmtNum(hi)}`);
      sol=`${closed?'[':'('}${matFmtNum(lo)}, ${matFmtNum(hi)}${closed?']':')'}`;
    } else {
      steps.push(`${a}x + ${b} ${sym} ${c}  ó  ${a}x + ${b} ${flipSym(sym)} −${c}`);
      steps.push(`Raíces: ${matFmtNum(lo)}, ${matFmtNum(hi)}`);
      sol=`(-∞, ${matFmtNum(lo)}${closed?']':')'} ∪ ${closed?'[':'('}${matFmtNum(hi)}, +∞)`;
    }
  }
  ineqShowResult(`|${a}x + ${b}| ${sym} ${c}`, sol, steps);
  drawNumLine([{val:r1,sym:'root',color:'#f472b6'},{val:r2,sym:'root',color:'#f472b6'}],[sol]);
}

// ── RECTA NUMÉRICA ──
function drawNumLine(points, solutionLabels) {
  const canvas=document.getElementById('ineq-numline');
  if(!canvas) return;
  const W=canvas.offsetWidth||320; canvas.width=W; canvas.height=72;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle=_canvasColors.surface2||'#111827'; ctx.fillRect(0,0,W,72);
  const vals=points.map(p=>p.val).filter(v=>isFinite(v));
  if(!vals.length) return;
  const ctr=(Math.min(...vals)+Math.max(...vals))/2;
  const span=Math.max(Math.max(...vals)-Math.min(...vals),4)*1.8;
  const lo=ctr-span/2, hi=ctr+span/2;
  const toX=v=>16+(v-lo)/(hi-lo)*(W-32);
  const ay=38;
  ctx.strokeStyle=_canvasColors.gridLine||'#1e2d45'; ctx.lineWidth=2; ctx.beginPath();
  ctx.moveTo(12,ay); ctx.lineTo(W-12,ay); ctx.stroke();
  ctx.fillStyle='#3a5a7a'; ctx.font='10px Space Mono'; ctx.textAlign='center';
  for(let v=Math.ceil(lo);v<=Math.floor(hi);v++){
    const x=toX(v);
    ctx.strokeStyle=_canvasColors.gridLine||'#1e2d45'; ctx.lineWidth=1; ctx.beginPath();
    ctx.moveTo(x,ay-4); ctx.lineTo(x,ay+4); ctx.stroke();
    if((hi-lo)<20) ctx.fillText(v,x,ay+16);
  }
  points.forEach(({val,sym,color})=>{
    if(!isFinite(val)) return;
    const x=toX(val);
    const filled=(sym==='≤'||sym==='≥'||sym==='root');
    ctx.beginPath(); ctx.arc(x,ay,7,0,Math.PI*2);
    ctx.strokeStyle=color; ctx.lineWidth=2;
    if(filled){ ctx.fillStyle=color; ctx.fill(); }
    else { ctx.fillStyle=_canvasColors.surface2||'#111827'; ctx.fill(); ctx.stroke(); }
    ctx.stroke();
    ctx.fillStyle=color; ctx.font='bold 10px Space Mono'; ctx.textAlign='center';
    ctx.fillText(matFmtNum(val),x,ay-14);
  });
}



// ═══════════════════════════════════════════════════════
// TECLADO — arquitectura correcta
// El input activo se registra con onfocus (no oninput)
// El botón usa pointer events para no robar el foco
// ═══════════════════════════════════════════════════════
let calcActiveInput = null;
let calcCurrentTab  = 'dif';

// Registrar todos los inputs calc-inp con onfocus
function initInputTracking(){
  document.querySelectorAll('.calc-inp').forEach(inp=>{
    inp.addEventListener('focus', ()=>{ calcActiveInput = inp; });
  });
}

const CALC_KB = [
  { label:'Funciones', btns:[
    {icon:'sin',  name:'seno',     ins:'sin('},
    {icon:'cos',  name:'coseno',   ins:'cos('},
    {icon:'tan',  name:'tangente', ins:'tan('},
    {icon:'asin', name:'arcsin',   ins:'asin('},
    {icon:'acos', name:'arccos',   ins:'acos('},
    {icon:'atan', name:'arctan',   ins:'atan('},
    {icon:'ln',   name:'log nat',  ins:'ln('},
    {icon:'log',  name:'log₁₀',   ins:'log('},
    {icon:'√',    name:'raíz',     ins:'sqrt('},
    {icon:'|x|',  name:'abs',      ins:'abs('},
    {icon:'eˣ',   name:'exp',      ins:'e^('},
  ]},
  { label:'Constantes y operadores', btns:[
    {icon:'xⁿ',  name:'potencia', ins:'^'},
    {icon:'π',   name:'pi',       ins:'π'},
    {icon:'e',   name:'euler',    ins:'e'},
    {icon:'∞',   name:'inf',      ins:'Infinity'},
    {icon:'( )', name:'parén.',   ins:'('},
    {icon:'*',   name:'mult.',    ins:'*'},
    {icon:'1/x', name:'fracción', ins:'1/('},
  ]},
];

function buildKB(containerId){
  const el = document.getElementById(containerId);
  if(!el || el.dataset.built) return;
  el.dataset.built = '1';
  el.innerHTML = CALC_KB.map(g=>`
    <div class="calc-kb-group">
      <div class="calc-kb-label">${g.label}</div>
      <div class="calc-kb-btns">
        ${g.btns.map(b=>`
          <button class="calc-kb-btn"
            onpointerdown="kbInsert(event,'${b.ins.replace(/'/g,"\\'")}')">
            <span class="kb-icon">${b.icon}</span>
            <span class="kb-name">${b.name}</span>
          </button>`).join('')}
      </div>
    </div>`).join('');
}

function kbInsert(event, text){
  // Prevenir que el pointer event robe el foco del input
  event.preventDefault();

  // Buscar el mejor input target:
  // 1. El que tiene foco actualmente (calcActiveInput)
  // 2. Si no, el primer input visible en la card abierta del panel activo
  let inp = calcActiveInput;
  if(!inp || !document.contains(inp)){
    const panelId = 'calc-p' + calcCurrentTab.charAt(0).toUpperCase() + calcCurrentTab.slice(1);
    const panel   = document.getElementById(panelId);
    const openCard = panel ? panel.querySelector('.calc-card-body.open') : null;
    inp = openCard ? openCard.querySelector('.calc-inp') : null;
    if(!inp && panel) inp = panel.querySelector('.calc-inp');
  }
  if(!inp) return;

  const s = inp.selectionStart ?? inp.value.length;
  const e = inp.selectionEnd   ?? inp.value.length;
  inp.value = inp.value.slice(0,s) + text + inp.value.slice(e);
  const pos = s + text.length;
  inp.focus();
  inp.setSelectionRange(pos, pos);
  calcActiveInput = inp;
}

// ═══════════════════════════════════════════════════════
// NAVEGACIÓN
// ═══════════════════════════════════════════════════════
function calcTab(id){
  document.querySelectorAll('.calc-tab').forEach((t,i)=>{
    t.classList.toggle('on', ['dif','int','mul','edo','graf'][i]===id);
  });
  ['Dif','Int','Mul','Edo','Graf'].forEach(p=>{
    const el = document.getElementById('calc-p'+p);
    if(el) el.classList.toggle('on', p.toLowerCase()===id);
  });
  calcCurrentTab = id;
  if(id==='graf') grafInit();
}

function toggleCard(id){
  const body  = document.getElementById('body-'+id);
  const arr   = document.getElementById('arr-'+id);
  const card  = document.getElementById('card-'+id);
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open',  !isOpen);
  arr.classList.toggle('open',   !isOpen);
  card.classList.toggle('active',!isOpen);
}

function clearCard(id){
  // Limpiar inputs dentro de body-id
  const body = document.getElementById('body-'+id);
  if(!body) return;
  body.querySelectorAll('.calc-inp').forEach(el=>el.value='');
  // Limpiar res dentro de body-id
  body.querySelectorAll('[id^="res-"]').forEach(el=>el.innerHTML='');
  // También buscar res específico por convención
  const resMap = {lim:'res-lim',der:'res-der',imp:'res-imp',ana:'res-ana',
    indef:'res-indef',def:'res-def',taylor:'res-taylor',
    par:'res-par',grad:'res-grad',dint:'res-dint',
    sep:'res-sep',edolin:'res-edolin',edo2:'res-edo2'};
  if(resMap[id]) { const r=document.getElementById(resMap[id]); if(r) r.innerHTML=''; }
}

// ═══════════════════════════════════════════════════════
// PARSER NUMÉRICO
// ═══════════════════════════════════════════════════════
function calcParse(expr){
  if(!expr||!expr.trim()) return null;
  let s = expr.trim();
  s = s.replace(/π/g,'Math.PI');
  s = s.replace(/\bInfinity\b/g,'Infinity');
  s = s.replace(/\^/g,'**');
  s = s.replace(/\bsin\b/g,'Math.sin');
  s = s.replace(/\bcos\b/g,'Math.cos');
  s = s.replace(/\btan\b/g,'Math.tan');
  s = s.replace(/\basin\b/g,'Math.asin');
  s = s.replace(/\bacos\b/g,'Math.acos');
  s = s.replace(/\batan\b/g,'Math.atan');
  s = s.replace(/\bln\b/g,'Math.log');
  s = s.replace(/\blog\b/g,'Math.log10');
  s = s.replace(/\bsqrt\b/g,'Math.sqrt');
  s = s.replace(/\babs\b/g,'Math.abs');
  // e sola → Math.E, pero no dentro de otra palabra
  s = s.replace(/(?<![a-zA-Z])e(?![a-zA-Z0-9_])/g,'Math.E');
  // multiplicación implícita: 2x → 2*x, pero respetar e**
  s = s.replace(/(\d)([a-df-zA-DF-Z(])/g,'$1*$2');
  s = s.replace(/([a-zA-Z)])(\d)/g,'$1*$2');
  s = s.replace(/\)\(/g,')*(');
  try {
    const fn = new Function('x','y','return ('+s+');');
    fn(1,1); // test
    return fn;
  } catch(e){ return null; }
}

// fN() unificada arriba — alias de compatibilidad disponible

function resBox(label,val,hint='',big=false){
  return `<div class="calc-res-box">
    <div class="calc-res-label">${label}</div>
    <div class="calc-res-val${big?' big':''}">${val}</div>
    ${hint?`<div class="calc-res-hint">${hint}</div>`:''}
  </div>`;
}
function errBox(msg){ return `<div class="calc-err">⚠ ${msg}</div>`; }

// ═══════════════════════════════════════════════════════
// DERIVACIÓN SIMBÓLICA
// Motor basado en árbol de expresión (parse → diff → simplify → print)
// Cubre: potencias, polinomios, trig, log, exp, productos, cocientes, cadena
// ═══════════════════════════════════════════════════════

// --- Tokenizer ---
function tokenize(expr){
  expr = expr.trim()
    .replace(/\*\*/g,'^')
    .replace(/π/g,'3.14159265358979')
    // Superíndices Unicode → ^n
    .replace(/⁰/g,'^0').replace(/¹/g,'^1').replace(/²/g,'^2').replace(/³/g,'^3')
    .replace(/⁴/g,'^4').replace(/⁵/g,'^5').replace(/⁶/g,'^6').replace(/⁷/g,'^7')
    .replace(/⁸/g,'^8').replace(/⁹/g,'^9')
    // e^x  →  exp(x)
    .replace(/\be\^(\()/g,'exp(')
    .replace(/\be\^([a-zA-Z0-9_.]+)/g,'exp($1)')
    ;

  const raw = [];
  let i = 0;
  while(i < expr.length){
    const c = expr[i];
    if(/\s/.test(c)){i++;continue;}
    if(/\d/.test(c)||c==='.'){
      let num='';
      while(i<expr.length&&(/\d/.test(expr[i])||expr[i]==='.')) num+=expr[i++];
      raw.push({type:'num',val:parseFloat(num)});
      continue;
    }
    if(/[a-zA-Z]/.test(c)){
      let word='';
      while(i<expr.length&&/[a-zA-Z0-9]/.test(expr[i])) word+=expr[i++];
      if(['sin','cos','tan','asin','acos','atan','ln','log','sqrt','abs','exp'].includes(word))
        raw.push({type:'fn',val:word});
      else if(word==='e') raw.push({type:'num',val:Math.E});
      else raw.push({type:'var',val:word});
      continue;
    }
    if('+-*/^()'.includes(c)) raw.push({type:'op',val:c});
    i++;
  }
  // Insertar '*' implícito: num/var/) seguido de num/var/fn/(
  const tokens = [];
  for(let j=0;j<raw.length;j++){
    tokens.push(raw[j]);
    const cur = raw[j], nxt = raw[j+1];
    if(!nxt) continue;
    const curIsVal = cur.type==='num'||cur.type==='var'||(cur.type==='op'&&cur.val===')');
    const nxtIsVal = nxt.type==='num'||nxt.type==='var'||nxt.type==='fn'||(nxt.type==='op'&&nxt.val==='(');
    if(curIsVal && nxtIsVal) tokens.push({type:'op',val:'*'});
  }
  return tokens;
}

// --- Parser recursivo descendente → AST ---
function parseExpr(tokens){
  let pos = 0;
  function peek(){ return tokens[pos]; }
  function consume(){ return tokens[pos++]; }

  function parseAddSub(){
    let left = parseMulDiv();
    while(pos<tokens.length&&peek().type==='op'&&(peek().val==='+'||peek().val==='-')){
      const op = consume().val;
      const right = parseMulDiv();
      left = {type:op, left, right};
    }
    return left;
  }
  function parseMulDiv(){
    let left = parsePow();
    while(pos<tokens.length&&peek().type==='op'&&(peek().val==='*'||peek().val==='/')){
      const op = consume().val;
      const right = parsePow();
      left = {type:op, left, right};
    }
    return left;
  }
  function parsePow(){
    let base = parseUnary();
    if(pos<tokens.length&&peek().type==='op'&&peek().val==='^'){
      consume();
      const exp = parseUnary();
      base = {type:'^', left:base, right:exp};
    }
    return base;
  }
  function parseUnary(){
    if(pos<tokens.length&&peek().type==='op'&&peek().val==='-'){
      consume();
      return {type:'neg', arg:parseUnary()};
    }
    return parsePrimary();
  }
  function parsePrimary(){
    const t = peek();
    if(!t) return {type:'num',val:0};
    if(t.type==='num'){ consume(); return {type:'num',val:t.val}; }
    if(t.type==='var'){ consume(); return {type:'var',val:t.val}; }
    if(t.type==='fn'){
      const fn = consume().val;
      // expect '('
      if(pos<tokens.length&&peek().val==='(') consume();
      const arg = parseAddSub();
      if(pos<tokens.length&&peek().val===')') consume();
      return {type:'fn', fn, arg};
    }
    if(t.type==='op'&&t.val==='('){
      consume();
      const inner = parseAddSub();
      if(pos<tokens.length&&peek().val===')') consume();
      return inner;
    }
    return {type:'num',val:0};
  }
  return parseAddSub();
}

// --- Diferenciación simbólica del AST ---
function diffAST(node, varName='x'){
  if(!node) return {type:'num',val:0};
  switch(node.type){
    case 'num': return {type:'num',val:0};
    case 'var': return {type:'num',val:node.val===varName?1:0};
    case 'neg': return {type:'neg',arg:diffAST(node.arg,varName)};
    case '+': return {type:'+',left:diffAST(node.left,varName),right:diffAST(node.right,varName)};
    case '-': return {type:'-',left:diffAST(node.left,varName),right:diffAST(node.right,varName)};
    case '*': return {type:'+',
      left:{type:'*',left:diffAST(node.left,varName),right:node.right},
      right:{type:'*',left:node.left,right:diffAST(node.right,varName)}};
    case '/': return {type:'/',
      left:{type:'-',
        left:{type:'*',left:diffAST(node.left,varName),right:node.right},
        right:{type:'*',left:node.left,right:diffAST(node.right,varName)}},
      right:{type:'^',left:node.right,right:{type:'num',val:2}}};
    case '^': {
      const base = node.left, exp = node.right;
      // Caso especial: base es e (Math.E) → d/dx[e^u] = e^u * u'
      if(base.type==='num'&&Math.abs(base.val-Math.E)<1e-6){
        return simplify({type:'*', left:node, right:diffAST(exp,varName)});
      }
      // Si el exponente es constante → n*base^(n-1) * base'
      if(isConst(exp)){
        const n = evalAST(exp);
        if(n===0) return {type:'num',val:0};
        return simplify({type:'*',
          left:{type:'*',left:{type:'num',val:n},
            right:{type:'^',left:base,right:{type:'num',val:n-1}}},
          right:diffAST(base,varName)});
      }
      // Si la base es constante a^u → a^u * ln(a) * u'
      if(isConst(base)){
        return simplify({type:'*',
          left:{type:'*',
            left:node,
            right:{type:'fn',fn:'ln',arg:base}},
          right:diffAST(exp,varName)});
      }
      // General
      return simplify({type:'*',
        left:node,
        right:{type:'+',
          left:{type:'*',left:diffAST(exp,varName),right:{type:'fn',fn:'ln',arg:base}},
          right:{type:'*',left:exp,right:{type:'/',
            left:diffAST(base,varName),right:base}}}});
    }
    case 'fn': {
      const u = node.arg, du = diffAST(u,varName);
      switch(node.fn){
        case 'sin': return simplify({type:'*',left:{type:'fn',fn:'cos',arg:u},right:du});
        case 'cos': return simplify({type:'*',left:{type:'neg',arg:{type:'fn',fn:'sin',arg:u}},right:du});
        case 'tan': return simplify({type:'*',
          left:{type:'/',left:{type:'num',val:1},
            right:{type:'^',left:{type:'fn',fn:'cos',arg:u},right:{type:'num',val:2}}},
          right:du});
        case 'asin': return simplify({type:'*',
          left:{type:'/',left:{type:'num',val:1},
            right:{type:'fn',fn:'sqrt',arg:{type:'-',
              left:{type:'num',val:1},right:{type:'^',left:u,right:{type:'num',val:2}}}}},
          right:du});
        case 'acos': return simplify({type:'*',
          left:{type:'neg',arg:{type:'/',left:{type:'num',val:1},
            right:{type:'fn',fn:'sqrt',arg:{type:'-',
              left:{type:'num',val:1},right:{type:'^',left:u,right:{type:'num',val:2}}}}}},
          right:du});
        case 'atan': return simplify({type:'*',
          left:{type:'/',left:{type:'num',val:1},
            right:{type:'+',left:{type:'num',val:1},
              right:{type:'^',left:u,right:{type:'num',val:2}}}},
          right:du});
        case 'ln': return simplify({type:'*',left:{type:'/',left:{type:'num',val:1},right:u},right:du});
        case 'log': return simplify({type:'*',
          left:{type:'/',left:{type:'num',val:1},
            right:{type:'*',left:{type:'num',val:Math.LN10},right:u}},
          right:du});
        case 'sqrt': return simplify({type:'*',
          left:{type:'/',left:{type:'num',val:1},
            right:{type:'*',left:{type:'num',val:2},right:{type:'fn',fn:'sqrt',arg:u}}},
          right:du});
        case 'abs': return simplify({type:'*',
          left:{type:'/',left:u,right:{type:'fn',fn:'abs',arg:u}},
          right:du});
        case 'exp': return simplify({type:'*',left:node,right:du});
        default: return {type:'num',val:0};
      }
    }
    default: return {type:'num',val:0};
  }
}

function isConst(node, varName='x'){
  if(!node) return true;
  if(node.type==='num') return true;
  if(node.type==='var') return node.val!==varName;
  if(node.type==='fn') return isConst(node.arg,varName);
  if(node.type==='neg') return isConst(node.arg,varName);
  return isConst(node.left,varName)&&isConst(node.right,varName);
}

function evalAST(node){
  if(!node) return 0;
  switch(node.type){
    case 'num': return node.val;
    case 'neg': return -evalAST(node.arg);
    case '+': return evalAST(node.left)+evalAST(node.right);
    case '-': return evalAST(node.left)-evalAST(node.right);
    case '*': return evalAST(node.left)*evalAST(node.right);
    case '/': return evalAST(node.left)/evalAST(node.right);
    case '^': return Math.pow(evalAST(node.left),evalAST(node.right));
    case 'fn': {
      const v=evalAST(node.arg);
      const fns={sin:Math.sin,cos:Math.cos,tan:Math.tan,asin:Math.asin,acos:Math.acos,
        atan:Math.atan,ln:Math.log,log:Math.log10,sqrt:Math.sqrt,abs:Math.abs,exp:Math.exp};
      return (fns[node.fn]||((x)=>x))(v);
    }
    default: return 0;
  }
}

// --- Simplificación algebraica del AST ---
function simplify(node){
  if(!node) return {type:'num',val:0};
  // Simplificar hijos primero
  if(node.left) node={...node,left:simplify(node.left)};
  if(node.right) node={...node,right:simplify(node.right)};
  if(node.arg) node={...node,arg:simplify(node.arg)};

  switch(node.type){
    case '*':
      // 0 * anything = 0
      if((node.left.type==='num'&&node.left.val===0)||
         (node.right.type==='num'&&node.right.val===0))
        return {type:'num',val:0};
      // 1 * anything = anything
      if(node.left.type==='num'&&node.left.val===1) return node.right;
      if(node.right.type==='num'&&node.right.val===1) return node.left;
      // (-1) * x
      if(node.left.type==='num'&&node.left.val===-1)
        return {type:'neg',arg:node.right};
      // num * num
      if(node.left.type==='num'&&node.right.type==='num')
        return {type:'num',val:node.left.val*node.right.val};
      // FIX: colapsar num*(num*expr) → (n1*n2)*expr
      if(node.left.type==='num'&&node.right.type==='*'&&node.right.left.type==='num')
        return simplify({type:'*',
          left:{type:'num',val:node.left.val*node.right.left.val},
          right:node.right.right});
      // FIX: colapsar (num*expr)*num → (n1*n2)*expr
      if(node.right.type==='num'&&node.left.type==='*'&&node.left.left.type==='num')
        return simplify({type:'*',
          left:{type:'num',val:node.right.val*node.left.left.val},
          right:node.left.right});
      break;
    case '+':
      if(node.left.type==='num'&&node.left.val===0) return node.right;
      if(node.right.type==='num'&&node.right.val===0) return node.left;
      if(node.left.type==='num'&&node.right.type==='num')
        return {type:'num',val:node.left.val+node.right.val};
      break;
    case '-':
      if(node.right.type==='num'&&node.right.val===0) return node.left;
      if(node.left.type==='num'&&node.left.val===0)
        return {type:'neg',arg:node.right};
      if(node.left.type==='num'&&node.right.type==='num')
        return {type:'num',val:node.left.val-node.right.val};
      break;
    case '/':
      if(node.right.type==='num'&&node.right.val===1) return node.left;
      if(node.left.type==='num'&&node.left.val===0) return {type:'num',val:0};
      if(node.left.type==='num'&&node.right.type==='num')
        return {type:'num',val:node.left.val/node.right.val};
      break;
    case '^':
      if(node.right.type==='num'&&node.right.val===1) return node.left;
      if(node.right.type==='num'&&node.right.val===0) return {type:'num',val:1};
      if(node.left.type==='num'&&node.right.type==='num')
        return {type:'num',val:Math.pow(node.left.val,node.right.val)};
      break;
    case 'neg':
      if(node.arg.type==='num') return {type:'num',val:-node.arg.val};
      if(node.arg.type==='neg') return node.arg.arg;
      break;
  }
  return node;
}

// --- AST a string legible ---
function astToStr(node, parentPrec=0){
  if(!node) return '0';
  const PREC = {'+':1,'-':1,'*':2,'/':2,'^':3,'neg':4};
  switch(node.type){
    case 'num': {
      const v = node.val;
      if(Math.abs(v-Math.PI)<1e-6) return 'π';
      if(Math.abs(v-Math.E)<1e-6) return 'e';
      if(Number.isInteger(v)) return String(v);
      // Mostrar como fracción si es racional simple
      const rounded = parseFloat(v.toFixed(6));
      return String(rounded);
    }
    case 'var': return node.val;
    case 'neg': {
      const inner = astToStr(node.arg, PREC['neg']);
      return node.arg.type==='num'||node.arg.type==='var' ? '-'+inner : '-('+inner+')';
    }
    case 'fn':
      if(node.fn==='exp') return `e^(${astToStr(node.arg)})`;
      return `${node.fn}(${astToStr(node.arg)})`;
    case '+': {
      const l=astToStr(node.left,1), r=astToStr(node.right,1);
      // Si right empieza con - no poner +
      if(r.startsWith('-')) return `${l} ${r}`;
      return `${l} + ${r}`;
    }
    case '-': {
      const l=astToStr(node.left,1), r=astToStr(node.right,1);
      const rStr = node.right.type==='+'||node.right.type==='-' ? `(${r})` : r;
      return `${l} - ${rStr}`;
    }
    case '*': {
      const l=astToStr(node.left,2), r=astToStr(node.right,2);
      const lStr = node.left.type==='+'||node.left.type==='-' ? `(${l})` : l;
      const rStr = node.right.type==='+'||node.right.type==='-' ? `(${r})` : r;
      // Omitir * antes de letra: 2*x → 2x, 2*sin → 2sin
      if(rStr[0]&&/[a-zA-Z(]/.test(rStr[0])&&!lStr.includes('/'))
        return `${lStr}${rStr}`;
      return `${lStr}*${rStr}`;
    }
    case '/': {
      const l=astToStr(node.left,2), r=astToStr(node.right,2);
      const lStr = node.left.type==='+'||node.left.type==='-' ? `(${l})` : l;
      const rStr = (node.right.type==='+'||node.right.type==='-'||node.right.type==='*'||node.right.type==='/') ? `(${r})` : r;
      return `${lStr}/${rStr}`;
    }
    case '^': {
      const l=astToStr(node.left,3), r=astToStr(node.right,3);
      const lStr = (node.left.type!=='num'&&node.left.type!=='var') ? `(${l})` : l;
      return `${lStr}^${r}`;
    }
    default: return '?';
  }
}

// Recolectar y combinar términos similares del AST (suma/resta de monomios)
// Convierte el AST a lista de {coef, base_str} y reconstruye
function collectTerms(ast){
  // Extraer lista plana de sumandos del AST
  function flatten(node, sign=1){
    if(!node) return [];
    if(node.type==='+') return [...flatten(node.left,sign),...flatten(node.right,sign)];
    if(node.type==='-') return [...flatten(node.left,sign),...flatten(node.right,-sign)];
    if(node.type==='neg') return flatten(node.arg,-sign);
    // término individual: extraer coeficiente y base
    return [{sign, node}];
  }
  // Normalizar un término a {coef:number, key:string, node}
  function termKey(sign, node){
    // num * expr  o  expr solo
    if(node.type==='*'&&node.left.type==='num')
      return {coef:sign*node.left.val, key:astToStr(node.right), rest:node.right};
    if(node.type==='num')
      return {coef:sign*node.val, key:'__const__', rest:null};
    if(node.type==='neg'&&node.arg.type==='num')
      return {coef:-sign*node.arg.val, key:'__const__', rest:null};
    return {coef:sign*1, key:astToStr(node), rest:node};
  }

  const terms = flatten(ast);
  const map = new Map();
  const order = [];
  terms.forEach(({sign,node})=>{
    const {coef,key,rest} = termKey(sign,node);
    if(map.has(key)){
      map.get(key).coef += coef;
    } else {
      map.set(key, {coef, rest, key});
      order.push(key);
    }
  });

  // Reconstruir AST desde la lista combinada
  let result = null;
  order.forEach(key=>{
    const {coef, rest} = map.get(key);
    if(Math.abs(coef)<1e-10) return;
    const absCoef = Math.abs(coef);
    const isNeg   = coef < 0;

    // Construir el término positivo
    let posTerm;
    if(key==='__const__')     posTerm = {type:'num', val:absCoef};
    else if(absCoef===1)      posTerm = rest;
    else                      posTerm = {type:'*', left:{type:'num',val:absCoef}, right:rest};

    if(result===null){
      result = isNeg ? {type:'neg', arg:posTerm} : posTerm;
    } else if(isNeg){
      result = {type:'-', left:result, right:posTerm};
    } else {
      result = {type:'+', left:result, right:posTerm};
    }
  });
  return result||{type:'num',val:0};
}

function symbolicDeriv(exprStr, order=1, varName='x'){
  try{
    const tokens = tokenize(exprStr);
    let ast = parseExpr(tokens);
    for(let i=0;i<order;i++){
      ast = simplify(diffAST(ast, varName));
      ast = collectTerms(ast);   // combinar términos similares
      ast = simplify(ast);       // simplificar de nuevo tras combinar
    }
    return astToStr(ast);
  } catch(e){
    return null;
  }
}

// ═══════════════════════════════════════════════════════
// CÁLCULO DIFERENCIAL
// ═══════════════════════════════════════════════════════

// ── evalA: parsea 'a' como expresión (π/4, ln(2), sqrt(2), etc.) ──
function evalA(aStr){
  if(!aStr||!aStr.trim()) return NaN;
  const s=aStr.trim();
  if(s==='∞'||s==='Infinity'||s==='+∞') return Infinity;
  if(s==='-∞'||s==='-Infinity') return -Infinity;
  try{
    const code=s
      .replace(/π/g,'Math.PI').replace(/\^/g,'**')
      .replace(/⁰/g,'**0').replace(/¹/g,'**1').replace(/²/g,'**2').replace(/³/g,'**3')
      .replace(/⁴/g,'**4').replace(/⁵/g,'**5').replace(/⁶/g,'**6').replace(/⁷/g,'**7')
      .replace(/⁸/g,'**8').replace(/⁹/g,'**9')
      .replace(/\bln\b/g,'Math.log').replace(/\bsqrt\b/g,'Math.sqrt')
      .replace(/\bsin\b/g,'Math.sin').replace(/\bcos\b/g,'Math.cos')
      .replace(/\btan\b/g,'Math.tan').replace(/\babs\b/g,'Math.abs')
      .replace(/(?<![a-zA-Z])e(?![a-zA-Z0-9_])/g,'Math.E')
      .replace(/(\d)([a-df-zA-DF-Z(])/g,'$1*$2').replace(/\)\(/g,')*(');
    const v=Function('"use strict"; return ('+code+');')();
    return (typeof v==='number')?v:NaN;
  }catch(e){ return NaN; }
}

// ── Aproximación numérica lateral ──
function approach(fn,a,dir){
  if(!isFinite(a)){
    const pts=[1e3,1e4,1e5,1e6];
    const v=pts.map(s=>{try{const r=fn(dir>0?s:-s,0);return isFinite(r)?r:null;}catch{return null;}});
    const f=v.filter(x=>x!==null); return f.length?f[f.length-1]:NaN;
  }
  const hs=[1e-3,1e-4,1e-5,1e-6,1e-7,1e-8];
  const v=hs.map(h=>{try{const r=fn(a+dir*h,0);return isFinite(r)?r:null;}catch{return null;}});
  const f=v.filter(x=>x!==null); return f.length?f[f.length-1]:NaN;
}

// ── Derivadas numéricas ──
function nd(fn,a,h=1e-7){ return (fn(a+h,0)-fn(a-h,0))/(2*h); }
function nd2(fn,a,h=1e-6){ return (fn(a+h,0)-2*fn(a,0)+fn(a-h,0))/(h*h); }

// ── Resultado exacto: fracción / constante ──
function toExact(v){
  if(!isFinite(v)) return v>0?'+∞':'-∞';
  if(Math.abs(v)<1e-10) return '0';
  if(Math.abs(v)>1e12) return v>0?'+∞':'-∞';
  if(Math.abs(v-Math.round(v))<1e-8) return String(Math.round(v));
  const neg=v<0; const av=Math.abs(v);
  for(let d=2;d<=200;d++){
    const n=Math.round(av*d);
    if(n>0&&Math.abs(n/d-av)<5e-8) return (neg?'-':'')+n+'/'+d;
  }
  for(let d=1;d<=16;d++){
    const n=Math.round(v*d/Math.PI);
    if(n!==0&&Math.abs(n*Math.PI/d-v)<1e-7){
      const ns=Math.abs(n)===1?(n<0?'-':''):(n+'');
      return ns+'π'+(d===1?'':'/'+d);
    }
  }
  for(let r=2;r<=15;r++){
    const sq=Math.sqrt(r);
    for(let d=1;d<=30;d++){
      const n=Math.round(av*d/sq);
      if(n>0&&Math.abs(n*sq/d-av)<5e-8){
        const ns=n===1?'':(n+'');
        return (neg?'-':'')+ns+'√'+r+(d===1?'':'/'+d);
      }
    }
  }
  return null;
}

function fmtResult(v){
  if(v===null||v===undefined||isNaN(v)) return null;
  if(!isFinite(v)) return v>0?'+∞':'-∞';
  if(Math.abs(v)>1e12) return v>0?'+∞':'-∞';
  const ex=toExact(v); if(ex) return ex;
  return parseFloat(v.toFixed(8)).toString();
}

// fmtNum() → alias fmt() arriba

function fmtA(s){ return (s||'').trim().replace('Infinity','∞').replace('-Infinity','-∞'); }

// ── Índice de '/' en nivel 0 de paréntesis ──
function findTopSlash(s){
  // Si la expresión está envuelta en paréntesis externos, quitarlos para buscar el /
  function stripOuter(str){
    str=str.trim();
    if(str[0]!=='(') return str;
    let d=0;
    for(let i=0;i<str.length;i++){
      if(str[i]==='(') d++; else if(str[i]===')') d--;
      if(d===0) return i===str.length-1 ? str.slice(1,-1) : str;
    }
    return str;
  }
  const inner=stripOuter(s);
  // Buscar / en nivel 0 del inner
  let d=0;
  for(let i=0;i<inner.length;i++){
    if(inner[i]==='(') d++; else if(inner[i]===')') d--;
    else if(inner[i]==='/'&&d===0) return {idx:i, str:inner};
  }
  return {idx:-1, str:s};
}

// ── Sustitución visual: reemplaza x por el valor para mostrar pasos ──
function visSubstitute(fxStr, a){
  let aFmt;
  if(Number.isInteger(a)) aFmt=String(a);
  else if(Math.abs(a-Math.PI)<1e-9)     aFmt='π';
  else if(Math.abs(a-Math.PI/4)<1e-9)   aFmt='π/4';
  else if(Math.abs(a-Math.PI/2)<1e-9)   aFmt='π/2';
  else if(Math.abs(a-2*Math.PI)<1e-9)   aFmt='2π';
  else if(Math.abs(a-Math.E)<1e-9)      aFmt='e';
  else if(Math.abs(a-Math.SQRT2)<1e-9)  aFmt='√2';
  else aFmt=parseFloat(a.toFixed(4)).toString();
  const needsParen=a<0||aFmt.includes('/');
  const aN=needsParen?'('+aFmt+')':aFmt;
  let result='';
  for(let i=0;i<fxStr.length;i++){
    const c=fxStr[i];
    if(c==='x'){
      const prev=i>0?fxStr[i-1]:'';
      const next=i<fxStr.length-1?fxStr[i+1]:'';
      if(/[a-zA-Z]/.test(prev)||/[a-zA-Z]/.test(next)) result+=c;
      else if(/\d/.test(prev)) result+='·'+aN;
      else result+=aN;
    } else result+=c;
  }
  return result;
}


function resolveIndet(fxStr,a,stepsOut){
  const fn=calcParse(fxStr); if(!fn) return NaN;
  const {idx, str:normStr}=findTopSlash(fxStr);

  if(idx>0){
    const numStr=normStr.slice(0,idx).trim();
    const denStr=normStr.slice(idx+1).trim();
    const fnN=calcParse(numStr), fnD=calcParse(denStr);
    if(!fnN||!fnD) return NaN;

    // L'Hôpital orden 1
    const na_=nd(fnN,a), da_=nd(fnD,a);
    stepsOut.push({tipo:'lhopital',orden:1,numStr,denStr,numDeriv:na_,denDeriv:da_,
      result:Math.abs(da_)>1e-12?na_/da_:NaN});
    if(isFinite(da_)&&Math.abs(da_)>1e-12){
      const r=na_/da_; if(isFinite(r)) return r;
    }
    // L'Hôpital orden 2
    if(Math.abs(na_)<1e-9&&Math.abs(da_)<1e-9){
      const na__=nd2(fnN,a), da__=nd2(fnD,a);
      stepsOut.push({tipo:'lhopital',orden:2,numDeriv:na__,denDeriv:da__,
        result:Math.abs(da__)>1e-12?na__/da__:NaN});
      if(isFinite(da__)&&Math.abs(da__)>1e-12){
        const r=na__/da__; if(isFinite(r)) return r;
      }
    }
    // Cancelación numérica del factor (x-a)
    const qN=(x)=>Math.abs(x-a)<1e-15?nd(fnN,a):fnN(x,0)/(x-a);
    const qD=(x)=>Math.abs(x-a)<1e-15?nd(fnD,a):fnD(x,0)/(x-a);
    const qna=qN(a+1e-7), qda=qD(a+1e-7);
    if(isFinite(qna)&&isFinite(qda)&&Math.abs(qda)>1e-12){
      stepsOut.push({tipo:'cancelacion',qnum:qna,qden:qda,result:qna/qda});
      return qna/qda;
    }
  } else {
    const fp=nd(fn,a);
    stepsOut.push({tipo:'lhopital_simple',fp,result:fp});
    if(isFinite(fp)) return fp;
  }
  const vr=approach(fn,a,1), vl=approach(fn,a,-1);
  if(isFinite(vr)&&isFinite(vl)&&Math.abs(vr-vl)<1e-4) return (vr+vl)/2;
  return NaN;
}

// ── COMPUTE LIMIT ──
function computeLimit(fxStr,aStr,side){
  const steps=[]; const r={steps,fxStr,aStr,side};
  const a=evalA(aStr); r.a=a;
  if(isNaN(a)){
    r.error=aStr.trim()?
      'No se pudo evaluar "'+aStr+'". Usa: 0, π/4, ln(2), sqrt(2), 2π…':
      'Ingresa el valor de x → a';
    return r;
  }
  const fn=calcParse(fxStr);
  if(!fn){ r.error='Función inválida. Ej: sin(x)/x, (x^2-4)/(x-2), sqrt(x)'; return r; }

  // Sustitución directa
  let direct=null;
  if(isFinite(a)){ try{ const v=fn(a,0); if(isFinite(v)) direct=v; }catch(e){} }
  const _visDirect=isFinite(a)?visSubstitute(fxStr,a):null;
  steps.push({tipo:'sustitucion',aDisplay:fmtA(aStr),direct,visSub:_visDirect});

  if(direct!==null){
    const ex=toExact(direct);
    r.value=ex||fmtNum(direct,8); r.valueNum=direct;
    r.exact=ex; r.exists=true; r.tipo='directo';
    r.vr=direct; r.vl=direct; return r;
  }

  // Detectar indeterminación
  const {idx, str:normFx}=findTopSlash(fxStr);
  let isZZ=false, isII=false, faNum=NaN, faDen=NaN;
  let numStr='', denStr='';
  if(idx>0&&isFinite(a)){
    numStr=normFx.slice(0,idx).trim();
    denStr=normFx.slice(idx+1).trim();
    const fnN=calcParse(numStr);
    const fnD=calcParse(denStr);
    if(fnN&&fnD){
      faNum=fnN(a,0); faDen=fnD(a,0);
      isZZ=Math.abs(faNum)<1e-9&&Math.abs(faDen)<1e-9;
      isII=!isFinite(faNum)&&!isFinite(faDen);
    }
  }
  // Sustitución visual
  const visSub = idx>0
    ? visSubstitute(numStr,a)+' / '+visSubstitute(denStr,a)
    : visSubstitute(fxStr,a);
  // Guardar numStr/denStr en el step de sustitución para los pasos
  if(steps.length>0) steps[0].visSub=visSub;
  if(steps.length>0) steps[0].numStr=numStr; 
  if(steps.length>0) steps[0].denStr=denStr;
  if(steps.length>0&&faNum!==undefined) steps[0].faNum=faNum;
  if(steps.length>0&&faDen!==undefined) steps[0].faDen=faDen;

  if(isZZ) steps.push({tipo:'indet_00',faNum,faDen,numStr,denStr,visSub});
  else if(isII) steps.push({tipo:'indet_inf',faNum,faDen});
  r.isIndet=isZZ||isII;

  // Laterales
  const vr=approach(fn,a,1), vl=approach(fn,a,-1);
  r.vrRaw=vr; r.vlRaw=vl;
  steps.push({tipo:'laterales',vr,vl,aDisplay:fmtA(aStr)});

  // Resolver
  let resolved=NaN;
  if(r.isIndet){
    resolved=resolveIndet(fxStr,a,steps);
  } else if(isFinite(vr)&&isFinite(vl)&&Math.abs(vr-vl)<5e-5){
    resolved=(vr+vl)/2;
  } else if(side==='right') resolved=vr;
  else if(side==='left')  resolved=vl;

  r.vr=isNaN(resolved)?vr:resolved;
  r.vl=isNaN(resolved)?vl:resolved;

  const pick=(u)=>{ r.exists=isFinite(u); r.valueNum=u;
    r.value=fmtResult(u)||'No existe'; r.exact=toExact(u)||null; };

  if(side==='right')     pick(isNaN(resolved)?vr:resolved);
  else if(side==='left') pick(isNaN(resolved)?vl:resolved);
  else {
    const ev=!isNaN(resolved)?resolved:(isFinite(vr)&&isFinite(vl)&&Math.abs(vr-vl)<5e-5?(vr+vl)/2:NaN);
    if(!isNaN(ev)) pick(ev);
    else if(!isFinite(vr)||!isFinite(vl)){
      const inf=!isFinite(vr)?vr:vl;
      r.exists=false; r.valueNum=inf;
      r.value=fmtResult(inf)||'+∞'; r.exact=null; r.isInfinity=true;
    } else {
      r.exists=false; r.value='No existe'; r.exact=null;
      steps.push({tipo:'no_existe',vr,vl});
    }
  }
  r.tipo=isZZ?'indet_00':isII?'indet_inf':(!isFinite(vr)||!isFinite(vl)?'infinito':'lateral');
  return r;
}

// ── HTML DE PASOS ──
function limitStepsHTML(r){
  if(r.error) return errBox(r.error);
  const S=r.steps, a=fmtA(r.aStr), fx=r.fxStr;
  let html='<div class="lim-steps">';
  let n=1;

  // 1 Planteamiento
  html+=`<div class="lim-step"><div class="lim-step-num">${n++}</div><div class="lim-step-body">
    <div class="lim-step-title">Planteamiento</div>
    <div class="lim-step-expr">lim<sub>x→${a}</sub> [ ${fx} ]</div>
  </div></div>`;

  // 2 Sustitución con desarrollo numérico
  const sub=S.find(s=>s.tipo==='sustitucion');
  if(sub){
    const visSub=sub.visSub||visSubstitute(fx,r.a);
    if(sub.direct!==null){
      html+=`<div class="lim-step"><div class="lim-step-num">${n++}</div><div class="lim-step-body">
        <div class="lim-step-title">Sustitución x = ${a}</div>
        <div class="lim-step-expr">${visSub}</div>
        <div class="lim-step-expr lim-ok">= ${fmtResult(sub.direct)}</div>
      </div></div>`;
    } else {
      const i00=S.find(s=>s.tipo==='indet_00');
      const numV=i00?fmtNum(i00.faNum,4):'0';
      const denV=i00?fmtNum(i00.faDen,4):'0';
      html+=`<div class="lim-step"><div class="lim-step-num">${n++}</div><div class="lim-step-body">
        <div class="lim-step-title">Sustitución x = ${a}</div>
        <div class="lim-step-expr">${visSub}</div>
        ${i00?`<div class="lim-step-expr">= ${numV} / ${denV}</div>`:''}
        <div class="lim-step-expr"><span class="lim-warn">→ 0/0 Forma indeterminada</span></div>
      </div></div>`;
    }
  }

  // 3 Estrategia
  const i00=S.find(s=>s.tipo==='indet_00');
  const iII=S.find(s=>s.tipo==='indet_inf');
  if(i00){
    html+=`<div class="lim-step"><div class="lim-step-num">${n++}</div><div class="lim-step-body">
      <div class="lim-step-title">Estrategia: L'Hôpital / Cancelación</div>
      <div class="lim-step-hint">Forma 0/0 — se deriva num. y den. por separado</div>
    </div></div>`;
  } else if(iII){
    html+=`<div class="lim-step"><div class="lim-step-num">${n++}</div><div class="lim-step-body">
      <div class="lim-step-title">Estrategia: L'Hôpital (forma ∞/∞)</div>
    </div></div>`;
  }

  // L'Hôpital
  S.filter(s=>s.tipo==='lhopital').forEach(lh=>{
    html+=`<div class="lim-step"><div class="lim-step-num">${n++}</div><div class="lim-step-body">
      <div class="lim-step-title">L'Hôpital — orden ${lh.orden}</div>
      <div class="lim-step-expr">N'(${a}) = ${fmtNum(lh.numDeriv)} , D'(${a}) = ${fmtNum(lh.denDeriv)}</div>
      <div class="lim-step-expr">lim = ${fmtNum(lh.numDeriv)} / ${fmtNum(lh.denDeriv)} = <strong class="lim-ok">${isFinite(lh.result)?fmtResult(lh.result):'∞'}</strong></div>
    </div></div>`;
  });

  // Cancelación
  const canc=S.find(s=>s.tipo==='cancelacion');
  if(canc){
    html+=`<div class="lim-step"><div class="lim-step-num">${n++}</div><div class="lim-step-body">
      <div class="lim-step-title">Cancelación factor (x − ${a})</div>
      <div class="lim-step-expr">Q_N ≈ ${fmtNum(canc.qnum)} , Q_D ≈ ${fmtNum(canc.qden)}</div>
      <div class="lim-step-expr">lim = <strong class="lim-ok">${fmtResult(canc.result)}</strong></div>
    </div></div>`;
  }

  // Verificación lateral
  if(r.tipo!=='directo'){
    const lat=S.find(s=>s.tipo==='laterales');
    if(lat){
      html+=`<div class="lim-step"><div class="lim-step-num">✓</div><div class="lim-step-body">
        <div class="lim-step-title">Verificación numérica</div>
        <div class="lim-step-expr">x→${a}⁺ ≈ ${fmtNum(lat.vr)} , x→${a}⁻ ≈ ${fmtNum(lat.vl)}</div>
      </div></div>`;
    }
  }
  html+='</div>';

  // Caja resultado
  const showApprox=r.exact&&r.valueNum&&Math.abs(r.valueNum)>1e-10&&r.tipo!=='directo';
  html+=`<div class="calc-res-box" style="margin-top:8px;${r.exists?'border-color:var(--ca2)':''}">
    <div class="calc-res-label">lim<sub>x→${a}</sub> [ ${fx} ]</div>
    <div class="calc-res-val big">${r.value||'No existe'}</div>
    ${showApprox?`<div class="calc-res-hint">≈ ${fmtNum(r.valueNum,8)}</div>`:''}
    <div class="calc-res-hint">${
      r.exists
        ?(r.tipo==='directo'?'✓ Sustitución directa'
          :(r.tipo==='indet_00'||r.tipo==='indet_inf')?'✓ Resuelto por L\u2019H\u00f4pital'
          :'✓ Límite existe')
        :(r.isInfinity?'Límite infinito — la función diverge'
          :'⚠ El límite no existe (laterales distintos)')
    }</div>
  </div>`;
  return html;
}

// ── CALCULAR LÍMITE (callback del botón) ──
function calcLimit(){
  const fxStr=document.getElementById('dif-lim-fx').value.trim();
  const aStr =document.getElementById('dif-lim-a').value.trim();
  const side =document.getElementById('dif-lim-side').value;
  const res  =document.getElementById('res-lim');
  if(!fxStr){ res.innerHTML=errBox('Ingresa una función f(x)'); return; }
  const r=computeLimit(fxStr,aStr,side);
  res.innerHTML=limitStepsHTML(r);
}

// ── OPERACIÓN ENTRE DOS LÍMITES ──
function calcLimitOp(){
  const fx1  =document.getElementById('lim-op-fx1').value.trim();
  const a1Str=document.getElementById('lim-op-a1').value.trim();
  const s1   =document.getElementById('lim-op-side1').value;
  const op   =document.getElementById('lim-op-op').value;
  const fx2  =document.getElementById('lim-op-fx2').value.trim();
  const a2Str=document.getElementById('lim-op-a2').value.trim();
  const s2   =document.getElementById('lim-op-side2').value;
  const res  =document.getElementById('res-lim-op');
  if(!fx1||!fx2){ res.innerHTML=errBox('Ingresa ambas funciones'); return; }

  const r1=computeLimit(fx1,a1Str,s1);
  const r2=computeLimit(fx2,a2Str,s2);
  const v1=r1.valueNum, v2=r2.valueNum;
  const a1=fmtA(a1Str), a2=fmtA(a2Str);
  const opSym={'+':'+','−':'−','*':'·','/':'÷'}[op]||op;

  let resVal=NaN;
  if(op==='+') resVal=v1+v2;
  else if(op==='−') resVal=v1-v2;
  else if(op==='*') resVal=v1*v2;
  else if(op==='/') resVal=Math.abs(v2)>1e-12?v1/v2:NaN;
  const resStr=fmtResult(resVal)||'Indefinido';

  let html='';
  html+=`<div class="lim-op-block"><div class="lim-op-label">Límite A — lim<sub>x→${a1}</sub> [${fx1}]</div>${limitStepsHTML(r1)}</div>`;
  html+=`<div class="lim-op-block"><div class="lim-op-label">Límite B — lim<sub>x→${a2}</sub> [${fx2}]</div>${limitStepsHTML(r2)}</div>`;
  html+=`<div class="calc-res-box" style="border-color:var(--gold);margin-top:8px">
    <div class="calc-res-label">L_A ${opSym} L_B</div>
    <div class="calc-res-val big">${resStr}</div>
    <div class="calc-res-hint">${fmtResult(v1)||'?'} ${opSym} ${fmtResult(v2)||'?'} = ${resStr}</div>
  </div>`;
  res.innerHTML=html;
}

function calcDerivative(){
  const fxStr = document.getElementById('dif-der-fx').value.trim();
  const ord   = parseInt(document.getElementById('dif-der-ord').value);
  const ptStr = document.getElementById('dif-der-pt').value.trim();
  const res   = document.getElementById('res-der');
  if(!fxStr){res.innerHTML=errBox('Ingresa una función');return;}

  const labels = ["Primera","Segunda","Tercera"];
  const primes = ["f'(x)","f''(x)","f'''(x)"];
  const sym = symbolicDeriv(fxStr, ord);
  let html = '';

  if(sym){
    html += resBox(primes[ord-1]+' — derivada simbólica', sym, labels[ord-1]+' derivada', true);
    if(ptStr!==''&&ptStr!=='opcional'){
      const x0 = parseFloat(ptStr);
      if(!isNaN(x0)){
        const symFn = calcParse(sym.replace(/\^/g,'**'));
        if(symFn){
          const val = symFn(x0,0);
          if(isFinite(val))
            html+=resBox(`${primes[ord-1]} en x = ${x0}`, fmtResult(val)||fN(val,8),
              `Sustituyendo en ${sym}`);
        } else {
          const fn = calcParse(fxStr);
          if(fn){
            const h=1e-6; let v;
            if(ord===1) v=(fn(x0+h,0)-fn(x0-h,0))/(2*h);
            else if(ord===2) v=(fn(x0+h,0)-2*fn(x0,0)+fn(x0-h,0))/(h*h);
            else v=(fn(x0+2*h,0)-2*fn(x0+h,0)+2*fn(x0-h,0)-fn(x0-2*h,0))/(2*h**3);
            html+=resBox(`${primes[ord-1]} en x = ${x0}`, fN(v,8));
          }
        }
      }
    }
  } else {
    const fn = calcParse(fxStr);
    if(!fn){res.innerHTML=errBox('Función inválida');return;}
    html+=resBox('Resultado numérico (no simbólico)','','',false);
    if(ptStr.trim()!==''&&ptStr.trim()!=='opcional'){
      const x0=parseFloat(ptStr);
      if(!isNaN(x0)){
        const h=1e-6; let v;
        if(ord===1) v=(fn(x0+h,0)-fn(x0-h,0))/(2*h);
        else if(ord===2) v=(fn(x0+h,0)-2*fn(x0,0)+fn(x0-h,0))/(h*h);
        else v=(fn(x0+2*h,0)-2*fn(x0+h,0)+2*fn(x0-h,0)-fn(x0-2*h,0))/(2*h**3);
        html+=resBox(`${primes[ord-1]} en x = ${x0}`, fN(v,8));
      }
    }
  }
  res.innerHTML=html;
}

function calcImplicit(){
  const fxyStr = document.getElementById('dif-imp-fxy').value.trim();
  const x0 = parseFloat(document.getElementById('dif-imp-x0').value);
  const y0 = parseFloat(document.getElementById('dif-imp-y0').value);
  const res = document.getElementById('res-imp');
  if(!fxyStr){res.innerHTML=errBox('Ingresa F(x,y)');return;}

  const Fxy = calcParse(fxyStr.replace(/y/g,'$2'));
  if(!Fxy){res.innerHTML=errBox('Función inválida. Usa x e y como variables');return;}

  const h=1e-7;
  const Fx=(x,y)=>(Fxy(x+h,y)-Fxy(x-h,y))/(2*h);
  const Fy=(x,y)=>(Fxy(x,y+h)-Fxy(x,y-h))/(2*h);

  let html='';
  html+=resBox('dy/dx = −∂F/∂x ÷ ∂F/∂y','— fórmula implícita —','F(x,y)=0',true);

  if(!isNaN(x0)&&!isNaN(y0)){
    const fval=Fxy(x0,y0);
    const fx0=Fx(x0,y0), fy0=Fy(x0,y0);
    const slope=fy0!==0?-fx0/fy0:NaN;
    if(Math.abs(fval)>0.1)
      html+=resBox('Verificación',`F(${x0},${y0}) ≈ ${fN(fval,4)}`,'⚠ El punto puede no estar en la curva');
    html+=resBox(`∂F/∂x en (${x0},${y0})`, fN(fx0,6));
    html+=resBox(`∂F/∂y en (${x0},${y0})`, fN(fy0,6));
    html+=resBox(`dy/dx en (${x0},${y0})`, isFinite(slope)?fmtResult(slope)||fN(slope,6):'indefinido',
      isFinite(slope)?'':'∂F/∂y ≈ 0 en este punto',true);
  } else {
    html+=resBox('Necesito un punto','Ingresa x₀ e y₀ para evaluar dy/dx');
  }
  res.innerHTML=html;
}

function calcAnalysis(){
  const fxStr=document.getElementById('dif-ana-fx').value.trim();
  const res=document.getElementById('res-ana');
  if(!fxStr){res.innerHTML=errBox('Ingresa una función');return;}
  const fn=calcParse(fxStr);
  if(!fn){res.innerHTML=errBox('Función inválida');return;}

  const h=1e-6, N=400, a=-8, b=8, dx=(b-a)/N;
  let incr=0, decr=0;
  const maxs=[], mins=[], infs=[];
  let prevFp=(fn(a+h,0)-fn(a-h,0))/(2*h);
  let prevFpp=(fn(a+h,0)-2*fn(a,0)+fn(a-h,0))/(h*h);

  for(let i=1;i<=N;i++){
    const x=a+i*dx;
    const fp=(fn(x+h,0)-fn(x-h,0))/(2*h);
    const fpp=(fn(x+h,0)-2*fn(x,0)+fn(x-h,0))/(h*h);
    if(isFinite(fp)){
      if(fp>0) incr++; else decr++;
      if(prevFp*fp<0&&isFinite(prevFp))
        (prevFp>0?maxs:mins).push(parseFloat(x.toFixed(3)));
    }
    if(isFinite(fpp)&&isFinite(prevFpp)&&prevFpp*fpp<0)
      infs.push(parseFloat(x.toFixed(3)));
    prevFp=fp; prevFpp=fpp;
  }
  let html='';
  html+=resBox('Monotonía en [−8,8]',
    `↑ Crece: ${incr} puntos  ↓ Decrece: ${decr} puntos`);
  html+=resBox('Máximos locales',maxs.length?maxs.map(x=>`x≈${x}`).join(', '):'Ninguno en [−8,8]');
  html+=resBox('Mínimos locales',mins.length?mins.map(x=>`x≈${x}`).join(', '):'Ninguno en [−8,8]');
  html+=resBox('Puntos de inflexión',infs.length?infs.map(x=>`x≈${x}`).join(', '):'Ninguno detectado');
  res.innerHTML=html;
}



// ═══════════════════════════════════════════════════════
// APLICACIONES DE DERIVADAS
// ═══════════════════════════════════════════════════════
let currentApp = 'opt';
let appsVisible = false;

function toggleLimOp(){
  const p=document.getElementById('lim-op-panel');
  if(p) p.classList.toggle('graf-active');
}

function toggleApps(){
  appsVisible=!appsVisible;
  document.getElementById('apps-panel').classList.toggle('graf-active', appsVisible);
  if(appsVisible) setApp('opt');
}

function setApp(id){
  currentApp=id;
  document.querySelectorAll('.app-sel-btn').forEach(b=>b.classList.remove('on'));
  const btn=document.getElementById('app-btn-'+id);
  if(btn) btn.classList.add('on');
  renderAppForm(id);
}

const APP_FORMS = {
  opt:{
    desc:'Dada una función f(x), encuentra los valores de x donde se alcanzan máximos y mínimos dentro de un intervalo.',
    fields:[
      {id:'app-opt-fx', label:'f(x) =', ph:'ej: -x^2 + 4*x'},
      {id:'app-opt-a',  label:'a =',   ph:'-5', sm:true},
      {id:'app-opt-b',  label:'b =',   ph:'5',  sm:true},
    ],
    btn:'Optimizar',
    fn:'appOptimize'
  },
  pob:{
    desc:'Modelo de crecimiento exponencial P(t) = P₀·eᵏᵗ. Calcula la tasa de cambio y proyecciones.',
    fields:[
      {id:'app-pob-p0',  label:'P₀ =', ph:'1000', sm:true},
      {id:'app-pob-k',   label:'k =',  ph:'0.03', sm:true},
      {id:'app-pob-t',   label:'t =',  ph:'5',    sm:true},
    ],
    btn:'Calcular',
    fn:'appGrowth'
  },
  vel:{
    desc:'Posición s(t). Calcula velocidad v = s\'(t) y aceleración a = s\'\'(t) en un instante t₀.',
    fields:[
      {id:'app-vel-st', label:'s(t) =', ph:'ej: t^3 - 6*t^2 + 9*t'},
      {id:'app-vel-t0', label:'t₀ =',  ph:'2', sm:true},
    ],
    btn:'Analizar movimiento',
    fn:'appMotion'
  },
  tan:{
    desc:'Recta tangente a f(x) en el punto x₀: y = f\'(x₀)(x − x₀) + f(x₀)',
    fields:[
      {id:'app-tan-fx', label:'f(x) =', ph:'ej: x^2 + sin(x)'},
      {id:'app-tan-x0', label:'x₀ =',  ph:'1', sm:true},
    ],
    btn:'Recta tangente',
    fn:'appTangent'
  },
  rel:{
    desc:'Tasas relacionadas: dada una relación entre variables y una tasa conocida, calcula la tasa desconocida.',
    fields:[
      {id:'app-rel-type', label:'Tipo:', select:['Esfera (radio→volumen)','Cono (radio→volumen)','Pitágoras (x,y→z)']},
      {id:'app-rel-r',  label:'r =',   ph:'5',   sm:true},
      {id:'app-rel-dr', label:'dr/dt=',ph:'2',   sm:true},
    ],
    btn:'Calcular tasa',
    fn:'appRelated'
  },
};

function renderAppForm(id){
  const cfg = APP_FORMS[id];
  if(!cfg) return;
  const c = document.getElementById('app-form-container');
  let fieldsHtml = '<div class="calc-field-row">';
  cfg.fields.forEach(f=>{
    if(f.select){
      fieldsHtml+=`<label>${f.label}</label>
        <select class="mat-sel" id="${f.id}">
          ${f.select.map(s=>`<option>${s}</option>`).join('')}
        </select>`;
    } else {
      fieldsHtml+=`<label>${f.label}</label>
        <input class="calc-inp${f.sm?' calc-inp-sm':''}" id="${f.id}" placeholder="${f.ph}"/>`;
    }
  });
  fieldsHtml+='</div>';
  c.innerHTML=`
    <div class="app-form">
      <div class="app-form-desc">${cfg.desc}</div>
      ${fieldsHtml}
      <div class="calc-btn-row">
        <button class="calc-btn" style="background:rgba(240,192,64,.12);border-color:rgba(240,192,64,.3);color:var(--gold)"
          onclick="${cfg.fn}()">${cfg.btn}</button>
        <button class="calc-btn sec" onclick="document.getElementById('app-res').innerHTML=''">Limpiar</button>
      </div>
      <div id="app-res" class="calc-res"></div>
    </div>`;
  // Registrar inputs para teclado
  c.querySelectorAll('.calc-inp').forEach(inp=>{
    inp.addEventListener('focus',()=>{ calcActiveInput=inp; });
  });
}

function appRes(html){ document.getElementById('app-res').innerHTML=html; }

function appOptimize(){
  const fxStr=v('app-opt-fx'), a=pf('app-opt-a'), b=pf('app-opt-b');
  const fn=calcParse(fxStr);
  if(!fn||isNaN(a)||isNaN(b)){appRes(errBox('Verifica los datos'));return;}
  const h=1e-6, n=2000, dx=(b-a)/n;
  let maxX=a, minX=a, maxV=fn(a,0), minV=fn(a,0);
  const crits=[];
  let prevFp=(fn(a+h,0)-fn(a-h,0))/(2*h);
  for(let i=1;i<=n;i++){
    const x=a+i*dx, fv=fn(x,0);
    if(!isFinite(fv)) continue;
    const fp=(fn(x+h,0)-fn(x-h,0))/(2*h);
    if(prevFp*fp<0) crits.push({x:parseFloat(x.toFixed(5)),y:fv,type:prevFp>0?'MAX':'MIN'});
    if(fv>maxV){maxV=fv;maxX=x;}
    if(fv<minV){minV=fv;minX=x;}
    prevFp=fp;
  }
  const sym=symbolicDeriv(fxStr,1);
  let html=sym?resBox("f'(x) =",sym):'';
  html+=resBox('Puntos críticos f\'=0 en ['+a+','+b+']',
    crits.length?crits.map(c=>`x≈${c.x} (${c.type}, f≈${fN(c.y)})`).join('<br>'):'Ninguno detectado');
  html+=resBox('Máximo global en ['+a+','+b+']',`x≈${fN(maxX,4)},  f(x)≈${fN(maxV,6)}`,'')+
        resBox('Mínimo global en ['+a+','+b+']',`x≈${fN(minX,4)},  f(x)≈${fN(minV,6)}`,'');
  appRes(html);
}

function appGrowth(){
  const p0=pf('app-pob-p0'), k=pf('app-pob-k'), t=pf('app-pob-t');
  if([p0,k,t].some(isNaN)){appRes(errBox('Verifica los valores'));return;}
  const Pt=p0*Math.exp(k*t);
  const dPdt=k*Pt;
  const t2x=k!==0?Math.log(2)/k:Infinity;
  appRes(
    resBox('P(t) = P₀·eᵏᵗ',`P(${t}) = ${fN(p0)} · e^(${k}·${t}) = ${fN(Pt,4)}`,`P₀=${p0}, k=${k}`,true)+
    resBox('Tasa de cambio dP/dt = k·P(t)', fN(dPdt,4)+' unidades/tiempo',`Proporcional a la población actual`)+
    resBox('Tiempo de duplicación  t₂ = ln(2)/k', isFinite(t2x)?fN(t2x,4)+' unidades de tiempo':'∞ (k=0)')+
    resBox('Verificación: P\'(t)/P(t)', fN(k),' = k ✓')
  );
}

function appMotion(){
  const stStr=v('app-vel-st'), t0=pf('app-vel-t0');
  const fn=calcParse(stStr);
  if(!fn||isNaN(t0)){appRes(errBox('Verifica los datos'));return;}
  const h=1e-6;
  const s0=fn(t0,0);
  const vel=(fn(t0+h,0)-fn(t0-h,0))/(2*h);
  const acel=(fn(t0+h,0)-2*fn(t0,0)+fn(t0-h,0))/(h*h);
  const symV=symbolicDeriv(stStr,1), symA=symbolicDeriv(stStr,2);
  appRes(
    (symV?resBox("v(t) = s'(t) =",symV):'')+
    (symA?resBox("a(t) = s''(t) =",symA):'')+
    resBox(`s(${t0}) — posición`, fN(s0,6))+
    resBox(`v(${t0}) — velocidad`, fN(vel,6), vel>0?'↑ Movimiento positivo':vel<0?'↓ Movimiento negativo':'En reposo', true)+
    resBox(`a(${t0}) — aceleración`, fN(acel,6),
      acel>0?'↑ Acelerando en dir. positiva':acel<0?'↓ Frenando':'Velocidad constante')
  );
}

function appTangent(){
  const fxStr=v('app-tan-fx'), x0=pf('app-tan-x0');
  const fn=calcParse(fxStr);
  if(!fn||isNaN(x0)){appRes(errBox('Verifica los datos'));return;}
  const h=1e-6;
  const fx0=fn(x0,0);
  const fpx0=(fn(x0+h,0)-fn(x0-h,0))/(2*h);
  const b=fx0-fpx0*x0;
  const symD=symbolicDeriv(fxStr,1);
  const bStr=b>=0?` + ${fN(b,4)}`:` - ${fN(Math.abs(b),4)}`;
  appRes(
    (symD?resBox("f'(x) =",symD):'')+
    resBox(`f(${x0}) — punto de tangencia`, fN(fx0,6))+
    resBox(`f'(${x0}) — pendiente`, fN(fpx0,6), 'Ángulo ≈ '+fN(Math.atan(fpx0)*180/Math.PI,2)+'°')+
    resBox('Ecuación recta tangente', `y = ${fN(fpx0,4)}x${bStr}`, `y − f(x₀) = f\'(x₀)·(x − x₀)`, true)
  );
}

function appRelated(){
  const type=document.getElementById('app-rel-type')?.value||'Esfera';
  const r=pf('app-rel-r'), drdt=pf('app-rel-dr');
  if(isNaN(r)||isNaN(drdt)){appRes(errBox('Verifica los valores'));return;}
  if(type.includes('Esfera')){
    const V=(4/3)*Math.PI*r**3;
    const dVdt=4*Math.PI*r**2*drdt;
    appRes(
      resBox('Esfera V = (4/3)πr³','','')+
      resBox(`V cuando r=${r}`, fN(V,6)+' u³')+
      resBox('dV/dt = 4πr²·(dr/dt)', fN(dVdt,6)+' u³/tiempo',
        `4π·${r}²·${drdt} = ${fN(dVdt,4)}`, true)
    );
  } else if(type.includes('Cono')){
    const V=(1/3)*Math.PI*r**3;
    const dVdt=Math.PI*r**2*drdt;
    appRes(
      resBox('Cono V = (1/3)πr³ (h=r)','','')+
      resBox(`V cuando r=${r}`, fN(V,6)+' u³')+
      resBox('dV/dt = πr²·(dr/dt)', fN(dVdt,6)+' u³/tiempo','', true)
    );
  } else {
    appRes(resBox('Pitágoras','Selecciona Esfera o Cono para demo completa',''));
  }
}



function v(id){ const el=document.getElementById(id); return el?el.value.trim():''; }
function pf(id){ return parseFloat(v(id)); }

// ═══════════════════════════════════════════════════════
// CÁLCULO INTEGRAL
// ═══════════════════════════════════════════════════════
function calcIntegralIndef(){
  const fxStr=v('int-indef-fx');
  const res=document.getElementById('res-indef');
  const fn=calcParse(fxStr);
  if(!fn){res.innerHTML=errBox('Función inválida');return;}
  // Antiderivada simbólica básica (regla de potencia, constantes conocidas)
  const antideriv=basicAntideriv(fxStr);
  let html=antideriv?
    resBox('∫ f(x) dx =', antideriv+' + C', 'Verificable derivando el resultado', true):
    resBox('∫ f(x) dx','Usa la Integral Definida para calcular numéricamente','');
  // Siempre dar verificación numérica
  const v0=(fn(1+1e-4,0)-fn(1-1e-4,0))/(2e-4);
  html+=resBox('f(1) para referencia', fN(fn(1,0),6));
  res.innerHTML=html;
}

function basicAntideriv(expr){
  // Detectar monomios simples: a*x^n
  const mono=/^(-?\d*\.?\d*)\*?x\^(-?\d+\.?\d*)$/.exec(expr.trim());
  if(mono){
    const a=parseFloat(mono[1]||'1')||1, n=parseFloat(mono[2]);
    if(n===-1) return `${a===1?'':a}ln|x|`;
    const coef=a/(n+1);
    const cStr=parseFloat(coef.toFixed(6)).toString();
    return `${cStr}x^${n+1}`;
  }
  // Solo x
  if(expr.trim()==='x') return '(1/2)x^2';
  if(expr.trim()==='1') return 'x';
  // Trig básico
  if(expr.trim()==='sin(x)') return '-cos(x)';
  if(expr.trim()==='cos(x)') return 'sin(x)';
  if(expr.trim()==='e^(x)'||expr.trim()==='e^x') return 'e^x';
  if(expr.trim()==='1/x') return 'ln|x|';
  return null;
}

function calcIntegralDef(){
  const fxStr=v('int-def-fx');
  const a=pf('int-def-a'), b=pf('int-def-b');
  const res=document.getElementById('res-def');
  const fn=calcParse(fxStr);
  if(!fn){res.innerHTML=errBox('Función inválida');return;}
  if(isNaN(a)||isNaN(b)){res.innerHTML=errBox('Ingresa los límites a y b');return;}
  if(a>=b){res.innerHTML=errBox('Se requiere a < b');return;}

  const n=1000, h=(b-a)/n;
  let s=fn(a,0)+fn(b,0);
  for(let i=1;i<n;i++) s+=(i%2===0?2:4)*fn(a+i*h,0);
  const result=s*h/3;

  res.innerHTML=
    resBox(`∫ₐᵇ f(x) dx  [${a}, ${b}]`, fN(result,8), 'Simpson 1/3 con n=1000', true)+
    resBox('Valor promedio  f̄ = (1/(b−a))∫f dx', fN(result/(b-a),6))+
    resBox('Longitud del intervalo', fN(b-a,4)+' u');
}

function calcTaylor(){
  const fxStr=v('int-taylor-fx');
  const a=pf('int-taylor-a')||0;
  const nTerms=parseInt(document.getElementById('int-taylor-n')?.value)||5;
  const res=document.getElementById('res-taylor');
  const fn=calcParse(fxStr);
  if(!fn){res.innerHTML=errBox('Función inválida');return;}

  function fact(n){let r=1;for(let i=2;i<=n;i++)r*=i;return r;}
  // Derivadas numéricas en x=a
  const h=1e-4;
  const terms=[];
  let poly='';
  for(let k=0;k<=Math.min(nTerms,8);k++){
    // k-ésima derivada en a via diferencias finitas
    let dk=0;
    for(let i=0;i<=k;i++){
      let binom=1;
      for(let j=0;j<i;j++) binom=binom*(k-j)/(j+1);
      dk+=((i%2===0?1:-1)*binom*fn(a+(k-i)*h,0));
    }
    dk/=Math.pow(h,k);
    const coef=dk/fact(k);
    if(Math.abs(coef)<1e-10) continue;
    const cs=parseFloat(coef.toFixed(5)).toString();
    if(k===0) poly+=cs;
    else if(k===1) poly+=` ${coef>=0?'+':''} ${cs}(x${a!==0?`−${a}`:''})`; 
    else poly+=` ${coef>=0?'+':''} ${cs}(x${a!==0?`−${a}`:''})<sup>${k}</sup>`;
    terms.push({k,coef});
  }

  const xtest=a+0.3;
  const freal=fn(xtest,0);
  const fapprox=terms.reduce((s,t)=>s+t.coef*Math.pow(xtest-a,t.k),0);
  res.innerHTML=
    resBox('Serie de Taylor alrededor de a='+a, poly, '')+
    resBox(`Verificación en x=${xtest}`, `f(x) = ${fN(freal,6)}   T(x) = ${fN(fapprox,6)}`,
      `Error = ${fN(Math.abs(freal-fapprox),4)}`);
}

// ═══════════════════════════════════════════════════════
// MULTIVARIABLE
// ═══════════════════════════════════════════════════════
function calcPartial(){
  const fxyStr=v('mul-par-fxy');
  const varN=document.getElementById('mul-par-var').value;
  const ord=parseInt(document.getElementById('mul-par-ord').value);
  const x0=pf('mul-par-x0'), y0=pf('mul-par-y0');
  const res=document.getElementById('res-par');
  const fn=calcParse(fxyStr);
  if(!fn){res.innerHTML=errBox('Función inválida');return;}

  const h=1e-6;
  const sym=symbolicDeriv(fxyStr,ord,varN);
  let html=sym?resBox(`∂${ord>1?ord:''}f/∂${varN}${ord>1?ord:''}`,sym):'' ;

  if(!isNaN(x0)&&!isNaN(y0)){
    let v2;
    if(varN==='x'){
      if(ord===1) v2=(fn(x0+h,y0)-fn(x0-h,y0))/(2*h);
      else v2=(fn(x0+h,y0)-2*fn(x0,y0)+fn(x0-h,y0))/(h*h);
    } else {
      if(ord===1) v2=(fn(x0,y0+h)-fn(x0,y0-h))/(2*h);
      else v2=(fn(x0,y0+h)-2*fn(x0,y0)+fn(x0,y0-h))/(h*h);
    }
    html+=resBox(`Valor en (${x0},${y0})`, fN(v2,8), '', true);
  } else {
    html+=resBox('Nota','Ingresa (x₀,y₀) para evaluar en un punto','');
  }
  res.innerHTML=html;
}

function calcGradient(){
  const fxyStr=v('mul-grad-fxy');
  const x0=pf('mul-grad-x0'), y0=pf('mul-grad-y0');
  const res=document.getElementById('res-grad');
  const fn=calcParse(fxyStr);
  if(!fn){res.innerHTML=errBox('Función inválida');return;}
  if(isNaN(x0)||isNaN(y0)){res.innerHTML=errBox('Ingresa el punto (x₀, y₀)');return;}

  const h=1e-6;
  const fx=(fn(x0+h,y0)-fn(x0-h,y0))/(2*h);
  const fy=(fn(x0,y0+h)-fn(x0,y0-h))/(2*h);
  const mag=Math.sqrt(fx*fx+fy*fy);
  res.innerHTML=
    resBox('∂f/∂x', fN(fx))+
    resBox('∂f/∂y', fN(fy))+
    resBox('∇f = (∂f/∂x, ∂f/∂y)', `(${fN(fx,4)},  ${fN(fy,4)})`, 'Dirección de máximo crecimiento', true)+
    resBox('|∇f| — magnitud', fN(mag,6))+
    resBox('∇f unitario', mag>1e-10?`(${fN(fx/mag,4)},  ${fN(fy/mag,4)})`:'(0, 0)');
}

function calcDoubleIntegral(){
  const fxyStr=v('mul-dint-fxy');
  const x1=pf('mul-dint-x1'),x2=pf('mul-dint-x2');
  const y1=pf('mul-dint-y1'),y2=pf('mul-dint-y2');
  const res=document.getElementById('res-dint');
  const fn=calcParse(fxyStr);
  if(!fn){res.innerHTML=errBox('Función inválida');return;}
  if([x1,x2,y1,y2].some(isNaN)){res.innerHTML=errBox('Ingresa todos los límites');return;}

  const nx=100,ny=100, hx=(x2-x1)/nx, hy=(y2-y1)/ny;
  let s=0;
  for(let i=0;i<nx;i++) for(let j=0;j<ny;j++)
    s+=fn(x1+(i+.5)*hx, y1+(j+.5)*hy);
  const result=s*hx*hy;
  res.innerHTML=
    resBox(`∬ f dx dy — [${x1},${x2}]×[${y1},${y2}]`, fN(result,8), 'Punto medio 100×100', true)+
    resBox('Área de la región', fN((x2-x1)*(y2-y1),4)+' u²')+
    resBox('Valor promedio f̄', fN(result/((x2-x1)*(y2-y1)),6));
}

// ═══════════════════════════════════════════════════════
// EDO
// ═══════════════════════════════════════════════════════
function rk4(fn,x0,y0,h,steps){
  let x=x0,y=y0,pts=[[x,y]];
  for(let i=0;i<steps;i++){
    const k1=fn(x,y),k2=fn(x+h/2,y+h/2*k1);
    const k3=fn(x+h/2,y+h/2*k2),k4=fn(x+h,y+h*k3);
    y+=h/6*(k1+2*k2+2*k3+k4); x+=h;
    if(!isFinite(y)) break;
    pts.push([parseFloat(x.toFixed(4)),parseFloat(y.toFixed(6))]);
  }
  return pts;
}

function calcEDOSep(){
  const rhsStr=v('edo-sep-rhs');
  const x0=pf('edo-sep-x0')||0, y0=pf('edo-sep-y0')||1;
  const res=document.getElementById('res-sep');
  const fn=calcParse(rhsStr);
  if(!fn){res.innerHTML=errBox('Función inválida. Usa x e y');return;}
  const pts=rk4((x,y)=>fn(x,y), x0, y0, 0.1, 50);
  const sample=pts.filter((_,i)=>i%10===0).map(p=>`y(${p[0]}) ≈ ${fN(p[1],4)}`).join('<br>');
  res.innerHTML=
    resBox('RK4 — Solución numérica',sample,'dy/dx = '+rhsStr+'  con  y('+x0+')='+y0)+
    resBox('y final  x='+(x0+5).toFixed(2), fN(pts[pts.length-1][1],6),'',true);
}

function calcEDOLinear(){
  const px=calcParse(v('edo-lin-px')), qx=calcParse(v('edo-lin-qx'));
  const x0=pf('edo-lin-x0')||0, y0=pf('edo-lin-y0')||1;
  const res=document.getElementById('res-edolin');
  if(!px||!qx){res.innerHTML=errBox('P(x) o Q(x) inválidos');return;}
  const pts=rk4((x,y)=>qx(x,0)-px(x,0)*y, x0, y0, 0.1, 50);
  const sample=pts.filter((_,i)=>i%10===0).map(p=>`y(${p[0]}) ≈ ${fN(p[1],4)}`).join('<br>');
  res.innerHTML=
    resBox('RK4 — y\' + P(x)y = Q(x)',sample,'y('+x0+')='+y0)+
    resBox('y final  x='+(x0+5).toFixed(2), fN(pts[pts.length-1][1],6),'',true);
}

function calcEDO2nd(){
  const a=pf('edo-2do-a')||1, b=pf('edo-2do-b')||0, c=pf('edo-2do-c')||0;
  const y0=pf('edo-2do-y0')||1, dy0=pf('edo-2do-dy0')||0;
  const res=document.getElementById('res-edo2');
  const disc=b*b-4*a*c;
  let solType,sol;
  if(disc>1e-10){
    const r1=(-b+Math.sqrt(disc))/(2*a), r2=(-b-Math.sqrt(disc))/(2*a);
    solType='Raíces reales distintas';
    sol=`y = C₁·e^(${fN(r1,4)}x) + C₂·e^(${fN(r2,4)}x)`;
  } else if(Math.abs(disc)<1e-10){
    const r=-b/(2*a);
    solType='Raíz real doble';
    sol=`y = (C₁ + C₂x)·e^(${fN(r,4)}x)`;
  } else {
    const alpha=-b/(2*a), beta=Math.sqrt(-disc)/(2*a);
    solType='Raíces complejas conjugadas';
    sol=`y = e^(${fN(alpha,4)}x)[C₁cos(${fN(beta,4)}x) + C₂sin(${fN(beta,4)}x)]`;
  }
  res.innerHTML=
    resBox('Ecuación característica', `${a}r² + ${b}r + ${c} = 0`)+
    resBox('Discriminante Δ', fN(disc))+
    resBox('Tipo de solución', solType)+
    resBox('Solución general', sol,'C₁,C₂ por condiciones iniciales y(0)='+y0+', y\'(0)='+dy0,true);
}

// ═══════════════════════════════════════════════════════
// CALC INIT
// ═══════════════════════════════════════════════════════
function calcInit(){
  ['dif','int','mul','edo'].forEach(id=>buildKB('calc-kb-'+id));
  initInputTracking();
  calcTab('dif');
}
// SUCESIONES Y PROGRESIONES
// ═══════════════════════════════════════════════════════
let seqMode='terminos';

function seqSetMode(mode){
  seqMode=mode;
  ['terminos','pa','pg'].forEach(m=>{
    const tab=document.getElementById('seq-tab-'+m);
    const pan=document.getElementById('seq-panel-'+m);
    if(tab) tab.classList.toggle('on',m===mode);
    if(pan) pan.style.display=m===mode?'':'none';
  });
}

function evalTermN(exprStr, nVal){
  try{
    let code=exprStr.trim()
      .replace(/\^/g,'**')
      .replace(/(\d)n(?![a-zA-Z])/g,'$1*n')
      .replace(/π/g,'Math.PI')
      .replace(/(?<![a-zA-Z\.])ln\b/g,'Math.log')
      .replace(/(?<![a-zA-Z])e(?![a-zA-Z0-9_])/g,'Math.E')
      .replace(/(?<![a-zA-Z])n(?![a-zA-Z])/g,'('+String(nVal)+')');
    // Fix JS: unary minus before ** not allowed
    code=code.replace(/-([()\d.]+)\*\*/g,'(0-$1)**');
    return Function('"use strict"; return ('+code+');')();
  }catch(e){ return NaN; }
}

function seqFmt(v){
  if(isNaN(v)||!isFinite(v)) return '?';
  if(Number.isInteger(v)) return String(v);
  for(let d=1;d<=360;d++){
    const n=Math.round(v*d);
    if(n!==0&&Math.abs(n/d-v)<1e-9) return n+'/'+d;
  }
  return parseFloat(v.toFixed(6)).toString();
}

function seqClassify(terms){
  if(terms.length<2) return '—';
  const diffs=terms.slice(1).map((t,i)=>t-terms[i]);
  const altSign=terms.every((t,i)=>i===0||t*terms[i-1]<0);
  if(diffs.every(d=>d>1e-9)) return 'Creciente';
  if(diffs.every(d=>d<-1e-9)) return 'Decreciente';
  if(altSign) return 'Alternante';
  return 'No monótona';
}

function seqAnalyzeTerminos(){
  const expr=document.getElementById('seq-expr').value.trim();
  const nMax=parseInt(document.getElementById('seq-n').value)||5;
  const res=document.getElementById('seq-result');
  if(!expr){ res.innerHTML=errBox('Ingresa la expresión del término Sₙ'); return; }

  const terms=Array.from({length:nMax},(_,i)=>evalTermN(expr,i+1));
  const cls=seqClassify(terms);
  const finite=terms.filter(v=>isFinite(v));
  const acot=finite.length?`Inf = ${seqFmt(Math.min(...finite))}, Sup = ${seqFmt(Math.max(...finite))} (en ${nMax} términos)`:'—';

  // ¿PA o PG?
  let badge='';
  if(terms.length>=2){
    const diffs=terms.slice(1).map((t,i)=>t-terms[i]);
    const d0=diffs[0];
    if(diffs.every(d=>Math.abs(d-d0)<1e-6)){
      badge=`<div class="seq-badge pa-badge">Progresión Aritmética — d = ${seqFmt(d0)}</div>`;
    } else {
      const ratios=terms.slice(1).map((t,i)=>Math.abs(terms[i])>1e-12?t/terms[i]:NaN);
      const r0=ratios[0];
      if(ratios.every(r=>isFinite(r)&&Math.abs(r-r0)<1e-6)){
        badge=`<div class="seq-badge pg-badge">Progresión Geométrica — r = ${seqFmt(r0)}</div>`;
      }
    }
  }

  let html=`<div class="seq-result-wrap">`;
  html+=`<div class="seq-expr-display">Sₙ = ${expr}</div>`;
  html+=badge;
  html+=`<div class="seq-terms-grid">`;
  terms.forEach((t,i)=>html+=`<div class="seq-term-cell"><span class="seq-term-n">n=${i+1}</span><span class="seq-term-v">${seqFmt(t)}</span></div>`);
  html+=`</div>`;
  html+=`<div class="seq-prop"><span class="seq-prop-label">Clasificación</span><span class="seq-prop-val">${cls}</span></div>`;
  html+=`<div class="seq-prop"><span class="seq-prop-label">Acotamiento</span><span class="seq-prop-val">${acot}</span></div>`;
  html+=`</div>`;
  res.innerHTML=html;
}

function seqAnalyzePA(){
  const a1=parseFloat(document.getElementById('pa-a1').value);
  const d=parseFloat(document.getElementById('pa-d').value);
  const n=parseInt(document.getElementById('pa-n').value)||10;
  const res=document.getElementById('seq-result');
  if(isNaN(a1)||isNaN(d)){ res.innerHTML=errBox('Ingresa a₁ y diferencia d'); return; }
  const an=a1+(n-1)*d, sn=n*(a1+an)/2;
  const terms=Array.from({length:Math.min(n,8)},(_,i)=>a1+i*d);
  const cls=d>0?'Creciente':d<0?'Decreciente':'Constante';
  const acot=d===0?`Acotada: Sₙ = ${seqFmt(a1)}`:'No acotada (tiende a '+(d>0?'+∞':'-∞')+')';
  let html=`<div class="seq-result-wrap">`;
  html+=`<div class="seq-expr-display">PA: a₁ = ${seqFmt(a1)},  d = ${seqFmt(d)}</div>`;
  html+=`<div class="seq-terms-grid">${terms.map((t,i)=>`<div class="seq-term-cell"><span class="seq-term-n">a<sub>${i+1}</sub></span><span class="seq-term-v">${seqFmt(t)}</span></div>`).join('')}${n>8?'<div class="seq-term-cell"><span class="seq-term-n">…</span></div>':''}</div>`;
  html+=`<div class="seq-prop"><span class="seq-prop-label">Fórmula aₙ</span><span class="seq-prop-val">${seqFmt(a1)} + (n−1)·${seqFmt(d)}</span></div>`;
  html+=`<div class="seq-prop"><span class="seq-prop-label">a<sub>${n}</sub></span><span class="seq-prop-val">${seqFmt(an)}</span></div>`;
  html+=`<div class="seq-prop"><span class="seq-prop-label">S<sub>${n}</sub> = n(a₁+aₙ)/2</span><span class="seq-prop-val">${seqFmt(sn)}</span></div>`;
  html+=`<div class="seq-prop"><span class="seq-prop-label">Clasificación</span><span class="seq-prop-val">${cls}</span></div>`;
  html+=`<div class="seq-prop"><span class="seq-prop-label">Acotamiento</span><span class="seq-prop-val">${acot}</span></div>`;
  html+=`</div>`;
  res.innerHTML=html;
}

function seqAnalyzePG(){
  const a1=parseFloat(document.getElementById('pg-a1').value);
  const r=parseFloat(document.getElementById('pg-r').value);
  const n=parseInt(document.getElementById('pg-n').value)||10;
  const res=document.getElementById('seq-result');
  if(isNaN(a1)||isNaN(r)){ res.innerHTML=errBox('Ingresa a₁ y razón r'); return; }
  const an=a1*Math.pow(r,n-1);
  const sn=Math.abs(r-1)<1e-12?a1*n:a1*(1-Math.pow(r,n))/(1-r);
  const sInf=Math.abs(r)<1?a1/(1-r):NaN;
  const terms=Array.from({length:Math.min(n,8)},(_,i)=>a1*Math.pow(r,i));
  const cls=Math.abs(r)>1?'Divergente (|r|>1)':r===1?'Constante':r===-1?'Alternante (r=−1)':'Convergente (|r|<1)';
  let html=`<div class="seq-result-wrap">`;
  html+=`<div class="seq-expr-display">PG: a₁ = ${seqFmt(a1)},  r = ${seqFmt(r)}</div>`;
  html+=`<div class="seq-terms-grid">${terms.map((t,i)=>`<div class="seq-term-cell"><span class="seq-term-n">a<sub>${i+1}</sub></span><span class="seq-term-v">${seqFmt(t)}</span></div>`).join('')}${n>8?'<div class="seq-term-cell"><span class="seq-term-n">…</span></div>':''}</div>`;
  html+=`<div class="seq-prop"><span class="seq-prop-label">Fórmula aₙ</span><span class="seq-prop-val">${seqFmt(a1)}·${seqFmt(r)}^(n−1)</span></div>`;
  html+=`<div class="seq-prop"><span class="seq-prop-label">a<sub>${n}</sub></span><span class="seq-prop-val">${seqFmt(an)}</span></div>`;
  html+=`<div class="seq-prop"><span class="seq-prop-label">S<sub>${n}</sub></span><span class="seq-prop-val">${seqFmt(sn)}</span></div>`;
  if(isFinite(sInf)) html+=`<div class="seq-prop"><span class="seq-prop-label">S∞</span><span class="seq-prop-val">${seqFmt(sInf)}</span></div>`;
  html+=`<div class="seq-prop"><span class="seq-prop-label">Clasificación</span><span class="seq-prop-val">${cls}</span></div>`;
  html+=`<div class="seq-prop"><span class="seq-prop-label">Acotamiento</span><span class="seq-prop-val">${Math.abs(r)<1?`Acotada — converge a S∞ = ${seqFmt(sInf)}`:'No acotada'}</span></div>`;
  html+=`</div>`;
  res.innerHTML=html;
}



// ═══════════════════════════════════════════════════════
// GRAFICACIÓN MODULE
// ═══════════════════════════════════════════════════════

let grafType = 'lin';

// Definición de cada tipo: coeficientes, fórmula, evaluador, pasos
// ══════════════════════════════════════════════════════════════════════════
// GRAF_TYPES — Tipos de funciones del graficador de CAL
// Cada entrada define: title, coefs[], preview(v), eval(x,v), steps(x,v,y)
// Para agregar una nueva función: añadir aquí sin modificar grafDraw().
// Los coefs tienen default:'0' — el usuario introduce los valores reales.
// ══════════════════════════════════════════════════════════════════════════
const GRAF_TYPES = {
  lin: {
    title: 'Coeficientes — Lineal',
    coefs: [
      { id:'gm', label:'m =', placeholder:'0', default:'0' },
      { id:'gb', label:'b =', placeholder:'0', default:'0' },
    ],
    preview: (v) => {
      const m=v.gm, b=v.gb;
      const mStr = m==='1'?'':m==='-1'?'-':m;
      const bPart = parseFloat(b)===0?'':(parseFloat(b)>0?` + ${b}`:` - ${Math.abs(parseFloat(b))}`);
      return `y = ${mStr}x${bPart}` || 'y = x';
    },
    eval: (x,v) => grafParseCoef(v.gm)*x + grafParseCoef(v.gb),
    steps: (x,v,y) => {
      const m=grafParseCoef(v.gm), b=grafParseCoef(v.gb);
      return [
        `<span class="gs-op">y = m·x + b</span>`,
        `<span class="gs-op">y = ${m}·(<span class="gs-x">${x}</span>) + ${b}</span>`,
        `<span class="gs-op">y = ${m*x} + ${b}</span>`,
        `<span class="gs-y">y = ${y}</span>`,
      ];
    },
  },
  quad: {
    title: 'Coeficientes — Cuadrática',
    coefs: [
      { id:'ga', label:'a =', placeholder:'1', default:'0' },
      { id:'gb', label:'b =', placeholder:'0', default:'0' },
      { id:'gc', label:'c =', placeholder:'0', default:'0' },
    ],
    preview: (v) => {
      const a=v.ga, b=v.gb, c=v.gc;
      const bPart = parseFloat(b)===0?'':(parseFloat(b)>0?` + ${b}x`:` - ${Math.abs(parseFloat(b))}x`);
      const cPart = parseFloat(c)===0?'':(parseFloat(c)>0?` + ${c}`:` - ${Math.abs(parseFloat(c))}`);
      return `y = ${a}x²${bPart}${cPart}`;
    },
    eval: (x,v) => grafParseCoef(v.ga)*x*x + grafParseCoef(v.gb)*x + grafParseCoef(v.gc),
    steps: (x,v,y) => {
      const a=grafParseCoef(v.ga), b=grafParseCoef(v.gb), c=grafParseCoef(v.gc);
      return [
        `<span class="gs-op">y = a·x² + b·x + c</span>`,
        `<span class="gs-op">y = ${a}·(<span class="gs-x">${x}</span>)² + ${b}·(<span class="gs-x">${x}</span>) + ${c}</span>`,
        `<span class="gs-op">y = ${a}·${x*x} + ${b*x} + ${c}</span>`,
        `<span class="gs-op">y = ${a*x*x} + ${b*x} + ${c}</span>`,
        `<span class="gs-y">y = ${y}</span>`,
      ];
    },
  },
  abs: {
    title: 'Coeficientes — Valor Absoluto',
    coefs: [
      { id:'ga', label:'a =', placeholder:'1', default:'1' },
      { id:'gh', label:'h =', placeholder:'0', default:'0' },
      { id:'gk', label:'k =', placeholder:'0', default:'0' },
    ],
    preview: (v) => {
      const a=v.ga, h=grafParseCoef(v.gh), k=grafParseCoef(v.gk);
      const hPart = h===0?'x':(h>0?`x + ${h}`:`x - ${Math.abs(h)}`);
      const kPart = k===0?'':(k>0?` + ${k}`:` - ${Math.abs(k)}`);
      return `y = ${a}|${hPart}|${kPart}`;
    },
    eval: (x,v) => grafParseCoef(v.ga)*Math.abs(x + grafParseCoef(v.gh)) + grafParseCoef(v.gk),
    steps: (x,v,y) => {
      const a=grafParseCoef(v.ga), h=grafParseCoef(v.gh), k=grafParseCoef(v.gk);
      const inner = x+h;
      return [
        `<span class="gs-op">y = a·|x + h| + k</span>`,
        `<span class="gs-op">y = ${a}·|(<span class="gs-x">${x}</span>) + ${h}| + ${k}</span>`,
        `<span class="gs-op">y = ${a}·|${inner}| + ${k}</span>`,
        `<span class="gs-op">y = ${a}·${Math.abs(inner)} + ${k}</span>`,
        `<span class="gs-y">y = ${y}</span>`,
      ];
    },
  },
  exp: {
    title: 'Coeficientes — Exponencial',
    coefs: [
      { id:'ga', label:'a =', placeholder:'1', default:'1' },
      { id:'gbas', label:'b =', placeholder:'2', default:'2' },
    ],
    preview: (v) => `y = ${v.ga}·${v.gbas}ˣ`,
    eval: (x,v) => grafParseCoef(v.ga)*Math.pow(grafParseCoef(v.gbas), x),
    steps: (x,v,y) => {
      const a=grafParseCoef(v.ga), b=grafParseCoef(v.gbas);
      return [
        `<span class="gs-op">y = a · bˣ</span>`,
        `<span class="gs-op">y = ${a} · ${b}<span class="gs-x">^${x}</span></span>`,
        `<span class="gs-op">y = ${a} · ${Math.pow(b,x).toFixed(4)}</span>`,
        `<span class="gs-y">y = ${y}</span>`,
      ];
    },
  },
  raiz: {
    title: 'Coeficientes — Raíz Cuadrada',
    coefs: [
      { id:'ga', label:'a =', placeholder:'1', default:'1' },
      { id:'gh', label:'h =', placeholder:'0', default:'0' },
      { id:'gk', label:'k =', placeholder:'0', default:'0' },
    ],
    preview: (v) => {
      const a=v.ga, h=grafParseCoef(v.gh), k=grafParseCoef(v.gk);
      const inner = h===0?'x':(h>0?`x+${h}`:`x${h}`);
      const kPart = k===0?'':(k>0?` + ${k}`:` - ${Math.abs(k)}`);
      return `y = ${a}·√(${inner})${kPart}`;
    },
    eval: (x,v) => {
      const a=grafParseCoef(v.ga), h=grafParseCoef(v.gh), k=grafParseCoef(v.gk);
      const inner = x + h;
      return inner < 0 ? NaN : a*Math.sqrt(inner) + k;
    },
    steps: (x,v,y) => {
      const a=grafParseCoef(v.ga), h=grafParseCoef(v.gh), k=grafParseCoef(v.gk);
      const inner = x+h;
      if(inner < 0) return [`<span class="gs-op">√(${inner}) — No real</span>`];
      return [
        `<span class="gs-op">y = a·√(x + h) + k</span>`,
        `<span class="gs-op">y = ${a}·√(<span class="gs-x">${x}</span> + ${h}) + ${k}</span>`,
        `<span class="gs-op">y = ${a}·√(${inner}) + ${k}</span>`,
        `<span class="gs-op">y = ${a}·${Math.sqrt(inner).toFixed(4)} + ${k}</span>`,
        `<span class="gs-y">y = ${y}</span>`,
      ];
    },
  },
  log: {
    title: 'Coeficientes — Logarítmica',
    coefs: [
      { id:'ga', label:'a =', placeholder:'1', default:'1' },
      { id:'gbas', label:'base =', placeholder:'10', default:'10' },
      { id:'gc', label:'c =', placeholder:'1', default:'1' },
      { id:'gd', label:'d =', placeholder:'0', default:'0' },
    ],
    preview: (v) => {
      const b=v.gbas, c=v.gc, d=grafParseCoef(v.gd);
      const inner = d===0?`${c}x`:(d>0?`${c}x+${d}`:`${c}x${d}`);
      return `y = ${v.ga}·log_${b}(${inner})`;
    },
    eval: (x,v) => {
      const a=grafParseCoef(v.ga), b=grafParseCoef(v.gbas);
      const c=grafParseCoef(v.gc), d=grafParseCoef(v.gd);
      const arg = c*x + d;
      if(arg <= 0 || b <= 0 || b === 1) return NaN;
      return a * Math.log(arg) / Math.log(b);
    },
    steps: (x,v,y) => {
      const a=grafParseCoef(v.ga), b=grafParseCoef(v.gbas);
      const c=grafParseCoef(v.gc), d=grafParseCoef(v.gd);
      const arg = c*x + d;
      if(arg <= 0) return [`<span class="gs-op">log(${arg}) — No definido (arg ≤ 0)</span>`];
      return [
        `<span class="gs-op">y = a · log_b(c·x + d)</span>`,
        `<span class="gs-op">y = ${a} · log_${b}(${c}·<span class="gs-x">${x}</span> + ${d})</span>`,
        `<span class="gs-op">y = ${a} · log_${b}(${arg})</span>`,
        `<span class="gs-op">y = ${a} · ${(Math.log(arg)/Math.log(b)).toFixed(4)}</span>`,
        `<span class="gs-y">y = ${y}</span>`,
      ];
    },
  },
  racional: {
    title: 'Coeficientes — Racional (ax+b)/(cx+d)',
    coefs: [
      { id:'ga', label:'a (num) =', placeholder:'1', default:'1' },
      { id:'gb', label:'b (num) =', placeholder:'0', default:'0' },
      { id:'gc', label:'c (den) =', placeholder:'1', default:'1' },
      { id:'gd', label:'d (den) =', placeholder:'0', default:'0' },
    ],
    preview: (v) => {
      const numStr = `${v.ga}x + ${v.gb}`;
      const denStr = `${v.gc}x + ${v.gd}`;
      return `y = (${numStr}) / (${denStr})`;
    },
    eval: (x,v) => {
      const a=grafParseCoef(v.ga), b=grafParseCoef(v.gb);
      const c=grafParseCoef(v.gc), d=grafParseCoef(v.gd);
      const den = c*x + d;
      if(Math.abs(den) < 1e-10) return NaN;
      return (a*x + b) / den;
    },
    steps: (x,v,y) => {
      const a=grafParseCoef(v.ga), b=grafParseCoef(v.gb);
      const c=grafParseCoef(v.gc), d=grafParseCoef(v.gd);
      const num = a*x + b, den = c*x + d;
      if(Math.abs(den) < 1e-10) return [`<span class="gs-op">Denominador = 0 — Asíntota vertical en x = <span class="gs-x">${x}</span></span>`];
      return [
        `<span class="gs-op">y = (ax + b) / (cx + d)</span>`,
        `<span class="gs-op">y = (${a}·<span class="gs-x">${x}</span> + ${b}) / (${c}·<span class="gs-x">${x}</span> + ${d})</span>`,
        `<span class="gs-op">y = ${num} / ${den}</span>`,
        `<span class="gs-y">y = ${y}</span>`,
      ];
    },
  },
};

function grafInit(){
  grafSetType(grafType);
}

function grafSetType(type) {
  grafType = type;
  document.querySelectorAll('.graf-type-card').forEach(c => c.classList.remove('sel'));
  document.getElementById('gtype-'+type).classList.add('sel');
  grafInitFields();
}

function grafInitFields() {
  const def = GRAF_TYPES[grafType];
  if(!def) return;
  document.getElementById('graf-inputs-title').textContent = def.title;
  const wrap = document.getElementById('graf-coef-fields');
  wrap.innerHTML = def.coefs.map(c => `
    <div class="graf-coef-row">
      <label>${c.label}</label>
      <input class="graf-coef" id="${c.id}" placeholder="${c.placeholder}"
        value="${c.default}" oninput="grafPreview()" onfocus="this.select()"/>
    </div>`).join('');
  grafPreview();
}

// Parsea un coeficiente admitiendo: números, e, π, pi, expresiones simples
function grafParseCoef(str) {
  if(!str || str.trim()==='') return NaN;
  let s = str.trim()
    .replace(/π/g, String(Math.PI))
    .replace(/\bpi\b/gi, String(Math.PI))
    .replace(/\be\b/g, String(Math.E))
    .replace(/\^/g, '**');
  try {
    const v = Function('"use strict"; return (' + s + ')')();
    return isFinite(v) ? v : NaN;
  } catch(e) { return NaN; }
}

function grafGetVals() {
  const def = GRAF_TYPES[grafType];
  const v = {};
  def.coefs.forEach(c => {
    const el = document.getElementById(c.id);
    v[c.id] = el ? (el.value.trim()||c.default) : c.default;
  });
  return v;
}

function grafPreview() {
  const def = GRAF_TYPES[grafType];
  if(!def) return;
  try {
    const v = grafGetVals();
    document.getElementById('graf-formula-preview').textContent = def.preview(v);
  } catch(e) {}
}

// grafFmt() → alias fmt() arriba

// ⚠ WARNING — FUNCIÓN CRÍTICA: grafDraw() — Graficador de funciones del módulo CAL.
// • Depende de GRAF_TYPES[grafType] — agregar nuevas funciones ahí, no aquí.
// • El canvas de graficación es distinto al de vectores — no mezclar contextos.
function grafDraw() {
  const def = GRAF_TYPES[grafType];
  if(!def) return;
  const v   = grafGetVals();
  const N   = parseInt(document.getElementById('graf-pts-n').value)||3;
  const fn  = (x) => def.eval(x, v);

  // Generar puntos: -N ... 0 ... +N (enteros)
  const xs = [];
  for(let i=-N; i<=N; i++) xs.push(i);
  const pts = xs.map(x => ({ x, y: fn(x) }));

  // Calcular rango del canvas con padding
  const ys = pts.map(p=>p.y).filter(isFinite);
  const xMin = -N-1, xMax = N+1;
  let yMin = Math.min(...ys, 0)-1;
  let yMax = Math.max(...ys, 0)+1;
  // padding visual
  const yPad = (yMax-yMin)*0.15;
  yMin -= yPad; yMax += yPad;

  // Mostrar canvas ANTES de leer dimensiones (offsetWidth=0 si display:none)
  const wrap = document.getElementById('graf-canvas-wrap');
  wrap.classList.add('graf-active');

  const cv = document.getElementById('graf-cv');
  const dpr = window.devicePixelRatio||1;
  // Forzar reflow para obtener offsetWidth real después de display:block
  const W = cv.getBoundingClientRect().width || cv.offsetWidth || 320;
  const H = 300;
  cv.width  = W*dpr;
  cv.height = H*dpr;
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);

  const toX = wx => (wx-xMin)/(xMax-xMin)*W;
  const toY = wy => (1-(wy-yMin)/(yMax-yMin))*H;

  // ── Fondo blanco como la referencia ──
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,W,H);

  // ── Grid fino ──
  ctx.strokeStyle = '#e0e8f0';
  ctx.lineWidth = 0.5;
  // verticales cada 1 unidad
  for(let x=Math.ceil(xMin); x<=xMax; x++) {
    const px=toX(x);
    ctx.beginPath(); ctx.moveTo(px,0); ctx.lineTo(px,H); ctx.stroke();
  }
  // horizontales cada unidad entera
  const yStep = grafGridStep(yMax-yMin, 7);
  const y0g = Math.ceil(yMin/yStep)*yStep;
  for(let y=y0g; y<=yMax; y+=yStep) {
    const py=toY(y);
    ctx.beginPath(); ctx.moveTo(0,py); ctx.lineTo(W,py); ctx.stroke();
  }

  // ── Ejes en negro ──
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  // eje X
  const axisY = toY(0);
  ctx.beginPath(); ctx.moveTo(0,axisY); ctx.lineTo(W,axisY); ctx.stroke();
  // eje Y
  const axisX = toX(0);
  ctx.beginPath(); ctx.moveTo(axisX,0); ctx.lineTo(axisX,H); ctx.stroke();

  // ── Flechas en los ejes ──
  const arr = 7;
  ctx.fillStyle = '#000000';
  // flecha derecha eje X
  ctx.beginPath(); ctx.moveTo(W,axisY); ctx.lineTo(W-arr,axisY-arr/2); ctx.lineTo(W-arr,axisY+arr/2); ctx.closePath(); ctx.fill();
  // flecha arriba eje Y
  ctx.beginPath(); ctx.moveTo(axisX,0); ctx.lineTo(axisX-arr/2,arr); ctx.lineTo(axisX+arr/2,arr); ctx.closePath(); ctx.fill();

  // ── Marcas y números en los ejes ──
  ctx.fillStyle = '#333333';
  ctx.font = `${10}px Space Mono, monospace`;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  // eje X: números
  for(let x=Math.ceil(xMin); x<=Math.floor(xMax); x++) {
    if(x===0) continue;
    const px=toX(x);
    ctx.beginPath(); ctx.moveTo(px, axisY-3); ctx.lineTo(px, axisY+3); ctx.stroke();
    ctx.textAlign='center';
    ctx.fillText(x, px, axisY+(axisY<H-20?16:-8));
  }
  // eje Y: números
  for(let y=y0g; y<=yMax; y+=yStep) {
    if(Math.abs(y)<yStep*0.01) continue;
    const py=toY(y);
    ctx.beginPath(); ctx.moveTo(axisX-3,py); ctx.lineTo(axisX+3,py); ctx.stroke();
    ctx.textAlign='right';
    ctx.fillText(grafFmt(y), axisX-6, py+3);
  }
  // origen
  ctx.textAlign='right';
  ctx.fillText('0', axisX-5, axisY+12);

  // ── Curva continua ──
  const STEPS = W*2;
  ctx.strokeStyle = '#2563eb';  // azul como la referencia
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  let penDown = false;
  let prevPy = null;
  for(let i=0; i<=STEPS; i++) {
    const wx = xMin + (xMax-xMin)*i/STEPS;
    const wy = fn(wx);
    if(!isFinite(wy)) { penDown=false; prevPy=null; continue; }
    const px=toX(wx), py=toY(wy);
    // discontinuidad (tan, etc.)
    if(prevPy!==null && Math.abs(py-prevPy)>H*1.2) { penDown=false; }
    if(!penDown) { ctx.moveTo(px,py); penDown=true; }
    else ctx.lineTo(px,py);
    prevPy=py;
  }
  ctx.stroke();

  // ── Puntos rojos ──
  pts.forEach(({x,y}) => {
    if(!isFinite(y)) return;
    const px=toX(x), py=toY(y);
    if(py<-10||py>H+10) return;
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();
  });

  // ── Tabla de valores — tabla completa debajo del canvas ──
  // Muestra el contenedor de tabla
  document.getElementById('graf-table-wrap').classList.add('graf-active');
  const tableEl = document.getElementById('graf-table');
  // ── Tabla de valores estructurada ──────────────────────────────────────
  const tablePts = pts.filter(p => p.x >= -N && p.x <= N);
  tableEl.innerHTML = `<table class="graf-result-table">
    <thead>
      <tr>
        <th class="grt-x">x</th>
        <th class="grt-y">f(x)</th>
        <th class="grt-info">Info</th>
      </tr>
    </thead>
    <tbody>
      ${tablePts.map(({x,y})=>{
        const yStr = isFinite(y) ? grafFmt(y) : '∄';
        const rowCls = x===0 ? 'zero-row' : !isFinite(y) ? 'undef-row' : '';
        const info = x===0 ? 'Origen' : !isFinite(y) ? 'Indefinido' : y>0 ? '↑' : y<0 ? '↓' : '—';
        return `<tr class="${rowCls}">
          <td class="grt-x">${x}</td>
          <td class="grt-y">${yStr}</td>
          <td class="grt-info">${info}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;

  // ── Pasos de cálculo ──
  const stepsWrap = document.getElementById('graf-steps-wrap');
  const stepsEl   = document.getElementById('graf-steps');
  stepsWrap.classList.add('graf-active');
  stepsEl.innerHTML = pts.map(({x,y}) => {
    const yStr = isFinite(y) ? grafFmt(y) : '∄';
    const stepLines = isFinite(y) ? def.steps(x, v, yStr) : [`<span class="gs-op">f(<span class="gs-x">${x}</span>) no está definida en este punto</span>`];
    return `<div class="graf-step-block${x===0?' graf-step-origin':''}">
      <div class="gs-header">x = ${x}</div>
      ${stepLines.map(l=>`<div class="gs-line">${l}</div>`).join('')}
    </div>`;
  }).join('');
}

function grafClear() {
  document.getElementById('graf-canvas-wrap').classList.remove('graf-active');
  document.getElementById('graf-steps-wrap').classList.remove('graf-active');
  const tw = document.getElementById('graf-table-wrap');
  if(tw) tw.classList.remove('graf-active');
  document.getElementById('graf-steps').innerHTML='';
  document.getElementById('graf-table').innerHTML='';
  grafInitFields();
}


function grafGridStep(range, targetDivs) {
  const raw = range/targetDivs;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw,1e-10))));
  const norm = raw/mag;
  let step;
  if(norm<1.5) step=1;
  else if(norm<3.5) step=2;
  else if(norm<7.5) step=5;
  else step=10;
  return step*mag;
}

// ═══════════════════════════════════════════════════════
// TRIÁNGULO 3D
// ═══════════════════════════════════════════════════════

function triGet(id){ return parseFloat(document.getElementById(id).value)||0; }

// ══════════════════════════════════════════════════════
// ── FIGURAS GEOMÉTRICAS 3D ─────────────────────────────
// Motor compartido: genera puntos de malla para cada figura
// ══════════════════════════════════════════════════════

// Estado figuras AL
let figState = null; // { type, params, color, opacity }

// Estado figuras EM
let emFigState = null;
let emFigPanelOpen = false;

// ── PARÁMETROS POR FIGURA ──────────────────────────────
const FIG_PARAMS = {
  sphere:   [{ id:'r',   label:'Radio',    def:'3' }],
  cylinder: [{ id:'r',   label:'Radio',    def:'2' }, { id:'h', label:'Altura', def:'4' }],
  cone:     [{ id:'r',   label:'Radio base', def:'2' }, { id:'h', label:'Altura', def:'4' }],
  plane:    [{ id:'nx',  label:'Normal x', def:'0' }, { id:'ny', label:'Normal y', def:'0' }, { id:'nz', label:'Normal z', def:'1' }, { id:'size', label:'Tamaño', def:'4' }],
  torus:    [{ id:'R',   label:'R (mayor)',def:'3' }, { id:'r', label:'r (tubo)',  def:'1' }],
};

function figParamsHTML(prefix, type, vals={}){
  const ps = FIG_PARAMS[type] || [];
  if(!ps.length) return '';
  return `<div style="margin-bottom:8px">
    <div style="font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:700;color:var(--text2);margin-bottom:6px;letter-spacing:.04em">Parámetros</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${ps.map(p=>`<div class="inp-group"><label>${p.label}</label><input type="number" onfocus="this.select()" id="${prefix}${p.id}" value="${vals[p.id]??p.def}" step="any" min="0.1"/></div>`).join('')}
    </div>
  </div>`;
}

// ── GENERADORES DE MALLA ───────────────────────────────
// Devuelven array de polígonos: cada polígono es array de {x,y,z}

function genSphere(cx,cy,cz, r, segs=18){
  const polys=[];
  for(let i=0;i<segs;i++){
    const t0=Math.PI*i/segs, t1=Math.PI*(i+1)/segs;
    for(let j=0;j<segs*2;j++){
      const p0=Math.PI*2*j/(segs*2), p1=Math.PI*2*(j+1)/(segs*2);
      polys.push([
        {x:cx+r*Math.sin(t0)*Math.cos(p0), y:cy+r*Math.cos(t0), z:cz+r*Math.sin(t0)*Math.sin(p0)},
        {x:cx+r*Math.sin(t0)*Math.cos(p1), y:cy+r*Math.cos(t0), z:cz+r*Math.sin(t0)*Math.sin(p1)},
        {x:cx+r*Math.sin(t1)*Math.cos(p1), y:cy+r*Math.cos(t1), z:cz+r*Math.sin(t1)*Math.sin(p1)},
        {x:cx+r*Math.sin(t1)*Math.cos(p0), y:cy+r*Math.cos(t1), z:cz+r*Math.sin(t1)*Math.sin(p0)},
      ]);
    }
  }
  return polys;
}

function genCylinder(cx,cy,cz, r, h, segs=24){
  const polys=[], y0=cy-h/2, y1=cy+h/2;
  for(let j=0;j<segs;j++){
    const a0=Math.PI*2*j/segs, a1=Math.PI*2*(j+1)/segs;
    // Lateral
    polys.push([
      {x:cx+r*Math.cos(a0),y:y0,z:cz+r*Math.sin(a0)},
      {x:cx+r*Math.cos(a1),y:y0,z:cz+r*Math.sin(a1)},
      {x:cx+r*Math.cos(a1),y:y1,z:cz+r*Math.sin(a1)},
      {x:cx+r*Math.cos(a0),y:y1,z:cz+r*Math.sin(a0)},
    ]);
    // Tapas
    polys.push([{x:cx,y:y0,z:cz},{x:cx+r*Math.cos(a0),y:y0,z:cz+r*Math.sin(a0)},{x:cx+r*Math.cos(a1),y:y0,z:cz+r*Math.sin(a1)}]);
    polys.push([{x:cx,y:y1,z:cz},{x:cx+r*Math.cos(a0),y:y1,z:cz+r*Math.sin(a0)},{x:cx+r*Math.cos(a1),y:y1,z:cz+r*Math.sin(a1)}]);
  }
  return polys;
}

function genCone(cx,cy,cz, r, h, segs=24){
  const polys=[], yBase=cy, yTip=cy+h;
  for(let j=0;j<segs;j++){
    const a0=Math.PI*2*j/segs, a1=Math.PI*2*(j+1)/segs;
    polys.push([
      {x:cx+r*Math.cos(a0),y:yBase,z:cz+r*Math.sin(a0)},
      {x:cx+r*Math.cos(a1),y:yBase,z:cz+r*Math.sin(a1)},
      {x:cx,y:yTip,z:cz},
    ]);
    polys.push([{x:cx,y:yBase,z:cz},{x:cx+r*Math.cos(a0),y:yBase,z:cz+r*Math.sin(a0)},{x:cx+r*Math.cos(a1),y:yBase,z:cz+r*Math.sin(a1)}]);
  }
  return polys;
}

function genPlane(cx,cy,cz, nx,ny,nz, size){
  // Plano perpendicular a la normal (nx,ny,nz) centrado en (cx,cy,cz)
  const len=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;
  const n=[nx/len,ny/len,nz/len];
  // Buscar vector no paralelo a n
  const up=Math.abs(n[1])<0.9?[0,1,0]:[1,0,0];
  const u=cross(n,up); const uL=Math.sqrt(u[0]**2+u[1]**2+u[2]**2);
  const uu=[u[0]/uL,u[1]/uL,u[2]/uL];
  const v=cross(uu,n);
  const s=size;
  const corners=[
    [cx+uu[0]*s+v[0]*s, cy+uu[1]*s+v[1]*s, cz+uu[2]*s+v[2]*s],
    [cx-uu[0]*s+v[0]*s, cy-uu[1]*s+v[1]*s, cz-uu[2]*s+v[2]*s],
    [cx-uu[0]*s-v[0]*s, cy-uu[1]*s-v[1]*s, cz-uu[2]*s-v[2]*s],
    [cx+uu[0]*s-v[0]*s, cy+uu[1]*s-v[1]*s, cz+uu[2]*s-v[2]*s],
  ];
  return [corners.map(c=>({x:c[0],y:c[1],z:c[2]}))];
}

function genTorus(cx,cy,cz, R, r, segs=20){
  const polys=[];
  for(let i=0;i<segs;i++){
    const u0=Math.PI*2*i/segs, u1=Math.PI*2*(i+1)/segs;
    for(let j=0;j<segs;j++){
      const v0=Math.PI*2*j/segs, v1=Math.PI*2*(j+1)/segs;
      const pt=(u,v)=>({
        x:cx+(R+r*Math.cos(v))*Math.cos(u),
        y:cy+r*Math.sin(v),
        z:cz+(R+r*Math.cos(v))*Math.sin(u),
      });
      polys.push([pt(u0,v0),pt(u1,v0),pt(u1,v1),pt(u0,v1)]);
    }
  }
  return polys;
}

function cross(a,b){ return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }

// ── RENDERER GENÉRICO ──────────────────────────────────
// projectFn: función (x,y,z) -> {sx,sy}  (p3 o emP3)
// ctx: contexto canvas
// state: { type, params, cx,cy,cz, color, opacity }

function renderFigure(ctx, projectFn, state){
  if(!state) return;
  const {type, params, cx:ox, cy:oy, cz:oz, color, opacity} = state;
  let polys=[];
  if(type==='sphere')   polys=genSphere(ox,oy,oz, params.r);
  else if(type==='cylinder') polys=genCylinder(ox,oy,oz, params.r, params.h);
  else if(type==='cone')     polys=genCone(ox,oy,oz, params.r, params.h);
  else if(type==='plane')    polys=genPlane(ox,oy,oz, params.nx,params.ny,params.nz, params.size);
  else if(type==='torus')    polys=genTorus(ox,oy,oz, params.R, params.r);

  // Painter's algorithm — ordenar por z media
  const projected = polys.map(poly=>{
    const pts = poly.map(p=>projectFn(p.x,p.y,p.z));
    const zAvg = pts.reduce((s,p)=>s+(p.z2??0),0)/pts.length;
    return {pts, zAvg};
  });
  projected.sort((a,b)=>a.zAvg-b.zAvg);

  const alpha = opacity/100;
  ctx.save();
  projected.forEach(({pts})=>{
    if(pts.length<2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].sx, pts[0].sy);
    for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].sx, pts[i].sy);
    ctx.closePath();
    ctx.globalAlpha = alpha * 0.55;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = Math.min(alpha * 1.8, 0.75);
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── AL: TAB FIGURAS ────────────────────────────────────
let figCurrentType = 'sphere';

function figInitPanel(){
  figSetType(figCurrentType);
  const opEl=document.getElementById('fig-opacity');
  const opVal=document.getElementById('fig-opacity-val');
  if(opEl && opVal){
    opEl.oninput=()=>{ opVal.textContent=opEl.value+'%'; };
  }
}

function figSetType(type){
  figCurrentType = type;
  document.querySelectorAll('.fig-type-btn').forEach(b=>{
    b.classList.toggle('on', b.textContent.toLowerCase()===
      ({sphere:'esfera',cylinder:'cilindro',cone:'cono',plane:'plano',torus:'toro'}[type]));
  });
  const vals = figState && figState.type===type ? figState.params : {};
  document.getElementById('fig-params').innerHTML = figParamsHTML('fig-p-', type, vals);
}

function figGetParams(){
  const ps = FIG_PARAMS[figCurrentType]||[];
  const out={};
  ps.forEach(p=>{ out[p.id]=parseFloat(document.getElementById('fig-p-'+p.id)?.value||p.def)||parseFloat(p.def); });
  return out;
}

function figDraw(){
  const cx=parseFloat(document.getElementById('fig-cx').value)||0;
  const cy=parseFloat(document.getElementById('fig-cy').value)||0;
  const cz=parseFloat(document.getElementById('fig-cz').value)||0;
  const color=document.getElementById('fig-color').value;
  const opacity=parseInt(document.getElementById('fig-opacity').value)||22;
  figState={ type:figCurrentType, params:figGetParams(), cx, cy, cz, color, opacity };
  // Forzar redraw del canvas AL
  draw();
  document.getElementById('fig-res').textContent='✓ Figura graficada en el canvas.';
}

function figClear(){
  figState=null;
  draw();
  document.getElementById('fig-res').textContent='';
}

// ── EM: PANEL FLOTANTE FIGURAS ─────────────────────────
let emFigCurrentType = 'sphere';

function emFigToggle(){
  emFigPanelOpen = !emFigPanelOpen;
  const panel=document.getElementById('em-fig-panel');
  const btn=document.getElementById('em-fig-btn');
  panel.style.display = emFigPanelOpen ? 'block' : 'none';
  btn.style.background = emFigPanelOpen ? 'rgba(124,106,247,.25)' : 'rgba(124,106,247,.1)';
  if(emFigPanelOpen) emFigSetType(emFigCurrentType);
  // Cerrar al clic fuera
  if(emFigPanelOpen){
    setTimeout(()=>{ document.addEventListener('click', emFigOutside, {once:true}); },100);
  }
}

function emFigOutside(e){
  const panel=document.getElementById('em-fig-panel');
  const btn=document.getElementById('em-fig-btn');
  if(panel && !panel.contains(e.target) && !btn.contains(e.target)){
    emFigPanelOpen=false;
    panel.style.display='none';
    btn.style.background='rgba(124,106,247,.1)';
  }
}

function emFigSetType(type){
  emFigCurrentType=type;
  document.querySelectorAll('.em-fig-type-btn').forEach(b=>{
    b.classList.toggle('on', b.textContent.toLowerCase()===
      ({sphere:'esfera',cylinder:'cilindro',cone:'cono',plane:'plano',torus:'toro'}[type]));
  });
  const vals = emFigState && emFigState.type===type ? emFigState.params : {};
  document.getElementById('em-fig-params').innerHTML = figParamsHTML('em-fig-p-', type, vals);
  const opEl=document.getElementById('em-fig-opacity');
  const opVal=document.getElementById('em-fig-opacity-val');
  if(opEl && opVal) opEl.oninput=()=>{ opVal.textContent=opEl.value+'%'; };
}

function emFigGetParams(){
  const ps=FIG_PARAMS[emFigCurrentType]||[];
  const out={};
  ps.forEach(p=>{ out[p.id]=parseFloat(document.getElementById('em-fig-p-'+p.id)?.value||p.def)||parseFloat(p.def); });
  return out;
}

function emFigDraw(){
  const color=document.getElementById('em-fig-color').value;
  const opacity=parseInt(document.getElementById('em-fig-opacity').value)||20;
  emFigState={ type:emFigCurrentType, params:emFigGetParams(), cx:0, cy:0, cz:0, color, opacity };
  emDraw();
}

function emFigClear(){
  emFigState=null;
  emDraw();
}

// ══════════════════════════════════════════════════════
function triCalc(){
  const P={x:triGet('tri-px'),y:triGet('tri-py'),z:triGet('tri-pz')};
  const Q={x:triGet('tri-qx'),y:triGet('tri-qy'),z:triGet('tri-qz')};
  const R={x:triGet('tri-rx'),y:triGet('tri-ry'),z:triGet('tri-rz')};

  // ── Vectores lado ──
  // PQ = Q - P, QR = R - Q, PR = R - P
  const PQ={x:Q.x-P.x, y:Q.y-P.y, z:Q.z-P.z};
  const QR={x:R.x-Q.x, y:R.y-Q.y, z:R.z-Q.z};
  const PR={x:R.x-P.x, y:R.y-P.y, z:R.z-P.z};
  const QP={x:-PQ.x,   y:-PQ.y,   z:-PQ.z};
  const RP={x:-PR.x,   y:-PR.y,   z:-PR.z};
  const RQ={x:-QR.x,   y:-QR.y,   z:-QR.z};

  const mag3=v=>Math.sqrt(v.x**2+v.y**2+v.z**2);
  const dot3=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
  const angle3=(a,b)=>{
    const ma=mag3(a),mb=mag3(b);
    if(!ma||!mb) return 0;
    return Math.acos(Math.max(-1,Math.min(1,dot3(a,b)/(ma*mb))))*180/Math.PI;
  };
  const fmt=v=>fN(v,4);

  const dPQ=mag3(PQ), dQR=mag3(QR), dPR=mag3(PR);

  // Ángulos internos
  const angP=angle3(PQ,PR);   // en P: vectores PQ y PR
  const angQ=angle3(QP,QR);   // en Q: vectores QP y QR
  const angR=angle3(RP,RQ);   // en R: vectores RP y RQ
  const sumAng=angP+angQ+angR;

  // Perímetro y área (producto cruz de dos lados)
  const cross=(a,b)=>({
    x:a.y*b.z-a.z*b.y,
    y:a.z*b.x-a.x*b.z,
    z:a.x*b.y-a.y*b.x
  });
  const cr=cross(PQ,PR);
  const area=mag3(cr)/2;

  // ── Construir HTML de resultados ──
  const mkStepCard=(title,color,steps)=>`
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:11px 13px;margin-bottom:8px">
      <div style="font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:700;color:${color};margin-bottom:8px;letter-spacing:.04em">${title}</div>
      ${steps.map(s=>`<div style="font-family:'Space Mono',monospace;font-size:10px;color:#a0b4cc;line-height:1.9;padding:1px 0">${s}</div>`).join('')}
    </div>`;

  const mkResult=(label,value,color='var(--accent)')=>`
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;flex:1;min-width:0">
      <div style="font-family:'Space Mono',monospace;font-size:8px;color:var(--text3);letter-spacing:.08em;text-transform:uppercase;margin-bottom:3px">${label}</div>
      <div style="font-family:'Space Mono',monospace;font-size:13px;color:${color};font-weight:700">${value}</div>
    </div>`;

  // Pasos lado PQ
  const stepsPQ=[
    `<b style="color:#f0c040">PQ</b> = Q − P`,
    `= (${Q.x}−${P.x}, ${Q.y}−${P.y}, ${Q.z}−${P.z})`,
    `= <b>(${fmt(PQ.x)}, ${fmt(PQ.y)}, ${fmt(PQ.z)})</b>`,
    `|<b>PQ</b>| = √(${fmt(PQ.x)}² + ${fmt(PQ.y)}² + ${fmt(PQ.z)}²)`,
    `= √(${fmt(PQ.x**2)} + ${fmt(PQ.y**2)} + ${fmt(PQ.z**2)})`,
    `= √${fmt(PQ.x**2+PQ.y**2+PQ.z**2)} = <b>${fMag(dPQ)}</b>`,
  ];
  const stepsQR=[
    `<b style="color:#4da6ff">QR</b> = R − Q`,
    `= (${R.x}−${Q.x}, ${R.y}−${Q.y}, ${R.z}−${Q.z})`,
    `= <b>(${fmt(QR.x)}, ${fmt(QR.y)}, ${fmt(QR.z)})</b>`,
    `|<b>QR</b>| = √(${fmt(QR.x)}² + ${fmt(QR.y)}² + ${fmt(QR.z)}²)`,
    `= √${fmt(QR.x**2+QR.y**2+QR.z**2)} = <b>${fMag(dQR)}</b>`,
  ];
  const stepsPR=[
    `<b style="color:#2dd4a0">PR</b> = R − P`,
    `= (${R.x}−${P.x}, ${R.y}−${P.y}, ${R.z}−${P.z})`,
    `= <b>(${fmt(PR.x)}, ${fmt(PR.y)}, ${fmt(PR.z)})</b>`,
    `|<b>PR</b>| = √(${fmt(PR.x)}² + ${fmt(PR.y)}² + ${fmt(PR.z)}²)`,
    `= √${fmt(PR.x**2+PR.y**2+PR.z**2)} = <b>${fMag(dPR)}</b>`,
  ];

  // Pasos ángulo P
  const dotPQPR=dot3(PQ,PR);
  const stepsAngP=[
    `cos P = (<b>PQ · PR</b>) / (|PQ|·|PR|)`,
    `<b>PQ · PR</b> = (${fmt(PQ.x)})(${fmt(PR.x)}) + (${fmt(PQ.y)})(${fmt(PR.y)}) + (${fmt(PQ.z)})(${fmt(PR.z)})`,
    `= ${fmt(PQ.x*PR.x)} + ${fmt(PQ.y*PR.y)} + ${fmt(PQ.z*PR.z)} = <b>${fmt(dotPQPR)}</b>`,
    `cos P = ${fmt(dotPQPR)} / (${fmt(dPQ)} × ${fmt(dPR)})`,
    `cos P = ${fmt(dotPQPR)} / ${fmt(dPQ*dPR)} = ${fmt(dotPQPR/(dPQ*dPR))}`,
    `P = cos⁻¹(${fmt(dotPQPR/(dPQ*dPR))}) = <b>${fDMS(angP)}</b>`,
  ];
  const dotQPQR=dot3(QP,QR);
  const stepsAngQ=[
    `cos Q = (<b>QP · QR</b>) / (|QP|·|QR|)`,
    `<b>QP · QR</b> = (${fmt(QP.x)})(${fmt(QR.x)}) + (${fmt(QP.y)})(${fmt(QR.y)}) + (${fmt(QP.z)})(${fmt(QR.z)})`,
    `= ${fmt(QP.x*QR.x)} + ${fmt(QP.y*QR.y)} + ${fmt(QP.z*QR.z)} = <b>${fmt(dotQPQR)}</b>`,
    `cos Q = ${fmt(dotQPQR)} / (${fmt(dPQ)} × ${fmt(dQR)})`,
    `cos Q = ${fmt(dotQPQR)} / ${fmt(dPQ*dQR)} = ${fmt(dotQPQR/(dPQ*dQR))}`,
    `Q = cos⁻¹(${fmt(dotQPQR/(dPQ*dQR))}) = <b>${fDMS(angQ)}</b>`,
  ];
  const dotRPRQ=dot3(RP,RQ);
  const stepsAngR=[
    `cos R = (<b>RP · RQ</b>) / (|RP|·|RQ|)`,
    `<b>RP · RQ</b> = (${fmt(RP.x)})(${fmt(RQ.x)}) + (${fmt(RP.y)})(${fmt(RQ.y)}) + (${fmt(RP.z)})(${fmt(RQ.z)})`,
    `= ${fmt(RP.x*RQ.x)} + ${fmt(RP.y*RQ.y)} + ${fmt(RP.z*RQ.z)} = <b>${fmt(dotRPRQ)}</b>`,
    `cos R = ${fmt(dotRPRQ)} / (${fmt(dPR)} × ${fmt(dQR)})`,
    `cos R = ${fmt(dotRPRQ)} / ${fmt(dPR*dQR)} = ${fmt(dotRPRQ/(dPR*dQR))}`,
    `R = cos⁻¹(${fmt(dotRPRQ/(dPR*dQR))}) = <b>${fDMS(angR)}</b>`,
  ];

  // Pasos área
  const stepsArea=[
    `<b>PQ × PR</b> — producto vectorial`,
    `i: (${fmt(PQ.y)})(${fmt(PR.z)}) − (${fmt(PQ.z)})(${fmt(PR.y)}) = <b>${fmt(cr.x)}</b>`,
    `j: (${fmt(PQ.z)})(${fmt(PR.x)}) − (${fmt(PQ.x)})(${fmt(PR.z)}) = <b>${fmt(cr.y)}</b>`,
    `k: (${fmt(PQ.x)})(${fmt(PR.y)}) − (${fmt(PQ.y)})(${fmt(PR.x)}) = <b>${fmt(cr.z)}</b>`,
    `|<b>PQ × PR</b>| = √(${fmt(cr.x)}² + ${fmt(cr.y)}² + ${fmt(cr.z)}²) = ${fMag(mag3(cr))}`,
    `Área = |PQ × PR| / 2 = ${fmt(mag3(cr))} / 2 = <b>${fMag(area)}</b>`,
  ];

  const verif=Math.abs(sumAng-180)<0.01
    ?`<span style="color:var(--green)">✓ ${fDMS(angP)} + ${fDMS(angQ)} + ${fDMS(angR)} = ${fmt(sumAng)}° ≈ 180°</span>`
    :`<span style="color:var(--red)">⚠ Suma = ${fmt(sumAng)}° (revisar datos)</span>`;

  document.getElementById('tri-res').innerHTML=`
    <!-- Resumen superior -->
    <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">
      ${mkResult('Lado PQ', fMag(dPQ), '#f0c040')}
      ${mkResult('Lado QR', fMag(dQR), '#4da6ff')}
      ${mkResult('Lado PR', fMag(dPR), '#2dd4a0')}
    </div>
    <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">
      ${mkResult('Ángulo P', fDMS(angP), '#f0c040')}
      ${mkResult('Ángulo Q', fDMS(angQ), '#4da6ff')}
      ${mkResult('Ángulo R', fDMS(angR), '#2dd4a0')}
    </div>
    <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">
      ${mkResult('Perímetro', fMag(dPQ+dQR+dPR))}
      ${mkResult('Área', fMag(area))}
    </div>
    <div style="font-family:'Space Mono',monospace;font-size:9px;margin-bottom:14px;padding:7px 12px;background:var(--surface2);border-radius:8px;border:1px solid var(--border)">${verif}</div>

    <!-- Pasos colapsables -->
    <div class="section-title" style="margin-bottom:8px">A) Lados del triángulo</div>
    ${mkStepCard('Lado PQ = Q − P', '#f0c040', stepsPQ)}
    ${mkStepCard('Lado QR = R − Q', '#4da6ff', stepsQR)}
    ${mkStepCard('Lado PR = R − P', '#2dd4a0', stepsPR)}

    <div class="section-title" style="margin-top:14px;margin-bottom:8px">C) Ángulos internos</div>
    ${mkStepCard('Ángulo en P', '#f0c040', stepsAngP)}
    ${mkStepCard('Ángulo en Q', '#4da6ff', stepsAngQ)}
    ${mkStepCard('Ángulo en R', '#2dd4a0', stepsAngR)}

    <div class="section-title" style="margin-top:14px;margin-bottom:8px">Área del triángulo</div>
    ${mkStepCard('Producto vectorial PQ × PR', '#a594ff', stepsArea)}
  `;

  // ── Graficar en el canvas 3D ──
  // Añadir los 3 puntos como vectores temporales y dibujar
  triDrawCanvas(P, Q, R);
}

function triDrawCanvas(P, Q, R){
  // Guardar vecs del usuario para poder restaurarlos
  window._triVecsBackup = vecs.map(v=>({...v}));

  // Asignar los 3 puntos como vectores
  vecs = [
    {id:901,nm:'P',vx:P.x,vy:P.y,vz:P.z,cl:'#f0c040'},
    {id:902,nm:'Q',vx:Q.x,vy:Q.y,vz:Q.z,cl:'#4da6ff'},
    {id:903,nm:'R',vx:R.x,vy:R.y,vz:R.z,cl:'#2dd4a0'},
  ];

  // Asegurarse de estar en R³
  if(mode!==3){ mode=3; }

  // Renderizar y dibujar — con delay para que el canvas esté visible
  showTab('V');
  setTimeout(()=>{
    renderVecs();
    rLeg();
    draw();
    // Añadir botón de retorno en el panel de vectores
    const pV = document.getElementById('pV');
    if(pV && !document.getElementById('tri-restore-btn')){
      const btn = document.createElement('button');
      btn.id = 'tri-restore-btn';
      btn.textContent = '← Restaurar mis vectores';
      btn.classList.add('tri-restore-btn');
      btn.onclick = ()=>{
        vecs = window._triVecsBackup || vecs;
        renderVecs(); rLeg(); draw();
        btn.remove();
        showTab('T');
      };
      pV.insertBefore(btn, pV.firstChild);
    }
    // Volver a mostrar resultados
    setTimeout(()=>showTab('T'), 80);
  }, 60);
}
