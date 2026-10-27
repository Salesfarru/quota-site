/* Quota — lens (services) and glass bars (contacts) scenes. Requires three.js r149. */
(function(){
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fail(stage, text){ if (stage) stage.insertAdjacentHTML('beforeend', '<div class="fallback">' + text + '</div>'); }
  if (!window.THREE) {
    fail(document.getElementById('bars-stage'), '3D-сцена не загрузилась. Обновите страницу.');
    fail(document.getElementById('lens-stage'), '3D-сцена не загрузилась. Обновите страницу.');
    return;
  }

  function makeRenderer(canvas){
    var r = new THREE.WebGLRenderer({canvas:canvas, antialias:true, alpha:true});
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputEncoding = THREE.sRGBEncoding;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.setClearColor(0x000000, 0);
    return r;
  }

  // Studio light environment built from glowing panels, so glass has something to reflect
  function makeEnv(renderer){
    var pm = new THREE.PMREMGenerator(renderer);
    var s = new THREE.Scene();
    s.background = new THREE.Color(0x04070d);
    function panel(w, h, color, k, x, y, z){
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(k), side:THREE.DoubleSide}));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
    }
    panel(7, 1.6, 0xffffff, 3.2, 0, 6, 2);
    panel(2.4, 6, 0x7ca3ff, 2.6, -6, 1.5, 1);
    panel(2.4, 5, 0xa9c2ff, 1.6, 6, 0.5, -1.5);
    panel(9, 1, 0x5b8cff, 1.6, 0, -4, -5);
    panel(3, 3, 0xffffff, 1.2, 3, 3, 6);
    var tex = pm.fromScene(s, 0.035).texture;
    pm.dispose();
    return tex;
  }

  function canvasTex(w, h, draw){
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  }

  // Dark backdrop with a soft blue glow and faint grid: fills the view and gives glass something to bend
  function backdrop(scene, glowX, glowY){
    var tex = canvasTex(1024, 640, function(g, w, h){
      g.fillStyle = '#070B14'; g.fillRect(0, 0, w, h);
      var cx = w * glowX, cy = h * glowY;
      var rg = g.createRadialGradient(cx, cy, 0, cx, cy, h * 0.22);
      rg.addColorStop(0, 'rgba(46,82,190,0.46)'); rg.addColorStop(0.4, 'rgba(22,40,96,0.30)'); rg.addColorStop(0.75, 'rgba(12,20,44,0.18)'); rg.addColorStop(1, 'rgba(7,11,20,0)');
      g.fillStyle = rg; g.fillRect(0, 0, w, h);
      if (false) {
      g.save();
      g.beginPath(); g.arc(cx, cy, h * 0.36, 0, Math.PI * 2); g.clip();
      g.strokeStyle = 'rgba(169,194,255,0.10)'; g.lineWidth = 1;
      for (var x = 0; x < w; x += 22) { g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x + .5, h); g.stroke(); }
      for (var y = 0; y < h; y += 22) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(w, y + .5); g.stroke(); }
      g.restore();
      var fade = g.createRadialGradient(cx, cy, h * 0.1, cx, cy, h * 0.36);
      fade.addColorStop(0, 'rgba(7,11,20,0)'); fade.addColorStop(1, 'rgba(7,11,20,1)');
      g.fillStyle = fade; g.fillRect(0, 0, w, h);
      }
    });
    var m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({map:tex, toneMapped:false}));
    m.position.z = -5; scene.add(m); return m;
  }

  function glowSprite(color, size){
    var tex = canvasTex(128, 128, function(g, w){
      var rg = g.createRadialGradient(w/2, w/2, 0, w/2, w/2, w/2);
      rg.addColorStop(0, color); rg.addColorStop(0.25, color.replace('1)', '0.55)')); rg.addColorStop(1, color.replace('1)', '0)'));
      g.fillStyle = rg; g.fillRect(0, 0, w, w);
    });
    var s = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, toneMapped:false}));
    s.scale.set(size, size, 1); return s;
  }

  function roundedBar(w, h, r){
    var sh = new THREE.Shape(), x = -w/2, y = -w/2;
    sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r);
    sh.lineTo(x + w, y + w - r); sh.quadraticCurveTo(x + w, y + w, x + w - r, y + w);
    sh.lineTo(x + r, y + w); sh.quadraticCurveTo(x, y + w, x, y + w - r);
    sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y);
    var bt = Math.min(0.06, h * 0.2);
    var g = new THREE.ExtrudeGeometry(sh, {depth:Math.max(h - bt*2, 0.01), bevelEnabled:true, bevelThickness:bt, bevelSize:Math.min(0.05, r*0.6), bevelSegments:6, curveSegments:10});
    g.rotateX(-Math.PI / 2); g.translate(0, bt, 0);
    return g;
  }

  var v3 = new THREE.Vector3();
  function placeTag(el, worldPos, camera, W, H, anchor){
    v3.copy(worldPos).project(camera);
    var x = (v3.x * 0.5 + 0.5) * W, y = (-v3.y * 0.5 + 0.5) * H;
    el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) ' + (anchor || 'translate(-100%,-50%)');
  }

  function scene3d(opts){
    var stage = document.getElementById(opts.stage), canvas = document.getElementById(opts.canvas);
    if (!stage || !canvas) return;
    var renderer;
    try { renderer = makeRenderer(canvas); } catch (e) { fail(stage, 'Ваш браузер не поддерживает WebGL.'); return; }
    var scene = new THREE.Scene();
    scene.environment = makeEnv(renderer);
    var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    var ctx = {stage:stage, renderer:renderer, scene:scene, camera:camera, W:1, H:1, aspect:1, pointer:{x:0, y:0, inside:false}, clock:0};
    opts.build(ctx);
    function resize(){
      ctx.W = stage.clientWidth; ctx.H = stage.clientHeight;
      if (!ctx.W || !ctx.H) return;
      ctx.aspect = ctx.W / Math.max(ctx.H, 1);
      renderer.setSize(ctx.W, ctx.H, false);
      camera.aspect = ctx.aspect; camera.updateProjectionMatrix();
      if (reduced || !visible) frame(0);
    }
    function frame(dt){ opts.update(ctx, dt);
      if (ctx.bd) { var dd = camera.position.z - ctx.bd.position.z, hh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dd * 1.8; camera.updateMatrixWorld(); var dir = camera.getWorldDirection(new THREE.Vector3()); var tt = (ctx.bd.position.z - camera.position.z) / dir.z; ctx.bd.scale.set(hh * Math.max(ctx.aspect, 1), hh, 1); ctx.bd.position.x = camera.position.x + dir.x * tt; ctx.bd.position.y = camera.position.y + dir.y * tt; } renderer.render(scene, camera); if (opts.after) opts.after(ctx); }
    stage.addEventListener('pointermove', function(e){
      var b = stage.getBoundingClientRect();
      ctx.pointer.x = ((e.clientX - b.left) / b.width - 0.5) * 2;
      ctx.pointer.y = ((e.clientY - b.top) / b.height - 0.5) * -2;
      ctx.pointer.inside = true;
      if (reduced) frame(0);
    });
    stage.addEventListener('pointerleave', function(){ ctx.pointer.x = 0; ctx.pointer.y = 0; ctx.pointer.inside = false; if (reduced) frame(0); });
    var visible = true;
    if (window.IntersectionObserver) new IntersectionObserver(function(es){ visible = es[0].isIntersecting; if (visible) ctx.seen = true; }, {threshold:0.15}).observe(stage);
    else ctx.seen = true;
    if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else window.addEventListener('resize', resize);
    resize();
    if (reduced) { ctx.seen = true; ctx.clock = 100; frame(0); return; }
    var last = performance.now();
    function loop(now){
      var dt = Math.min((now - last) / 1000, 0.05); last = now;
      if (visible) { ctx.clock += dt; frame(dt); }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* ---------- Idea 2: glass bars from the mark ---------- */
  scene3d({
    stage:'bars-stage', canvas:'bars-canvas',
    build:function(c){
      c.bd = backdrop(c.scene, 0.5, 0.5);
      var floorTex = canvasTex(512, 512, function(g, w){
        var rg = g.createRadialGradient(w/2, w/2, 0, w/2, w/2, w/2);
        rg.addColorStop(0, 'rgba(124,163,255,0.35)'); rg.addColorStop(0.45, 'rgba(59,111,224,0.12)'); rg.addColorStop(1, 'rgba(7,11,20,0)');
        g.fillStyle = rg; g.fillRect(0, 0, w, w);
      });
      var floor = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({map:floorTex, transparent:true, depthWrite:false, toneMapped:false}));
      floor.rotation.x = -Math.PI / 2; floor.position.y = -0.01; c.scene.add(floor);

      var glass = new THREE.MeshPhysicalMaterial({
        color:0xeef3ff, roughness:0.04, metalness:0, transmission:1, thickness:0.8, ior:1.5,
        clearcoat:1, clearcoatRoughness:0.04, attenuationColor:new THREE.Color(0x9bbcff), attenuationDistance:4.5,
        envMapIntensity:1.5, specularIntensity:1
      });
      var group = new THREE.Group(); c.scene.add(group);
      var H = [1.3, 2.1, 3.05], X = [-1.15, 0, 1.15];
      c.bars = H.map(function(h, i){
        var m = new THREE.Mesh(roundedBar(0.9, h, 0.17), glass);
        m.position.x = X[i]; m.scale.y = 0.001; group.add(m); return m;
      });
      c.planY = 2.55;
      var dashed = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.95, c.planY, 0), new THREE.Vector3(1.95, c.planY, 0)]),
        new THREE.LineDashedMaterial({color:0xa9c2ff, dashSize:0.11, gapSize:0.09, transparent:true, opacity:0.6, toneMapped:false}));
      dashed.computeLineDistances(); group.add(dashed);
      c.planStart = new THREE.Vector3(-1.95, c.planY, 0); c.dashed = dashed;
      c.glow = glowSprite('rgba(251,191,36,1)', 1.3); c.glow.position.set(X[2], H[2] + 0.05, 0); c.glow.material.opacity = 0; group.add(c.glow);
      c.top = new THREE.Vector3(X[2], H[2] + 0.35, 0);
      c.group = group; c.H = H; c.grow = 0;
      c.tagPlan = document.getElementById('bars-plan'); c.tagWin = document.getElementById('bars-win');
      c.rot = 0; c.tilt = 0;
    },
    update:function(c, dt){
      if (c.seen) c.grow += dt;
      var g = reduced ? 99 : c.grow;
      c.bars.forEach(function(b, i){
        var t = Math.min(Math.max((g - i * 0.22) / 1.3, 0), 1);
        var e = 1 - Math.pow(1 - t, 3);
        var over = t < 1 ? Math.sin(t * Math.PI) * 0.05 : 0;
        b.scale.y = Math.max(0.001, e + over);
      });
      var lit = Math.min(Math.max((g - 1.9) / 0.6, 0), 1);
      var pulse = reduced ? 1 : 0.85 + 0.15 * Math.sin(c.clock * 2.4);
      c.glow.material.opacity = lit * pulse;
      c.tagWin.style.opacity = lit;
      var tr = -0.5 + (reduced ? 0 : Math.sin(c.clock * 0.3) * 0.12) + c.pointer.x * 0.7;
      var tt = c.pointer.y * 0.25;
      var k = dt ? Math.min(1, dt * 3) : 1;
      c.rot += (tr - c.rot) * k; c.tilt += (tt - c.tilt) * k;
      c.group.rotation.y = c.rot;
      c.group.position.y = reduced ? 0 : Math.sin(c.clock * 0.8) * 0.04;
      var d = 10.5 * (c.aspect < 1.05 ? Math.min(1.25 / c.aspect, 1.9) : 1);
      c.camera.position.set(0, 2.6 + c.tilt * 2, d);
      c.camera.lookAt(0, 1.45, 0);
    },
    after:function(c){
      c.group.updateMatrixWorld();
      placeTag(c.tagPlan, c.group.localToWorld(v3.copy(c.planStart)).clone(), c.camera, c.W, c.H);
      placeTag(c.tagWin, c.group.localToWorld(v3.copy(c.top)).clone(), c.camera, c.W, c.H, 'translate(-50%,-100%)');
    }
  });

  /* ---------- Idea 3: lens over a sales chart ---------- */
  scene3d({
    stage:'lens-stage', canvas:'lens-canvas',
    build:function(c){
      c.bd = backdrop(c.scene, 0.5, 0.5);
      var chart = new THREE.Group(); chart.position.y = -1.05; c.scene.add(chart);
      var N = 14, DIPS = [3, 9], step = 0.6;
      c.cols = [];
      for (var i = 0; i < N; i++) {
        var h = 0.55 + i * 0.13 + Math.sin(i * 1.7) * 0.12;
        var isDip = DIPS.indexOf(i) >= 0;
        if (isDip) h = i === 3 ? 0.35 : 0.6;
        var mat = new THREE.MeshStandardMaterial({color:isDip ? 0x3a1822 : 0x1b2a48, roughness:0.35, metalness:0.25, emissive:0x000000, envMapIntensity:0.9});
        var m = new THREE.Mesh(roundedBar(0.42, h, 0.08), mat);
        m.position.x = (i - (N - 1) / 2) * step;
        chart.add(m);
        c.cols.push({mesh:m, mat:mat, dip:isDip, h:h});
      }
      var base = new THREE.Mesh(new THREE.BoxGeometry(N * step + 0.4, 0.02, 0.9), new THREE.MeshStandardMaterial({color:0x121b2d, roughness:0.6, metalness:0.1}));
      base.position.y = -0.01; chart.add(base);
      c.chart = chart;
      c.dips = DIPS.map(function(k, j){
        var col = c.cols[k];
        return {col:col, tag:document.getElementById('lens-dip' + j), top:new THREE.Vector3(col.mesh.position.x, col.h + 0.2, 0.3)};
      });

      var lens = new THREE.Group(); c.scene.add(lens);
      var glass = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.MeshPhysicalMaterial({
        color:0xeef3ff, roughness:0.02, metalness:0, transmission:1, thickness:1.6, ior:1.62,
        clearcoat:1, clearcoatRoughness:0.03, attenuationColor:new THREE.Color(0x7ca3ff), attenuationDistance:3.5,
        envMapIntensity:1.3, specularIntensity:1
      }));
      glass.scale.set(1, 1, 0.3);
      var metal = new THREE.MeshStandardMaterial({color:0xbcd0ff, roughness:0.22, metalness:1, envMapIntensity:1.4});
      var rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 24, 120), metal);
      var handle = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 1.15, 24), metal);
      var a = -Math.PI / 4, hr = 1 + 0.575;
      handle.position.set(Math.cos(a) * hr, Math.sin(a) * hr, 0);
      handle.rotation.z = Math.PI / 4;
      lens.add(glass, rim, handle);
      lens.scale.setScalar(0.82);
      lens.position.set(0, 0.15, 1.15);
      c.lens = lens; c.lx = -3; c.lv = 0;
      c.accent = new THREE.Color(0x3d64d8); c.red = new THREE.Color(0xf87171); c.black = new THREE.Color(0x000000);
    },
    update:function(c, dt){
      var span = 3.6;
      var target = c.pointer.inside ? c.pointer.x * span * 1.05 : (reduced ? c.dips[1].col.mesh.position.x : Math.sin(c.clock * 0.32) * span * 0.92);
      target = Math.max(-span, Math.min(span, target));
      var prev = c.lx;
      var k = dt ? Math.min(1, dt * (c.pointer.inside ? 5 : 2.2)) : 1;
      c.lx += (target - c.lx) * k;
      var vel = dt ? (c.lx - prev) / dt : 0;
      c.lv += (vel - c.lv) * (dt ? Math.min(1, dt * 6) : 1);
      c.lens.position.x = c.lx;
      c.lens.position.y = 0.15 + (reduced ? 0 : Math.sin(c.clock * 1.1) * 0.05);
      c.lens.rotation.y = -c.lv * 0.06;
      c.lens.rotation.z = c.lv * 0.025;

      var R = 0.95;
      c.cols.forEach(function(col){
        var d = Math.abs(col.mesh.position.x - c.lx);
        var p = Math.max(0, 1 - d / R); p = p * p * (3 - 2 * p);
        if (col.dip) { col.near = p; col.mat.emissive.copy(c.black).lerp(c.red, 0.18 + p * 0.75); }
        else col.mat.emissive.copy(c.black).lerp(c.accent, p * 0.6);
      });
      c.dips.forEach(function(d){ d.tag.style.opacity = Math.min(1, (d.col.near || 0) * 1.6).toFixed(2); });

      var d = 9.2 * Math.max(1, 1.95 / c.aspect);
      var ty = c.pointer.inside ? c.pointer.y * 0.35 : 0;
      c.camera.position.set(0, 1.0 + ty, d);
      c.camera.lookAt(0, 0.1, 0);
    },
    after:function(c){
      c.chart.updateMatrixWorld();
      c.dips.forEach(function(d){ placeTag(d.tag, c.chart.localToWorld(v3.copy(d.top)).clone(), c.camera, c.W, c.H, 'translate(-50%,-100%)'); });
    }
  });
})();
