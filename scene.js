import * as THREE from './vendor/three.module.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

export function makeTreeScene(container, onPick, onViewChange = () => {}) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  let visible = true, framePending = false, viewAngle = 0, velocity = 0, targetAngle = null, autoRotate = false, sparkleOn = true, paused = false, capturing = false, motionTime = 0, lastFrame = performance.now();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function changed() { onViewChange({ angle: viewAngle, auto: autoRotate }); }
  function active() { return !paused && !capturing && (autoRotate || targetAngle !== null || Math.abs(velocity) > .002 || (sparkleOn && !reduced.matches)); }
  function invalidate() {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(t => {
      framePending = false;
      const dt = Math.max(0, Math.min(.05, (t - lastFrame) / 1000)); lastFrame = t;
      if (!visible || document.hidden || capturing) return;
      if (!paused) {
        motionTime += dt;
        const wasMoving = targetAngle !== null || Math.abs(velocity) > .002;
        if (autoRotate) { velocity += (Math.PI * 2 / 24 - velocity) * (1 - Math.exp(-dt * 7)); viewAngle += velocity * dt; }
        else if (targetAngle !== null) { const acceleration = (targetAngle - viewAngle) * 324 - velocity * 36; velocity += acceleration * dt; viewAngle += velocity * dt; if (Math.abs(targetAngle - viewAngle) < .001 && Math.abs(velocity) < .01) { viewAngle = targetAngle; targetAngle = null; velocity = 0; } }
        else if (Math.abs(velocity) > .002) { viewAngle += velocity * dt; velocity *= Math.exp(-dt * 6); }
        else velocity = 0;
        treeGroup.rotation.y = viewAngle;
        setSparklePhase(motionTime * Math.PI * 2 / 3, reduced.matches);
        if (wasMoving && !autoRotate && targetAngle === null && Math.abs(velocity) <= .002) changed();
      }
      renderer.render(scene, camera);
      if (active()) invalidate();
    });
  }
  const environment = new THREE.PMREMGenerator(renderer); scene.environment = environment.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .5;
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 30); camera.position.set(.1, 2.1, 7.35); camera.lookAt(0, 1.65, 0);
  const key = new THREE.DirectionalLight(0xffead4, 2.2); key.position.set(-3, 5, 5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -3; key.shadow.camera.right = 3; key.shadow.camera.top = 5; key.shadow.camera.bottom = -2; key.shadow.normalBias = .04;
  scene.add(key, new THREE.AmbientLight(0xffffff, .5));
  const fill = new THREE.DirectionalLight(0xe9f2e0, .9); fill.position.set(4, 2, 3); scene.add(fill);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.ShadowMaterial({ opacity: .13 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.position.y = -.02; scene.add(ground);
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .62, ...extra });
  const treeGroup = new THREE.Group(); scene.add(treeGroup);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.055, .09, .65, 10), mat(0x765239)); trunk.position.y = .28; treeGroup.add(trunk);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.06, .035, 56), mat(0xaa4139, { roughness: .95 })); skirt.position.y = .02; scene.add(skirt);
  for (let row = 0; row < 8; row++) {
    const y = .63 + row * .35, radius = 1.05 - row * .116;
    const core = new THREE.Mesh(new THREE.ConeGeometry(radius, .84, 16), mat(row % 2 ? 0x2d553c : 0x315b40)); core.position.y = y; core.castShadow = true; treeGroup.add(core);
  }
  // Soft pine sprigs around each tier. Instancing keeps the ornament canvas responsive.
  const needleGeo = new THREE.CylinderGeometry(.004, .008, .13, 4);
  const needles = new THREE.InstancedMesh(needleGeo, mat(0xffffff, { roughness: .9 }), 7200);
  const dummy = new THREE.Object3D(), direction = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let index = 0;
  for (let row = 0; row < 10; row++) {
    const y = .45 + row * .28, radius = 1.12 - row * .096;
    for (let branch = 0; branch < 18; branch++) {
      const angle = branch / 18 * Math.PI * 2 + row * .37;
      for (let part = 0; part < 20; part++) for (let side = 0; side < 2; side++) {
        const t = .22 + part / 20 * .79, a = angle + (side ? 1 : -1) * (.025 + t * .08);
        dummy.position.set(Math.cos(a) * radius * t, y - .13 * t + (Math.random() - .5) * .05, Math.sin(a) * radius * t);
        direction.set(Math.cos(angle + (side ? .85 : -.85)), -.45 + Math.random() * .4, Math.sin(angle + (side ? .85 : -.85))).normalize();
        dummy.quaternion.setFromUnitVectors(up, direction); dummy.scale.setScalar(.75 + Math.random() * .55); dummy.updateMatrix(); needles.setMatrixAt(index, dummy.matrix);
        needles.setColorAt(index, new THREE.Color([0x234b2d, 0x2d5735, 0x356442, 0x1e3e28, 0x426c46][Math.floor(Math.random() * 5)])); index++;
      }
    }
  }
  needles.count = index; needles.castShadow = true; treeGroup.add(needles);
  const lightPoints = [], bulbGroup = new THREE.Group();
  for (let i = 0; i <= 320; i++) {
    const t = i / 320, a = t * Math.PI * 2 * 5.5;
    const r = 1.09 * (1 - t) + .06;
    lightPoints.push(new THREE.Vector3(Math.cos(a) * r, .48 + t * 2.65, Math.sin(a) * r));
  }
  const wire = new THREE.Line(new THREE.BufferGeometry().setFromPoints(lightPoints), new THREE.LineBasicMaterial({ color: 0xc6ad73 })); treeGroup.add(wire);
  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 64;
  const gc = glowCanvas.getContext('2d'), gradient = gc.createRadialGradient(32, 32, 0, 32, 32, 31); gradient.addColorStop(0, '#ffefac'); gradient.addColorStop(.23, '#ffe4a0b0'); gradient.addColorStop(1, '#ffe4a000'); gc.fillStyle = gradient; gc.fillRect(0, 0, 64, 64);
  const glowMaterial = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowCanvas), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let i = 1; i < lightPoints.length; i += 7) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.019, 8, 8), mat(0xffe9b0, { emissive: 0xffc74d, emissiveIntensity: 1.8 })); bulb.position.copy(lightPoints[i]); bulbGroup.add(bulb);
    const glow = new THREE.Sprite(glowMaterial); glow.scale.set(.15, .15, 1); glow.position.copy(bulb.position); bulbGroup.add(glow);
  }
  treeGroup.add(bulbGroup);
  function starShape(radius) {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? radius * .45 : radius; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) shape.lineTo(x, y); else shape.moveTo(x, y); } shape.closePath(); return shape;
  }
  let topStar, topperConfig = { shape:'classic', color:'#d8b264' };
  function setTopper(config) {
    const selected = {shape:['classic','north','sparkle'].includes(config.shape)?config.shape:'classic',color:['#d8b264','#dce4e6','#a84640'].includes(config.color)?config.color:'#d8b264'};
    if (topStar) {treeGroup.remove(topStar);topStar.geometry.dispose();topStar.material.dispose();}
    let shape;
    if (selected.shape==='classic') shape=starShape(.25);
    else {shape=new THREE.Shape();const tips=selected.shape==='north'?8:4;for(let i=0;i<tips*2;i++){const a=i/(tips*2)*Math.PI*2+Math.PI/2;const r=i%2?.07:(selected.shape==='north'&&i%4===2?.18:.28);const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i)shape.lineTo(x,y);else shape.moveTo(x,y);}shape.closePath();}
    topStar=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.05,bevelEnabled:true,bevelThickness:.014,bevelSize:.012,bevelSegments:2}),mat(selected.color,{metalness:.75,roughness:.22}));topStar.position.set(0,3.48,-.01);treeGroup.add(topStar);topperConfig=selected;invalidate();
  }
  setTopper(topperConfig);
  function present(x, z, size, color) {
    const gift = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(size, size * .75, size), mat(color)); box.castShadow = true; gift.add(box);
    const ribbonMat = mat(0xeed39f, { metalness: .2 });
    gift.add(new THREE.Mesh(new THREE.BoxGeometry(size + .01, size * .77, size * .12), ribbonMat), new THREE.Mesh(new THREE.BoxGeometry(size * .12, size * .77, size + .01), ribbonMat));
    const bow = new THREE.Mesh(new THREE.TorusGeometry(size * .13, size * .025, 6, 16), ribbonMat); bow.rotation.x = Math.PI / 2; bow.position.y = size * .43; gift.add(bow); gift.position.set(x, size * .4, z); gift.rotation.y = x; scene.add(gift);
  }
  present(-.75, .73, .38, 0xdeb697); present(.66, .5, .32, 0x416653);
  const ornaments = new THREE.Group(); treeGroup.add(ornaments);
  let ghost, selection = { shape: 'bauble', color: '#b64038', size: 1 }, ghostPosition = { x: 0, y: .55 };
  const ornamentMeshes = [];
  function makeOrnament(data, transparent = false) {
    const group = new THREE.Group(), colored = new THREE.MeshPhysicalMaterial({ color: data.color, metalness: .35, roughness: .24, clearcoat: .9, transparent, opacity: transparent ? .45 : 1, depthWrite: !transparent });
    const gold = new THREE.MeshStandardMaterial({ color: 0xc9a060, metalness: .75, roughness: .25, transparent, opacity: transparent ? .45 : 1 });
    const white = new THREE.MeshStandardMaterial({ color: 0xfff1d9, roughness: .3, transparent, opacity: transparent ? .45 : 1 });
    if (data.shape === 'bauble') group.add(new THREE.Mesh(new THREE.SphereGeometry(.115, 24, 18), colored));
    if (data.shape === 'star') group.add(new THREE.Mesh(new THREE.ExtrudeGeometry(starShape(.14), { depth: .03, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 2 }), colored));
    if (data.shape === 'heart') {
      const s = new THREE.Shape(); s.moveTo(0, -.13); s.bezierCurveTo(-.21, .02, -.14, .18, 0, .08); s.bezierCurveTo(.14, .18, .21, .02, 0, -.13);
      group.add(new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: .035, bevelEnabled: true, bevelSize: .006, bevelThickness: .006, bevelSegments: 2 }), colored));
    }
    if (data.shape === 'bell') { group.add(new THREE.Mesh(new THREE.CylinderGeometry(.055, .12, .18, 24), colored)); const lip = new THREE.Mesh(new THREE.TorusGeometry(.12, .012, 6, 24), gold); lip.rotation.x = Math.PI / 2; lip.position.y = -.085; group.add(lip); const clapper = new THREE.Mesh(new THREE.SphereGeometry(.025, 8, 8), gold); clapper.position.y = -.11; group.add(clapper); }
    if (data.shape === 'candy') {
      const points = [new THREE.Vector3(0, -.15, 0), new THREE.Vector3(0, .07, 0), new THREE.Vector3(.035, .14, 0), new THREE.Vector3(.09, .13, 0), new THREE.Vector3(.105, .075, 0)];
      group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, .024, 8, false), colored));
      for (let i = 0; i < 5; i++) { const stripe = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .015, 10), white); stripe.position.y = -.125 + i * .047; stripe.rotation.z = -.2; group.add(stripe); }
    }
    if (data.shape === 'bow') { for (const sign of [-1, 1]) { const loop = new THREE.Mesh(new THREE.TorusGeometry(.065, .021, 8, 20), colored); loop.scale.set(1.2, .85, 1); loop.position.x = sign * .068; loop.rotation.y = sign * .15; group.add(loop); const tail = new THREE.Mesh(new THREE.BoxGeometry(.035, .13, .019), colored); tail.position.set(sign * .038, -.087, 0); tail.rotation.z = sign * .23; group.add(tail); } group.add(new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 10), gold)); }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.024, .026, .023, 12), gold); cap.position.y = .13; group.add(cap);
    const string = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, .14, 0), new THREE.Vector3(.012, .23, -.01)]), new THREE.LineBasicMaterial({ color: 0xa49168, transparent, opacity: transparent ? .4 : 1 })); group.add(string);
    group.scale.setScalar(data.size || 1); group.userData.ornament = data;
    group.traverse(n => { if (n.isMesh) { n.castShadow = !transparent; if (!transparent) ornamentMeshes.push(n); n.userData.ornament = data; } });
    return group;
  }
  const radiusAt = y => 1.17 * (1 - y * .88);
  function place(group, p) { const y = .35 + p.y * 3.05, r = radiusAt(p.y), x = p.x * r; group.position.set(x, y, Math.sqrt(Math.max(.03, r * r - x * x)) * .7 + .12).applyAxisAngle(up, -(p.angle || 0)); group.rotation.y = -(p.angle || 0); }
  function dispose(group) { group.traverse(n => { n.geometry?.dispose(); if (n.material && n.material !== glowMaterial) { for (const m of Array.isArray(n.material) ? n.material : [n.material]) m.dispose(); } }); }
  function setSelection(data) { selection = data; if (ghost) { treeGroup.remove(ghost); dispose(ghost); } ghost = makeOrnament({ ...data, id: 'ghost' }, true); ghost.visible = false; place(ghost, ghostPosition); treeGroup.add(ghost); invalidate(); }
  function setOrnaments(data) { for (const child of [...ornaments.children]) { ornaments.remove(child); dispose(child); } ornamentMeshes.length = 0; for (const item of data) { const o = makeOrnament(item); place(o, item); ornaments.add(o); } invalidate(); }
  const sparkleCanvas = document.createElement('canvas'); sparkleCanvas.width = sparkleCanvas.height = 64;
  const sc = sparkleCanvas.getContext('2d'); sc.fillStyle = '#d9b66f'; sc.beginPath();
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r = i % 2 ? 5 : 29; const x = 32 + Math.cos(a) * r, y = 32 + Math.sin(a) * r; if (!i) sc.moveTo(x, y); else sc.lineTo(x, y); } sc.closePath(); sc.fill();
  const sparkleTexture = new THREE.CanvasTexture(sparkleCanvas), sparkleGroup = new THREE.Group(); scene.add(sparkleGroup);
  for (let i = 0; i < 22; i++) { const star = new THREE.Sprite(new THREE.SpriteMaterial({map:sparkleTexture,transparent:true,depthWrite:false,toneMapped:false})); const y = .25 + (i / 21) * 3.25, sign = i % 2 ? 1 : -1; star.position.set(sign * (.32 + (1 - i / 25) * 1.15), y, .6); star.userData.phase = i * 2.39; sparkleGroup.add(star); }
  function setSparklePhase(phase, still = false) { for (const star of sparkleGroup.children) { const opacity = still ? .5 : .24 + .46 * Math.pow((1 + Math.sin(phase + star.userData.phase)) / 2, 2); star.material.opacity = opacity; const scale = .07 + opacity * .06; star.scale.set(scale, scale, 1); } }
  setSparklePhase(0, reduced.matches);
  function setAuto(on) { autoRotate = on; targetAngle = null; if (!on) velocity = 0; ghost.visible = false; lastFrame = performance.now(); changed(); invalidate(); }
  function turn(amount) { autoRotate = false; if (reduced.matches) { viewAngle += amount; treeGroup.rotation.y = viewAngle; targetAngle = null; velocity = 0; changed(); } else targetAngle = viewAngle + amount; ghost.visible = false; changed(); invalidate(); }
  reduced.addEventListener('change', () => { if (reduced.matches) setAuto(false); setSparklePhase(motionTime * Math.PI * 2 / 3, reduced.matches); invalidate(); });
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), dropPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -.65);
  function locate(event) { const r = renderer.domElement.getBoundingClientRect(); pointer.set((event.clientX - r.left) / r.width * 2 - 1, -(event.clientY - r.top) / r.height * 2 + 1); scene.updateMatrixWorld(true); raycaster.setFromCamera(pointer, camera); const point = raycaster.ray.intersectPlane(dropPlane, new THREE.Vector3()); if (!point) return null; const y = (point.y - .35) / 3.05, x = point.x / radiusAt(y); return y >= .1 && y <= .92 && Math.abs(x) <= .92 ? { x, y, angle: viewAngle } : null; }
  let down;
  renderer.domElement.addEventListener('pointerdown', e => { setAuto(false); velocity = 0; targetAngle = null; down = {x:e.clientX,y:e.clientY,angle:viewAngle,lastAngle:viewAngle,lastTime:e.timeStamp,velocity:0,dragged:false}; renderer.domElement.setPointerCapture(e.pointerId); });
  renderer.domElement.addEventListener('pointercancel', () => { down = null; velocity = 0; });
  renderer.domElement.addEventListener('pointermove', e => {
    if (down) {
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (down.dragged || (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.1)) {
        down.dragged = true; viewAngle = down.angle + dx * .008;
        const dt = Math.max(.001, (e.timeStamp - down.lastTime) / 1000); down.velocity = Math.max(-4, Math.min(4, (viewAngle - down.lastAngle) / dt)); down.lastAngle = viewAngle; down.lastTime = e.timeStamp;
        treeGroup.rotation.y = viewAngle; ghost.visible = false; invalidate(); return;
      }
    }
    const p = locate(e); if (p && e.pointerType !== 'touch' && !autoRotate) { ghostPosition = p; place(ghost, p); ghost.visible = true; } else ghost.visible = false; invalidate();
  });
  renderer.domElement.addEventListener('pointerleave', () => { ghost.visible = false; invalidate(); });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down) return;
    const action = down; down = null;
    if (renderer.domElement.hasPointerCapture(e.pointerId)) renderer.domElement.releasePointerCapture(e.pointerId);
    if (action.dragged) { velocity = reduced.matches || e.timeStamp - action.lastTime > 80 ? 0 : action.velocity; changed(); invalidate(); return; }
    if (Math.hypot(e.clientX - action.x, e.clientY - action.y) > 8) return;
    const p = locate(e), hit = raycaster.intersectObjects(ornamentMeshes)[0]; if (hit) onPick({existing:hit.object.userData.ornament}); else if (p) onPick({position:p});
  });
  container.addEventListener('keydown', e => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
      e.preventDefault(); setAuto(false); ghostPosition.angle = viewAngle;
      if (e.code === 'ArrowUp') ghostPosition.y = Math.min(.92,ghostPosition.y+.05); if (e.code === 'ArrowDown') ghostPosition.y = Math.max(.1,ghostPosition.y-.05); if (e.code === 'ArrowLeft') ghostPosition.x = Math.max(-.92,ghostPosition.x-.08); if (e.code === 'ArrowRight') ghostPosition.x = Math.min(.92,ghostPosition.x+.08); ghost.visible = true; place(ghost,ghostPosition);
    }
    if (e.code === 'Enter') { e.preventDefault(); ghostPosition.angle = viewAngle; onPick({position:{...ghostPosition}}); } invalidate();
  });
  setSelection(selection);
  const resize = () => { const r = container.getBoundingClientRect(); renderer.setSize(r.width, r.height); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); invalidate(); }; new ResizeObserver(resize).observe(container); resize();
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) invalidate(); }).observe(container);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) invalidate(); });
  invalidate();
  async function capture(width = 840, height = 1080, pose = {}) {
    const oldSize = renderer.getSize(new THREE.Vector2()), ratio = renderer.getPixelRatio(), aspect = camera.aspect, ghostVisible = ghost.visible, angle = treeGroup.rotation.y;
    let result;
    capturing = true;
    try {
      ghost.visible = false;
      if (Number.isFinite(pose.rotation)) treeGroup.rotation.y = pose.rotation;
      if (Number.isFinite(pose.phase)) setSparklePhase(pose.phase, false);
      renderer.setPixelRatio(1); renderer.setSize(width,height,false); camera.aspect = width/height; camera.updateProjectionMatrix(); renderer.render(scene,camera);
      result = document.createElement('canvas'); result.width = width; result.height = height; result.getContext('2d').drawImage(renderer.domElement,0,0);
    } finally {
      renderer.setPixelRatio(ratio); renderer.setSize(oldSize.x,oldSize.y,false); camera.aspect=aspect; camera.updateProjectionMatrix(); ghost.visible=ghostVisible; treeGroup.rotation.y=angle; setSparklePhase(motionTime*Math.PI*2/3,reduced.matches); capturing=false; renderer.render(scene,camera); invalidate();
    }
    return result;
  }
  return {
    setSelection,setOrnaments,capture,turn,setAuto,topper:setTopper,
    setAngle: angle => {viewAngle=Number.isFinite(angle)?angle:0;treeGroup.rotation.y=viewAngle;velocity=0;targetAngle=null;invalidate();},
    pause: on => {paused=on;lastFrame=performance.now();invalidate();},
    sparkles: on => {sparkleOn=on;sparkleGroup.visible=on;invalidate();},
    state: () => ({angle:viewAngle,auto:autoRotate,sparkles:sparkleOn,sparkleCount:sparkleGroup.children.length,topper:{...topperConfig},animating:active()}),
    lights: on => {bulbGroup.visible=on;wire.material.color.set(on?0xc6ad73:0x77876d);invalidate();},
    count: () => ornaments.children.length
  };
}
