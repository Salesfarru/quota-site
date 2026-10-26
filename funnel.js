/* Quota — glass funnel scene (home page). Requires three.js r149. */
(function(){
  var stage = document.getElementById('stage');
  if (!stage) return;
  var canvas = document.getElementById('scene');
  if (!window.THREE) { stage.insertAdjacentHTML('beforeend','<div class="fallback">3D-сцена не загрузилась. Обновите страницу.</div>'); return; }
  var renderer;
  try { renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true, alpha:true}); }
  catch(e){ stage.insertAdjacentHTML('beforeend','<div class="fallback">Ваш браузер не поддерживает WebGL.</div>'); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  var group = new THREE.Group();
  scene.add(group);

  // Funnel profile
  var YT = 2.0, YB = -1.25, YN = -2.15, RT = 2.0, RB = 0.3;
  function R(y){ if (y <= YB) return RB; if (y >= YT) return RT; var t = (y - YB) / (YT - YB); return RB + (RT - RB) * Math.pow(t, 1.7); }
  var LEVELS = [1.3, 0.55, -0.15, -0.8];
  var CRACK_ANG = [0.6, 2.9, 4.6, 1.7];
  var MODES = { now:[0.38,0.35,0.40,0.45], after:[0.12,0.22,0.25,0.30] };
  var P = MODES.now;

  // Glass shell: fresnel rim glow
  var prof = [];
  for (var i = 0; i <= 80; i++) { var yy = YN + (YT - YN) * i / 80; prof.push(new THREE.Vector2(R(yy), yy)); }
  var shellMat = new THREE.ShaderMaterial({
    uniforms:{ uColor:{value:new THREE.Color('#7CA3FF')} },
    vertexShader:'varying vec3 vN; varying vec3 vV; varying float vY; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); vY = position.y; gl_Position = projectionMatrix*mv; }',
    fragmentShader:'uniform vec3 uColor; varying vec3 vN; varying vec3 vV; varying float vY; void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); f = pow(f, 2.4); float band = smoothstep(0.985, 1.0, sin(vY*26.0))*0.05; float a = 0.035 + f*0.5 + band; gl_FragColor = vec4(uColor*(0.35 + f*1.3), a); }',
    transparent:true, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending
  });
  group.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 112), shellMat));

  function ring(r, y, op){
    var pts = [];
    for (var k = 0; k <= 160; k++) { var a = k / 160 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a)*r, y, Math.sin(a)*r)); }
    var l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({color:0xA9C2FF, transparent:true, opacity:op}));
    group.add(l); return l;
  }
  ring(RT, YT, 0.75); ring(RB, YN, 0.5);
  LEVELS.forEach(function(L){ ring(R(L), L, 0.16); });

  // Glow points shader (particles + cracks)
  function glowMaterial(){
    return new THREE.ShaderMaterial({
      uniforms:{ uPR:{value:renderer.getPixelRatio()} },
      vertexShader:'attribute float aSize; attribute vec3 aColor; attribute float aAlpha; uniform float uPR; varying vec3 vC; varying float vA; void main(){ vC = aColor; vA = aAlpha; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = aSize*uPR*(320.0/-mv.z); gl_Position = projectionMatrix*mv; }',
      fragmentShader:'varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord-0.5); if (d > 0.5) discard; float core = smoothstep(0.5, 0.0, d); float hot = smoothstep(0.18, 0.0, d); gl_FragColor = vec4(vC*(0.55+core*0.6)+hot*0.35, pow(core,1.8)*vA); }',
      transparent:true, depthWrite:false, blending:THREE.AdditiveBlending
    });
  }

  // Cracks
  var cG = new THREE.BufferGeometry();
  var cPos = new Float32Array(12), cCol = new Float32Array(12), cSize = new Float32Array(4), cAlpha = new Float32Array(4);
  var crackPos = [];
  for (var c = 0; c < 4; c++) {
    var L = LEVELS[c], a = CRACK_ANG[c], r = R(L);
    crackPos.push(new THREE.Vector3(Math.cos(a)*r, L, Math.sin(a)*r));
    cPos[c*3] = Math.cos(a)*r; cPos[c*3+1] = L; cPos[c*3+2] = Math.sin(a)*r;
    cCol[c*3] = 0.973; cCol[c*3+1] = 0.443; cCol[c*3+2] = 0.443;
  }
  cG.setAttribute('position', new THREE.BufferAttribute(cPos,3));
  cG.setAttribute('aColor', new THREE.BufferAttribute(cCol,3));
  cG.setAttribute('aSize', new THREE.BufferAttribute(cSize,1));
  cG.setAttribute('aAlpha', new THREE.BufferAttribute(cAlpha,1));
  var cracks = new THREE.Points(cG, glowMaterial()); cracks.frustumCulled = false; group.add(cracks);

  // Particles
  var N = 320;
  var g = new THREE.BufferGeometry();
  var pos = new Float32Array(N*3), col = new Float32Array(N*3), size = new Float32Array(N), alpha = new Float32Array(N);
  g.setAttribute('position', new THREE.BufferAttribute(pos,3));
  g.setAttribute('aColor', new THREE.BufferAttribute(col,3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size,1));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha,1));
  var pts = new THREE.Points(g, glowMaterial()); pts.frustumCulled = false; group.add(pts);

  var st = new Uint8Array(N), stg = new Uint8Array(N), counted = new Uint8Array(N), crackOf = new Uint8Array(N);
  var th = new Float32Array(N), fr = new Float32Array(N), py = new Float32Array(N), vy = new Float32Array(N),
      t = new Float32Array(N), delay = new Float32Array(N), base = new Float32Array(N), tint = new Float32Array(N),
      fx = new Float32Array(N), fy = new Float32Array(N), fz = new Float32Array(N),
      vx = new Float32Array(N), vz = new Float32Array(N), vyy = new Float32Array(N);

  var BLUE = [0.486,0.639,1.0], ICE = [0.78,0.85,1.0], RED = [0.973,0.443,0.443], GOLD = [0.984,0.749,0.141];
  var stats = { total:0, lost:0, won:0, perStage:[0,0,0,0] };

  function spawn(i, initial){
    st[i] = 0; stg[i] = 0; counted[i] = 0; t[i] = 0;
    th[i] = Math.random()*Math.PI*2; fr[i] = 0.2 + Math.random()*0.7;
    py[i] = YT + 0.3; vy[i] = 0.32 + Math.random()*0.22;
    delay[i] = initial ? Math.random()*7 : Math.random()*0.5;
    base[i] = 0.095 + Math.random()*0.07; tint[i] = Math.random();
  }
  for (var n = 0; n < N; n++) spawn(n, true);

  function setCol(i, a, b, k){ col[i*3] = a[0]+(b[0]-a[0])*k; col[i*3+1] = a[1]+(b[1]-a[1])*k; col[i*3+2] = a[2]+(b[2]-a[2])*k; }
  function setPos(i, x, y, z){ pos[i*3] = x; pos[i*3+1] = y; pos[i*3+2] = z; }

  function step(dt){
    for (var i = 0; i < N; i++) {
      if (delay[i] > 0) { delay[i] -= dt; alpha[i] = 0; continue; }
      var s = st[i];
      if (s === 0) {
        var prev = py[i];
        vy[i] = Math.min(vy[i] + 0.22*dt, 1.5);
        py[i] -= vy[i]*dt;
        var y = py[i];
        if (!counted[i] && y < YT) { counted[i] = 1; stats.total++; }
        var rr = R(y) * fr[i];
        th[i] += dt * Math.min(0.5 + 0.7 / Math.max(R(y), 0.3), 3.0);
        var k = stg[i];
        if (k < 4 && prev > LEVELS[k] && y <= LEVELS[k]) {
          stg[i] = k + 1;
          if (Math.random() < P[k]) {
            st[i] = 1; t[i] = 0; crackOf[i] = k;
            fx[i] = Math.cos(th[i])*rr; fy[i] = y; fz[i] = Math.sin(th[i])*rr;
            stats.lost++; stats.perStage[k]++;
          }
        }
        if (st[i] === 0 && y < YN) { st[i] = 3; stats.won++; }
        setPos(i, Math.cos(th[i])*rr, y, Math.sin(th[i])*rr);
        setCol(i, BLUE, ICE, tint[i]*0.6);
        size[i] = base[i];
        alpha[i] = Math.min(1, (YT + 0.3 - y) / 0.35);
      } else if (s === 1) {
        t[i] += dt / 0.4;
        var e = Math.min(t[i], 1), ee = e*e, cp = crackPos[crackOf[i]];
        setPos(i, fx[i] + (cp.x - fx[i])*ee, fy[i] + (cp.y - fy[i])*ee, fz[i] + (cp.z - fz[i])*ee);
        setCol(i, BLUE, RED, e);
        alpha[i] = 1; size[i] = base[i] * (1 + 0.4*e);
        if (t[i] >= 1) {
          var ang = CRACK_ANG[crackOf[i]], sp = 1.1 + Math.random()*0.8, sd = (Math.random()-0.5)*0.8;
          vx[i] = Math.cos(ang + sd)*sp; vz[i] = Math.sin(ang + sd)*sp; vyy[i] = 0.25 + Math.random()*0.35;
          fx[i] = cp.x; fy[i] = cp.y; fz[i] = cp.z;
          st[i] = 2; t[i] = 0;
        }
      } else if (s === 2) {
        t[i] += dt;
        vyy[i] -= 1.3*dt;
        fx[i] += vx[i]*dt; fy[i] += vyy[i]*dt; fz[i] += vz[i]*dt;
        setPos(i, fx[i], fy[i], fz[i]);
        setCol(i, RED, RED, 0);
        alpha[i] = Math.max(0, 1 - t[i]/1.3); size[i] = base[i] * 1.4;
        if (t[i] > 1.3) spawn(i, false);
      } else {
        vy[i] = Math.min(vy[i] + 0.4*dt, 1.6);
        py[i] -= vy[i]*dt;
        var yb = py[i], rb = RB * fr[i] * 0.85;
        th[i] += dt * 2.4;
        setPos(i, Math.cos(th[i])*rb, yb, Math.sin(th[i])*rb);
        var gk = Math.min(1, (YN - yb + 0.05) / 0.25);
        setCol(i, BLUE, GOLD, gk);
        size[i] = base[i] * (1 + 0.6*gk);
        alpha[i] = Math.max(0, Math.min(1, (yb - (YN - 1.1)) / 0.9));
        if (yb < YN - 1.1) spawn(i, false);
      }
    }
  }

  var mode = 'now', clock = 0;
  function updateCracks(){
    for (var c = 0; c < 4; c++) {
      var pulse = reduced ? 0.8 : 0.75 + 0.25*Math.sin(clock*3 + c*1.7);
      var strength = P[c] / 0.45;
      cSize[c] = 0.22 + 0.32*strength;
      cAlpha[c] = (mode === 'now' ? 0.95 : 0.55) * pulse;
    }
    cG.attributes.aSize.needsUpdate = true; cG.attributes.aAlpha.needsUpdate = true;
  }

  // Labels
  var tags = [0,1,2,3,4,5].map(function(i){ return document.getElementById('t'+i); });
  var tagY = [YT, LEVELS[0], LEVELS[1], LEVELS[2], LEVELS[3], YN];
  var v = new THREE.Vector3(), W = 1, H = 1;
  function placeTags(){
    for (var i = 0; i < 6; i++) {
      var y = tagY[i];
      v.set(group.position.x - R(y) - 0.12, y, 0).project(camera);
      var x = (v.x*0.5 + 0.5) * W, yy = (-v.y*0.5 + 0.5) * H;
      tags[i].style.transform = 'translate(' + x.toFixed(1) + 'px,' + yy.toFixed(1) + 'px) translate(-100%,-50%)';
    }
  }
  var fmt = function(x){ return x.toLocaleString('ru-RU'); };
  var elT = document.getElementById('s-total'), elL = document.getElementById('s-lost'), elW = document.getElementById('s-won'), elC = document.getElementById('s-conv');
  function writeStats(){
    elT.textContent = fmt(stats.total); elL.textContent = fmt(stats.lost); elW.textContent = fmt(stats.won);
    var done = stats.lost + stats.won;
    elC.textContent = done > 20 ? (stats.won / done * 100).toFixed(1).replace('.', ',') + '%' : '—';
    tags[0].querySelector('.n').textContent = fmt(stats.total);
    for (var k = 0; k < 4; k++) tags[k+1].querySelector('.n').textContent = '−' + fmt(stats.perStage[k]);
    tags[5].querySelector('.n').textContent = fmt(stats.won);
  }

  // Sizing
  var target = {x:0, y:0};
  function resize(){
    W = stage.clientWidth; H = stage.clientHeight;
    if (!W || !H) return;
    renderer.setSize(W, H, false);
    var aspect = W / Math.max(H, 1);
    camera.aspect = aspect;
    var dist = aspect < 1.1 ? Math.min(9.4 * 1.1 / aspect, 16) : 9.4;
    camera.userData.dist = dist;
    group.position.x = aspect < 1.1 ? 0.55 : 0.45;
    camera.updateProjectionMatrix();
    if (reduced) render(0);
  }
  function render(dt){
    var d = camera.userData.dist || 9.4;
    camera.position.x += ((reduced ? 0 : target.x*0.9) - camera.position.x) * Math.min(1, dt*3 || 1);
    camera.position.y += ((1.05 + (reduced ? 0 : target.y*0.5)) - camera.position.y) * Math.min(1, dt*3 || 1);
    camera.position.z = d;
    camera.lookAt(group.position.x*0.5, -0.15, 0);
    updateCracks();
    g.attributes.position.needsUpdate = true; g.attributes.aColor.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true; g.attributes.aAlpha.needsUpdate = true;
    renderer.render(scene, camera);
    placeTags();
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else window.addEventListener('resize', resize);
  resize();

  stage.addEventListener('pointermove', function(e){
    var b = stage.getBoundingClientRect();
    target.x = ((e.clientX - b.left) / b.width - 0.5) * 2;
    target.y = ((e.clientY - b.top) / b.height - 0.5) * -2;
  });
  stage.addEventListener('pointerleave', function(){ target.x = 0; target.y = 0; });

  // Mode switch
  var bNow = document.getElementById('mode-now'), bAfter = document.getElementById('mode-after');
  // Liquid-glass thumb: two springy edges, the leading one runs ahead, the trailing one catches up
  var seg = document.querySelector('.seg'), thumb = seg.querySelector('.thumb');
  var eL = {x:0, v:0}, eR = {x:0, v:0}, tL = 0, tR = 0, thumbRaf = 0, tLast = 0;
  function measure(){ var b = mode === 'now' ? bNow : bAfter; tL = b.offsetLeft; tR = b.offsetLeft + b.offsetWidth; }
  function drawThumb(){
    var w = Math.max(eR.x - eL.x, 0), rest = tR - tL || w;
    var stretch = Math.max(0, w - rest) / Math.max(rest, 1);
    var sy = 1 - Math.min(0.22, stretch * 0.35);
    thumb.style.width = w.toFixed(2) + 'px';
    thumb.style.transform = 'translateX(' + eL.x.toFixed(2) + 'px) scaleY(' + sy.toFixed(3) + ')';
  }
  function snapThumb(){ measure(); eL.x = tL; eR.x = tR; eL.v = eR.v = 0; drawThumb(); }
  function animThumb(now){
    var dt = Math.min((now - tLast) / 1000, 0.032); tLast = now;
    var right = (tL + tR) / 2 > (eL.x + eR.x) / 2;
    var lead = right ? eR : eL, trail = right ? eL : eR, lt = right ? tR : tL, tt = right ? tL : tR;
    lead.v += ((lt - lead.x) * 340 - lead.v * 24) * dt; lead.x += lead.v * dt;
    trail.v += ((tt - trail.x) * 120 - trail.v * 15) * dt; trail.x += trail.v * dt;
    drawThumb();
    var done = Math.abs(eL.x - tL) + Math.abs(eR.x - tR) < 0.3 && Math.abs(eL.v) + Math.abs(eR.v) < 2;
    if (done) { snapThumb(); thumbRaf = 0; } else thumbRaf = requestAnimationFrame(animThumb);
  }
  function moveThumb(){
    measure();
    if (reduced) { snapThumb(); return; }
    if (!thumbRaf) { tLast = performance.now(); thumbRaf = requestAnimationFrame(animThumb); }
  }
  snapThumb();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(snapThumb);
  window.addEventListener('resize', snapThumb);

  function setMode(m){
    if (m === mode) return;
    mode = m; P = MODES[m];
    moveThumb();
    bNow.setAttribute('aria-pressed', m === 'now'); bAfter.setAttribute('aria-pressed', m === 'after');
    stats = { total:0, lost:0, won:0, perStage:[0,0,0,0] };
    for (var i = 0; i < N; i++) spawn(i, true);
    if (reduced) prefill();
    writeStats();
  }
  bNow.addEventListener('click', function(){ setMode('now'); });
  bAfter.addEventListener('click', function(){ setMode('after'); });

  function prefill(){
    for (var i = 0; i < 900; i++) { step(1/60); clock += 1/60; group.rotation.y += 0.002; }
    render(0); writeStats();
  }

  if (reduced) { prefill(); return; }

  var last = performance.now(), acc = 0;
  function loop(now){
    var dt = Math.min((now - last) / 1000, 0.05); last = now;
    clock += dt; acc += dt;
    group.rotation.y += dt * 0.12;
    step(dt);
    render(dt);
    if (acc > 0.25) { acc = 0; writeStats(); }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
