// Ops Floor — 3D ofis görünümü (three.js, prosedürel 3D insan modelleri ve genişletilmiş 8 odalı ofis)
import * as THREE from "./vendor/three.module.min.js";
import { GLTFLoader } from "./vendor/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "./vendor/utils/SkeletonUtils.js";

const gltfLoader = new GLTFLoader();
const gltfCache = new Map();

function loadModel(url) {
  if (!gltfCache.has(url)) {
    gltfCache.set(url, new Promise((resolve, reject) => {
      gltfLoader.load(url, resolve, undefined, reject);
    }).catch((err) => {
      gltfCache.delete(url);
      throw err;
    }));
  }
  return gltfCache.get(url);
}

function normalizeHeight(obj, target) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  obj.scale.multiplyScalar(target / Math.max(size.y, 0.001));
  obj.updateMatrixWorld(true);
  box.setFromObject(obj);
  obj.position.y -= box.min.y;
  return box;
}

function fitModel(obj, height = 1.15, footprint = 0.84) {
  obj.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(obj);
  let size = box.getSize(new THREE.Vector3());
  const scale = Math.min(
    height / Math.max(size.y, 1e-3),
    footprint / Math.max(size.x, size.z, 1e-3)
  );
  obj.scale.multiplyScalar(scale);
  obj.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(obj);
  size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  obj.position.x -= center.x;
  obj.position.z -= center.z;
  obj.position.y -= box.min.y;
  const offset = Math.max(0.26, footprint * 0.58);
  obj.updateMatrixWorld(true);
  return { size: size.toArray().map((n) => Number(n.toFixed(2))), scale: Number(scale.toFixed(3)), offset: Number(offset.toFixed(2)) };
}

const W = 24, H = 18;
const toX = (x) => x - W / 2;
const toZ = (y) => y - H / 2;

const C = {
  wall: 0x16202e,
  deskTop: 0x2b3648,
  deskLeg: 0x1a2230,
  metal: 0x1d2634,
  screen: 0x6fd3c0,
  amber: 0xe8b45a,
  pink: 0xef9aae,
  cream: 0xf6efe2,
};

function standard(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.08, ...opts });
}

function box(w, h, d, color, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), standard(color, opts));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function createStudioEnv(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileCubemapShader();
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x1e293b);
  const panel = (w, h, color, pos) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    s.add(m);
  };
  panel(14, 14, 0xffffff, [0, 7, 0]);
  panel(10, 10, 0xfff7ed, [6, 3, 6]);
  panel(9, 9, 0x38bdf8, [-7, 2, 3]);
  panel(10, 8, 0xc084fc, [0, 4, -7]);
  panel(14, 14, 0xfde68a, [0, -6, 0]);
  const tex = pmrem.fromScene(s, 0.04).texture;
  pmrem.dispose();
  return tex;
}

function floorTexture(isLight) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = isLight ? "#e2e9f3" : "#101823";
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = isLight ? "rgba(16,24,40,0.12)" : "rgba(130,165,205,0.10)";
  g.lineWidth = 2;
  g.strokeRect(0, 0, 128, 128);
  g.fillStyle = isLight ? "rgba(16,24,40,0.025)" : "rgba(255,255,255,0.018)";
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(W, H);
  t.anisotropy = 4;
  return t;
}

function makeDesk(x, y, color, boss = false) {
  const g = new THREE.Group();
  g.position.set(toX(x + 0.95), 0, toZ(y + 0.48));

  const Wd = boss ? 2.9 : 1.9;
  const D = boss ? 1.35 : 0.95;
  const topY = boss ? 0.68 : 0.62;
  const wood = boss ? 0x5a3b26 : C.deskTop;
  const edge = boss ? 0x241812 : 0x3c4c62;

  if (boss) {
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 3.0), new THREE.MeshStandardMaterial({ color: 0x4a2b2b, roughness: 0.95 }));
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0.85, 0.014, 0.72);
    g.add(rug);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(Wd + 0.04, 0.02, 0.05), standard(C.amber, { emissive: new THREE.Color(C.amber), emissiveIntensity: 0.4 }));
    trim.position.set(0, topY + 0.015, D / 2 + 0.01);
    g.add(trim);
  }

  const top = box(Wd, boss ? 0.1 : 0.08, D, wood);
  top.position.y = topY;
  top.userData.role = "top";
  g.add(top);

  const lip = box(Wd, 0.025, 0.03, edge);
  lip.position.set(0, topY + 0.04, D / 2);
  g.add(lip);

  if (boss) {
    for (const s of [-1, 1]) {
      const panel = box(0.1, 0.66, D - 0.18, 0x2b1e18);
      panel.position.set(s * (Wd / 2 - 0.11), 0.33, 0);
      panel.userData.role = "leg";
      g.add(panel);
    }
    const modesty = box(Wd - 0.5, 0.52, 0.07, 0x2b1e18);
    modesty.position.set(0, 0.36, -D / 2 + 0.12);
    modesty.userData.role = "leg";
    g.add(modesty);
    const mat = box(1.15, 0.015, 0.58, 0x1d2b33);
    mat.position.set(0, topY + 0.06, 0.16);
    g.add(mat);
  } else {
    for (const [lx, lz] of [[-0.85, -0.4], [0.85, -0.4], [-0.85, 0.4], [0.85, 0.4]]) {
      const leg = box(0.07, 0.6, 0.07, C.deskLeg);
      leg.position.set(lx, 0.3, lz);
      leg.userData.role = "leg";
      g.add(leg);
    }
  }

  const plateMat = standard(boss ? C.amber : 0x39485c, boss
    ? { emissive: new THREE.Color(C.amber), emissiveIntensity: 0.28, roughness: 0.5 }
    : { roughness: 0.6 });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(boss ? 0.66 : 0.34, 0.028, boss ? 0.16 : 0.1), plateMat);
  plate.position.set(0, topY + 0.055, D / 2 - (boss ? 0.12 : 0.08));
  g.add(plate);
  if (!boss) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.012, 0.03),
      standard(new THREE.Color(color).getHex(), { emissive: new THREE.Color(color), emissiveIntensity: 0.35 })
    );
    strip.position.set(0, topY + 0.045, D / 2 - 0.02);
    g.add(strip);
  }

  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x0d1a22, emissive: new THREE.Color(C.screen), emissiveIntensity: 0.15, roughness: 0.4,
  });

  const screens = boss ? [-0.44, 0.44] : [0];
  const sw = boss ? 0.66 : 0.58;
  for (const sx of screens) {
    const stand = box(0.07, 0.2, 0.07, C.metal);
    stand.position.set(sx, topY + 0.13, -0.22);
    g.add(stand);
    const frame = box(sw + 0.08, 0.42, 0.05, 0x0c121b);
    frame.position.set(sx, topY + 0.42, -0.22);
    g.add(frame);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, 0.34), screenMat);
    screen.position.set(sx, topY + 0.42, -0.19);
    g.add(screen);
  }

  const kb = box(boss ? 0.62 : 0.55, 0.03, 0.18, 0x232d3c);
  kb.position.set(0, topY + 0.06, 0.16);
  g.add(kb);

  const cup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.04, 0.1, 12),
    standard(C.amber, { emissive: new THREE.Color(C.amber), emissiveIntensity: 0.25 })
  );
  cup.position.set(boss ? 0.86 : 0.62, topY + 0.11, -0.05);
  g.add(cup);

  const chairZ = boss ? 1.14 : 0.78;
  const chairScale = boss ? 1.18 : 1;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * chairScale, 0.26 * chairScale, 0.03, 20), standard(0x151c27));
  base.position.set(0, 0.03, chairZ);
  g.add(base);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.34, 10), standard(0x2a3547));
  stem.position.set(0, 0.22, chairZ);
  g.add(stem);
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * chairScale, 0.24 * chairScale, 0.07, 20), standard(boss ? 0x2a2118 : 0x1b2431));
  seat.position.set(0, 0.42, chairZ);
  seat.userData.role = "chair";
  g.add(seat);
  const back = box(0.44 * chairScale, 0.46 * (boss ? 1.15 : 1), 0.055, boss ? 0x2a2118 : 0x1b2431);
  back.position.set(0, 0.66 + (boss ? 0.05 : 0), chairZ + 0.22);
  back.rotation.x = -0.12;
  back.userData.role = "chair";
  g.add(back);

  g.userData.screenMat = screenMat;
  return g;
}

function makePlant(x, y) {
  const g = new THREE.Group();
  g.position.set(toX(x), 0, toZ(y));
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.24, 14), standard(0x2a3341));
  pot.position.y = 0.12;
  pot.castShadow = true;
  g.add(pot);
  for (let i = 0; i < 4; i++) {
    const leaf = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.2, 0),
      standard(i % 2 ? 0x4f8f72 : 0x3f7a60, { roughness: 0.9 })
    );
    leaf.position.set(Math.cos(i * 1.7) * 0.13, 0.38 + (i % 2) * 0.12, Math.sin(i * 1.7) * 0.13);
    leaf.castShadow = true;
    g.add(leaf);
  }
  return g;
}

function makeRack(x, y) {
  const g = new THREE.Group();
  g.position.set(toX(x + 0.4), 0, toZ(y + 0.3));
  const body = box(0.8, 1.35, 0.62, 0x1b2431);
  body.position.y = 0.675;
  g.add(body);
  for (let i = 0; i < 4; i++) {
    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 8, 8),
      standard(i === 3 ? 0xf08a8a : 0x6fd3c0, { emissive: new THREE.Color(i === 3 ? 0xf08a8a : 0x6fd3c0), emissiveIntensity: 1.4 })
    );
    led.position.set(-0.22 + i * 0.12, 1.16, 0.32);
    g.add(led);
  }
  return g;
}

function makeTable(x, y) {
  const g = new THREE.Group();
  g.position.set(toX(x + 1.15), 0, toZ(y + 0.58));
  const top = box(2.3, 0.09, 1.15, C.deskTop);
  top.position.y = 0.56;
  g.add(top);
  for (const [lx, lz] of [[-1.02, -0.46], [1.02, -0.46], [-1.02, 0.46], [1.02, 0.46]]) {
    const leg = box(0.08, 0.52, 0.08, C.deskLeg);
    leg.position.set(lx, 0.26, lz);
    g.add(leg);
  }
  return g;
}

function makeBoard(x, y) {
  const g = new THREE.Group();
  g.position.set(toX(x + 0.95), 0, toZ(y + 0.06));
  const panel = box(1.9, 1.05, 0.06, 0x243040);
  panel.position.y = 0.95;
  g.add(panel);
  const legs = box(1.7, 0.05, 0.16, C.metal);
  legs.position.y = 0.4;
  g.add(legs);
  return g;
}

/* =====================================================================
   Prosedürel 3D İnsan Figürü (Profesyonel Ofis Personeli)
   ===================================================================== */
function makeHumanAvatar(colorHex, accessory = "none") {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const skinMat = standard(0xf2d3bc, { roughness: 0.5 });
  const suitMat = standard(0x1f293d, { roughness: 0.4, metalness: 0.1 });
  const accentColor = new THREE.Color(colorHex).getHex();
  const accentMat = standard(accentColor, { roughness: 0.3, emissive: new THREE.Color(accentColor), emissiveIntensity: 0.3 });

  // Pürüzsüz ve organik Gövde (Cylinder/Capsule, kare değil)
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.56, 24), suitMat);
  torso.position.y = 0.52;
  torso.castShadow = true;
  body.add(torso);

  // Zarif Kravat / Yaka detayı (konik pürüzsüz form)
  const tie = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.3, 16), accentMat);
  tie.position.set(0, 0.52, 0.14);
  tie.rotation.x = Math.PI;
  body.add(tie);

  // Kafa (pürüzsüz küre)
  const head = new THREE.Group();
  head.position.set(0, 0.98, 0);
  body.add(head);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 32), skinMat);
  skull.position.y = 0.12;
  skull.castShadow = true;
  head.add(skull);

  // Pürüzsüz Saç / Stil
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.23, 24, 24), standard(0x1a202c, { roughness: 0.7 }));
  hair.position.set(0, 0.22, -0.02);
  hair.scale.set(1.02, 0.7, 1.06);
  head.add(hair);

  // Gözler (pürüzsüz küreler)
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 16), standard(0x0f172a));
    eye.position.set(s * 0.075, 0.1, 0.19);
    head.add(eye);
  }

  // Pürüzsüz Kolluklar ve Eller
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(s * 0.27, 0.72, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.3, 12, 16), suitMat);
    upper.position.set(0, -0.15, 0);
    upper.castShadow = true;
    arm.add(upper);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 16), skinMat);
    hand.position.set(0, -0.32, 0);
    arm.add(hand);
    arm.rotation.z = s * 0.12;
    body.add(arm);
    arms.push(arm);
  }

  // Pürüzsüz Bacaklar ve Ayakkabılar
  const limbs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s * 0.12, 0.24, 0);
    const pants = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.34, 12, 16), standard(0x111827));
    pants.position.set(0, -0.17, 0);
    pants.castShadow = true;
    leg.add(pants);
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), standard(0x0b0f19));
    shoe.scale.set(1.1, 0.7, 1.5);
    shoe.position.set(0, -0.38, 0.04);
    leg.add(shoe);
    body.add(leg);
    limbs.push(leg);
  }

  root.scale.setScalar(0.92);
  return { root, parts: { head, arms, limbs } };
}

let SHADOW_TEX = null;
function shadowTexture() {
  if (SHADOW_TEX) return SHADOW_TEX;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const rg = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  rg.addColorStop(0, "rgba(0,0,0,0.55)");
  rg.addColorStop(0.55, "rgba(0,0,0,0.22)");
  rg.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = rg;
  g.fillRect(0, 0, 128, 128);
  SHADOW_TEX = new THREE.CanvasTexture(c);
  return SHADOW_TEX;
}

const FOLDER_TEX = {};
function folderTexture(tone = "gold") {
  if (FOLDER_TEX[tone]) return FOLDER_TEX[tone];
  const colors = { gold: "#E8B45A", green: "#6FD3A0", red: "#F08A8A", orange: "#F0A04A" };
  const c = document.createElement("canvas");
  c.width = 128; c.height = 96;
  const g = c.getContext("2d");
  g.clearRect(0, 0, 128, 96);
  g.fillStyle = colors[tone] || colors.gold;
  g.strokeStyle = "rgba(0,0,0,0.5)";
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(18, 34); g.lineTo(52, 34); g.lineTo(58, 22); g.lineTo(86, 22);
  g.lineTo(94, 34); g.lineTo(110, 34); g.lineTo(110, 78); g.lineTo(18, 78);
  g.closePath();
  g.fill(); g.stroke();
  FOLDER_TEX[tone] = new THREE.CanvasTexture(c);
  return FOLDER_TEX[tone];
}

function makeAgent(a) {
  const g = new THREE.Group();
  const visual = new THREE.Group();
  g.add(visual);

  const human = makeHumanAvatar(a.color, a.accessory || "none");
  visual.add(human.root);

  if (a.model) {
    let src = String(a.model).trim();
    if (/^models\//i.test(src)) src = "/" + src;
    loadModel(src).then((gltf) => {
      const obj = cloneSkeleton(gltf.scene);
      obj.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
      normalizeHeight(obj, 1.4);
      const ms = Math.max(0.4, Math.min(2.8, Number(a.modelScale) || 1));
      const fit = fitModel(obj, 1.15 * ms, 0.84 * ms);
      visual.position.z = fit.offset;
      g.userData.modelSize = fit.size;
      human.root.visible = false;
      visual.add(obj);
    }).catch(() => {});
  }

  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(a.color), transparent: true, opacity: 0.75, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.37, 40), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  visual.add(ring);

  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.15),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, opacity: 0.36, depthWrite: false })
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.013;
  visual.add(contact);

  const cv = document.createElement("canvas");
  cv.width = 512; cv.height = 128;
  const ctx = cv.getContext("2d");
  ctx.font = "600 52px ui-sans-serif, 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(226,236,248,0.92)";
  ctx.fillText(a.name, 256, 68);
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.9 }));
  sprite.position.y = 1.3;
  sprite.scale.set(1.5, 0.37, 1);
  visual.add(sprite);

  const folderSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: folderTexture(), transparent: true, depthWrite: false }));
  folderSprite.position.y = 1.95;
  folderSprite.scale.set(0.52, 0.39, 1);
  folderSprite.visible = false;
  visual.add(folderSprite);

  g.userData = { human, ring, ringMat, sprite, contact, folderSprite };
  return g;
}

export function createMascotPreview(container, char = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 60);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight, false);
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0x9db7e0, 0x0a0f18, 1.2));
  const key = new THREE.DirectionalLight(0xffe0b0, 2.1);
  key.position.set(2.6, 4.2, 3.2);
  scene.add(key);

  const human = makeHumanAvatar(char.color || "#E8B45A", char.accessory || "none");
  scene.add(human.root);
  camera.position.set(0, 0.8, 2.6);
  camera.lookAt(0, 0.6, 0);

  let raf = requestAnimationFrame(function tick() {
    raf = requestAnimationFrame(tick);
    human.root.rotation.y += 0.01;
    renderer.render(scene, camera);
  });

  return {
    setChar(c) {},
    dispose() {
      cancelAnimationFrame(raf);
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}

export function createOffice3D(container, state, opts = {}) {
  const quality = opts.quality === "low" ? "low" : "high";
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070a10);
  scene.fog = new THREE.Fog(0x070a10, 36, 80);

  // Kamerayı düzelt: Ofis büyüyünce (24x18) ekranın tam sığması için mesafe ve FOV artırıldı
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  let contextLost = false;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = quality === "high";
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0x9db7e0, 0x0a0f18, 1.05));
  try {
    scene.environment = createStudioEnv(renderer);
  } catch (e) {}

  const hemi = scene.children[scene.children.length - 1];

  const key = new THREE.DirectionalLight(0xffe0b0, 1.55);
  key.position.set(10, 18, 12);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  const warm = new THREE.PointLight(C.amber, 26, 22, 2);
  warm.position.set(4, 4.5, 3);
  scene.add(warm);

  // Genişletilmiş Zemin Kaplaması (24x18 tam kaplama)
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture(false), color: 0xffffff, roughness: 0.95, metalness: 0 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, H), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // 8 Ayrı Departman Odası (Genişletilmiş Grid Matrisi)
  const zones = [
    { x: 0.5, y: 0.5, w: 5.6, h: 8.2, color: 0x6fd3c0 },
    { x: 6.3, y: 0.5, w: 5.6, h: 8.2, color: 0x6fa8ff },
    { x: 12.1, y: 0.5, w: 5.6, h: 8.2, color: 0xa78bfa },
    { x: 17.9, y: 0.5, w: 5.6, h: 8.2, color: 0xe8b45a },
    { x: 0.5, y: 9.3, w: 5.6, h: 8.2, color: 0xf08a8a },
    { x: 6.3, y: 9.3, w: 5.6, h: 8.2, color: 0x38bdf8 },
    { x: 12.1, y: 9.3, w: 5.6, h: 8.2, color: 0x34d399 },
    { x: 17.9, y: 9.3, w: 5.6, h: 8.2, color: 0xf472b6 },
  ];
  for (const z of zones) {
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(z.w, z.h),
      new THREE.MeshBasicMaterial({ color: z.color, transparent: true, opacity: 0.09, depthWrite: false })
    );
    p.rotation.x = -Math.PI / 2;
    p.position.set(toX(z.x + z.w / 2), 0.012, toZ(z.y + z.h / 2));
    scene.add(p);
  }

  const w1 = box(W, 2.4, 0.22, C.wall);
  w1.position.set(0, 1.2, toZ(0) - 0.11);
  scene.add(w1);
  const w2 = box(0.22, 2.4, H, C.wall);
  w2.position.set(toX(0) - 0.11, 1.2, 0);
  scene.add(w2);

  for (const a of Object.values(state.agents)) {
    const desk = makeDesk(a.desk[0], a.desk[1], a.color, !!a.boss);
    scene.add(desk);
    a.__screen = desk.userData.screenMat;
  }

  scene.add(makePlant(0.9, 0.8));
  scene.add(makePlant(22.2, 16.9));
  scene.add(makeBoard(5.3, 4.15));
  scene.add(makeTable(10.9, 11.2));
  scene.add(makeRack(15.9, 8.0));

  const avatars = {};
  for (const a of Object.values(state.agents)) {
    const g = makeAgent(a);
    g.position.set(toX(a.x), 0, toZ(a.y));
    g.userData.agentId = a.id;
    scene.add(g);
    avatars[a.id] = g;
  }

  function applyTheme() {
    const light = document.documentElement.dataset.theme === "light";
    const bg = new THREE.Color(light ? 0xd8e3f0 : 0x070a10);
    scene.background = bg;
    scene.fog.color = bg;
    if (floorMat.map) floorMat.map.dispose();
    floorMat.map = floorTexture(light);
    floorMat.needsUpdate = true;
  }
  applyTheme();

  // Kamera Konumlandırma (Genişletilmiş Ofis için Doğru Açı ve Mesafe)
  let theta = 0.55, phi = 0.82, radius = 22.5;
  const target = new THREE.Vector3(0, 0.9, 0);
  const applyCamera = () => {
    const sp = Math.sin(phi), cp = Math.cos(phi);
    camera.position.set(radius * sp * Math.cos(theta), radius * cp, radius * sp * Math.sin(theta));
    camera.lookAt(target);
  };
  applyCamera();

  let mode = "orbit";
  const viewEl = renderer.domElement;
  const walk = { yaw: 0, pitch: 0, pos: new THREE.Vector3(0, 1.62, 7.2), keys: Object.create(null) };

  function setMode(m) {
    mode = m === "walk" ? "walk" : "orbit";
    if (mode === "walk") {
      if (viewEl.requestPointerLock) { try { viewEl.requestPointerLock(); } catch (e) {} }
    } else {
      if (document.exitPointerLock) document.exitPointerLock();
      applyCamera();
    }
  }

  let drag = null;
  let downAt = null;
  const raycaster = new THREE.Raycaster();
  function pickAgent(e) {
    const rect = viewEl.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(Object.values(avatars), true);
    if (!hits.length) return;
    let o = hits[0].object;
    while (o && !o.userData.agentId) o = o.parent;
    if (o) window.dispatchEvent(new CustomEvent("zk-agent-click", { detail: { id: o.userData.agentId } }));
  }

  viewEl.style.cursor = "grab";
  viewEl.addEventListener("pointerdown", (e) => {
    if (mode === "walk") return;
    drag = { x: e.clientX, y: e.clientY };
    downAt = { x: e.clientX, y: e.clientY, moved: false };
    viewEl.setPointerCapture(e.pointerId);
  });
  viewEl.addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) downAt.moved = true;
    theta += (e.clientX - drag.x) * 0.005;
    phi = Math.max(0.3, Math.min(1.3, phi - (e.clientY - drag.y) * 0.004));
    drag = { x: e.clientX, y: e.clientY };
    applyCamera();
  });
  viewEl.addEventListener("pointerup", (e) => {
    if (downAt && !downAt.moved) pickAgent(e);
    drag = null;
    downAt = null;
  });
  viewEl.addEventListener("wheel", (e) => {
    e.preventDefault();
    radius = Math.max(14, Math.min(45, radius + e.deltaY * 0.02));
    applyCamera();
  }, { passive: false });

  let frames = 0;
  const clock = new THREE.Clock();

  function tick() {
    requestAnimationFrame(tick);
    if (contextLost) return;
    const dt = Math.min(0.05, clock.getDelta());
    frames++;

    // Ajan animasyonları (Yürüme, Oturma / Çalışma)
    for (const a of Object.values(state.agents)) {
      const g = avatars[a.id];
      if (!g) continue;
      const ax = Number.isFinite(a.x) ? a.x : a.desk[0] + 0.95;
      const ay = Number.isFinite(a.y) ? a.y : a.desk[1] + 1.5;

      g.position.x += (toX(ax) - g.position.x) * Math.min(1, dt * 9);
      g.position.z += (toZ(ay) - g.position.z) * Math.min(1, dt * 9);

      const working = a.status === "çalışıyor";
      const { human, ring, ringMat } = g.userData;

      // Oturma / Ayakta durma pozisyonu ve hareket animasyonu
      if (a.moving) {
        human.root.position.y = Math.abs(Math.sin(frames * 0.2)) * 0.06;
      } else {
        // Sandalyeye oturma pozisyonu
        human.root.position.y = -0.12;
      }

      ringMat.opacity = working ? 0.9 : 0.4;
      const scr = a.__screen;
      if (scr) scr.emissiveIntensity = working ? 0.9 : 0.15;
    }

    renderer.render(scene, camera);
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();
  tick();

  return {
    setMode(m) { setMode(m); },
    getMode() { return mode; },
    setActive(v) {},
    setTheme: applyTheme,
    setQuality() {},
    debug() { return { mode, frames }; },
    dispose() {
      ro.disconnect();
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}
