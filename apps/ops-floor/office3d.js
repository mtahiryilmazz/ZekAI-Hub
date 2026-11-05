// Ops Floor — 3D ofis görünümü (three.js, prosedürel; harici model/kaplama yok)
// Karakterler chibi mascot tarzında: katmanlı gözler, yanaklar, kulak/kuyruk.
// Yalnızca "Ofis 3D" sekmesi açıldığında dinamik import ile yüklenir.

import * as THREE from "./vendor/three.module.min.js";
import { GLTFLoader } from "./vendor/loaders/GLTFLoader.js";

const W = 18, H = 14;
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

/* ---------- stüdyo ortamı (yansıma/gloss için) ---------- */
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

/* ---------- zemin dokusu ---------- */
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

/* ---------- mobilya ---------- */
function makeDesk(x, y, color) {
  const g = new THREE.Group();
  g.position.set(toX(x + 0.95), 0, toZ(y + 0.48));

  const top = box(1.9, 0.08, 0.95, C.deskTop);
  top.position.y = 0.62;
  top.userData.role = "top";
  g.add(top);

  const lip = box(1.9, 0.025, 0.03, 0x3c4c62);
  lip.position.set(0, 0.655, 0.47);
  g.add(lip);

  for (const [lx, lz] of [[-0.85, -0.4], [0.85, -0.4], [-0.85, 0.4], [0.85, 0.4]]) {
    const leg = box(0.07, 0.6, 0.07, C.deskLeg);
    leg.position.set(lx, 0.3, lz);
    leg.userData.role = "leg";
    g.add(leg);
  }

  const stand = box(0.07, 0.2, 0.07, C.metal);
  stand.position.set(0, 0.76, -0.22);
  g.add(stand);

  const frame = box(0.66, 0.4, 0.05, 0x0c121b);
  frame.position.set(0, 1.03, -0.22);
  g.add(frame);

  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x0d1a22, emissive: new THREE.Color(C.screen), emissiveIntensity: 0.15, roughness: 0.4,
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.32), screenMat);
  screen.position.set(0, 1.03, -0.19);
  g.add(screen);

  const kb = box(0.55, 0.03, 0.18, 0x232d3c);
  kb.position.set(0, 0.67, 0.16);
  g.add(kb);

  const cup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.04, 0.1, 12),
    standard(C.amber, { emissive: new THREE.Color(C.amber), emissiveIntensity: 0.25 })
  );
  cup.position.set(0.62, 0.72, -0.05);
  g.add(cup);

  // sandalye: taban + gövde + oturak + sırt
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.03, 20), standard(0x151c27));
  base.position.set(0, 0.03, 0.78);
  g.add(base);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.34, 10), standard(0x2a3547));
  stem.position.set(0, 0.22, 0.78);
  g.add(stem);
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.07, 20), standard(0x1b2431));
  seat.position.set(0, 0.42, 0.78);
  seat.userData.role = "chair";
  g.add(seat);
  const back = box(0.44, 0.42, 0.055, 0x1b2431);
  back.position.set(0, 0.66, 1.0);
  back.rotation.x = -0.12;
  back.userData.role = "chair";
  g.add(back);

  // masa lambası
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.03, 16), standard(0x222c3a));
  lampBase.position.set(-0.72, 0.675, -0.25);
  g.add(lampBase);
  const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.34, 8), standard(0x2e3a4c));
  lampArm.position.set(-0.72, 0.85, -0.25);
  lampArm.rotation.z = 0.18;
  g.add(lampArm);
  const lampHead = new THREE.Mesh(
    new THREE.ConeGeometry(0.11, 0.13, 16, 1, true),
    standard(0x2e3a4c, { emissive: new THREE.Color(C.amber), emissiveIntensity: 0.25, side: THREE.DoubleSide })
  );
  lampHead.position.set(-0.68, 1.02, -0.25);
  lampHead.rotation.z = -0.25;
  g.add(lampHead);

  // evrak
  const paper = box(0.3, 0.012, 0.22, 0xd9d3c4);
  paper.position.set(0.36, 0.665, 0.26);
  paper.rotation.y = 0.18;
  paper.userData.role = "paper";
  g.add(paper);

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
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.45, 24),
    new THREE.MeshStandardMaterial({ color: 0x2a2418, emissive: new THREE.Color(C.amber), emissiveIntensity: 0.18 })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.61;
  g.add(disc);
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
   Chibi mascot — katmanlı göz, yanak, kulak, kuyruk
   ===================================================================== */
function mascotMats(hex) {
  const base = new THREE.MeshPhysicalMaterial({
    color: hex, roughness: 0.32, metalness: 0.0,
    clearcoat: 0.65, clearcoatRoughness: 0.2,
    sheen: 0.45, sheenColor: new THREE.Color(0xffffff),
    envMapIntensity: 0.85,
  });
  return {
    base,
    white: standard(C.cream, { roughness: 0.55, envMapIntensity: 0.7 }),
    pink: standard(C.pink, { roughness: 0.6, envMapIntensity: 0.7 }),
    dark: standard(0x141b24, { roughness: 0.22, envMapIntensity: 1.0 }),
    orange: standard(0xf0a04a, { roughness: 0.5, envMapIntensity: 0.7 }),
    iris: new THREE.MeshStandardMaterial({
      color: hex, emissive: new THREE.Color(hex), emissiveIntensity: 0.35, roughness: 0.18, envMapIntensity: 1.0,
    }),
    shine: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  };
}

function addArms(body, m, mat) {
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(s * 0.37, 0.64, 0.06);
    const seg = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.18, 8, 12), mat);
    seg.position.set(0, -0.1, 0);
    seg.castShadow = true;
    arm.add(seg);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.082, 14, 14), m.white);
    paw.position.set(0, -0.23, 0.02);
    arm.add(paw);
    arm.rotation.z = s * 0.3;
    body.add(arm);
    arms.push(arm);
  }
  return arms;
}

function makeEye(m, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.userData.eye = true;

  const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.145, 32, 32), m.dark);
  sclera.scale.set(0.78, 1.16, 0.7);
  g.add(sclera);

  const iris = new THREE.Mesh(new THREE.SphereGeometry(0.092, 24, 24), m.iris);
  iris.scale.set(0.8, 1.1, 0.4);
  iris.position.set(0, -0.008, 0.066);
  g.add(iris);

  const c1 = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 16), m.shine);
  c1.position.set(0.028, 0.05, 0.09);
  g.add(c1);
  const c2 = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 12), m.shine);
  c2.position.set(-0.026, -0.04, 0.09);
  g.add(c2);
  const c3 = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 10), m.shine);
  c3.position.set(0.036, -0.024, 0.092);
  g.add(c3);
  return g;
}

function addCheeks(head, m, dist = 0.34, y = -0.08, z = 0.48) {
  const geo = new THREE.SphereGeometry(0.095, 20, 20);
  for (const s of [-1, 1]) {
    const cheek = new THREE.Mesh(geo, m.pink);
    cheek.scale.set(1.35, 0.72, 0.42);
    cheek.position.set(s * dist, y, z);
    cheek.rotation.y = s * 0.35;
    head.add(cheek);
  }
}

function addAccessory(head, m, kind) {
  if (!head || kind === "none") return;

  if (kind === "bandana") {
    const cloth = standard(0x22303f, { roughness: 0.85 });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.14, 28, 1, true), cloth);
    band.position.y = 0.22;
    head.add(band);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), cloth);
    knot.position.set(0, 0.22, -0.55);
    head.add(knot);
    for (const s of [-1, 1]) {
      const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.3, 8, 10), cloth);
      tail.position.set(s * 0.09, 0.06, -0.6);
      tail.rotation.set(-0.5, 0, s * 0.3);
      head.add(tail);
    }
  } else if (kind === "hat") {
    const straw = standard(0xd9b26a, { roughness: 0.85 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.05, 32), straw);
    brim.position.y = 0.44;
    brim.castShadow = true;
    head.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.4, 0.3, 24), straw);
    crown.position.y = 0.6;
    head.add(crown);
    const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.07, 24), standard(0x2a3a4f));
    ribbon.position.y = 0.48;
    head.add(ribbon);
  } else if (kind === "hair") {
    for (let i = 0; i < 7; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 10), m.base);
      const ang = (i / 7) * Math.PI * 2;
      cone.position.set(Math.cos(ang) * 0.22, 0.52 + Math.sin(i * 1.7) * 0.03, Math.sin(ang) * 0.2);
      cone.rotation.set(Math.sin(ang) * 0.5, 0, -Math.cos(ang) * 0.5);
      cone.castShadow = true;
      head.add(cone);
    }
  }
}

const FUR_SPECIES = {
  kizilpanda: { ears: "round", tail: "ring", muzzle: true, mask: null, dark: 0x2a1f1a },
  panda:      { ears: "round", tail: "stub", muzzle: true, mask: "panda", body: 0xf6f2ea, dark: 0x1b1f26 },
  rakun:      { ears: "round", tail: "ring", muzzle: true, mask: "band", dark: 0x232a33 },
  sincap:     { ears: "tuft",  tail: "big",  muzzle: true, dark: 0x3a2418 },
  maymun:     { ears: "side",  tail: "long", muzzle: true, face: 0xf0d9c0, dark: 0x3a2a20 },
  tavsan:     { ears: "long",  tail: "puff", muzzle: true, dark: 0xd8cfc4 },
  ordek:      { ears: "none",  tail: "stub", muzzle: false, bill: true, dark: 0xf0a04a },
  kaplumbaga: { ears: "none",  tail: "stub", muzzle: false, shell: true, dark: 0x3f6b4a },
};

function buildFurry(cfg, m, species, accessory) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const parts = { tail: null, head: null, earL: null, earR: null, wings: [], limbs: [] };

  const fur = cfg.body ? standard(cfg.body, { roughness: 0.62 }) : m.base;
  const dark = standard(cfg.dark || 0x232a33, { roughness: 0.6 });

  const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.4, 20, 32), fur);
  b.position.y = 0.44;
  b.rotation.x = Math.PI / 16;
  b.castShadow = true;
  body.add(b);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.33, 32, 32), m.white);
  belly.scale.set(0.9, 1.05, 0.5);
  belly.position.set(0, 0.4, 0.24);
  body.add(belly);

  const head = new THREE.Group();
  head.position.set(0, 0.99, 0.08);
  body.add(head);
  parts.head = head;

  const h = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 48), fur);
  h.scale.set(1.14, 1, 1.03);
  h.castShadow = true;
  head.add(h);

  addCheeks(head, m, 0.33, -0.09, 0.44);

  // kulaklar
  if (cfg.ears === "round") {
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 24), cfg.mask === "panda" ? dark : fur);
      ear.scale.set(1, 1, 0.55);
      ear.position.set(s * 0.38, 0.42, 0.02);
      ear.castShadow = true;
      head.add(ear);
      if (cfg.mask !== "panda") {
        const inner = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 18), m.pink);
        inner.scale.set(1, 1, 0.4);
        inner.position.set(s * 0.38, 0.42, 0.08);
        head.add(inner);
      }
    }
  } else if (cfg.ears === "tuft") {
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.32, 16), fur);
      ear.position.set(s * 0.3, 0.55, 0);
      ear.rotation.set(-0.1, 0, s * -0.3);
      head.add(ear);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 12), m.white);
      tip.position.set(s * 0.33, 0.68, 0);
      tip.rotation.copy(ear.rotation);
      head.add(tip);
    }
  } else if (cfg.ears === "side") {
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 20), fur);
      ear.scale.set(0.7, 1, 1);
      ear.position.set(s * 0.52, 0.08, 0);
      head.add(ear);
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), m.pink);
      inner.scale.set(0.6, 1, 1);
      inner.position.set(s * 0.55, 0.08, 0);
      head.add(inner);
    }
  } else if (cfg.ears === "long") {
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.46, 10, 16), fur);
      ear.position.set(s * 0.16, 0.62, 0);
      ear.rotation.z = s * 0.12;
      ear.castShadow = true;
      head.add(ear);
      const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.34, 8, 12), m.pink);
      inner.position.set(s * 0.16, 0.62, 0.05);
      inner.rotation.z = s * 0.12;
      head.add(inner);
    }
  }

  // yüz
  if (cfg.face) {
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.36, 32, 32), standard(cfg.face, { roughness: 0.8 }));
    face.scale.set(1.05, 0.95, 0.55);
    face.position.set(0, -0.02, 0.3);
    head.add(face);
  }
  if (cfg.muzzle) {
    const muz = new THREE.Mesh(new THREE.SphereGeometry(0.22, 28, 28), m.white);
    muz.scale.set(1.1, 0.8, 0.85);
    muz.position.set(0, -0.1, 0.4);
    head.add(muz);
  }
  if (cfg.bill) {
    const bill = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 24), standard(0xf0a04a, { roughness: 0.6 }));
    bill.scale.set(1.5, 0.45, 1.1);
    bill.position.set(0, -0.12, 0.5);
    head.add(bill);
  }
  if (cfg.shell) {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.52, 28, 28), standard(0x4c7a54, { roughness: 0.75 }));
    shell.scale.set(1.05, 0.62, 0.72);
    shell.position.set(0, 0.42, -0.3);
    shell.castShadow = true;
    body.add(shell);
  }

  // maske / panda göz lekeleri
  if (cfg.mask === "band") {
    const band = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 32), dark);
    band.scale.set(1.02, 0.32, 0.5);
    band.position.set(0, 0.04, 0.28);
    head.add(band);
  } else if (cfg.mask === "panda") {
    for (const s of [-1, 1]) {
      const patch = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 24), dark);
      patch.scale.set(1, 1.15, 0.45);
      patch.position.set(s * 0.2, 0.06, 0.4);
      head.add(patch);
    }
  }

  head.add(makeEye(m, -0.19, 0.06, 0.44));
  head.add(makeEye(m, 0.19, 0.06, 0.44));

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), cfg.mask === "panda" ? dark : m.pink);
  nose.scale.set(1.2, 0.8, 0.8);
  nose.position.set(0, -0.1, 0.5);
  head.add(nose);

  // patiler
  for (const s of [-1, 1]) {
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 18), cfg.mask === "panda" ? dark : m.white);
    paw.scale.set(1, 0.68, 1.2);
    paw.position.set(s * 0.22, 0.1, 0.22);
    paw.userData.by = paw.position.y;
    paw.userData.bz = paw.position.z;
    body.add(paw);
    parts.limbs.push(paw);
  }

  // kuyruk
  const tail = new THREE.Group();
  tail.position.set(0, 0.34, -0.34);
  body.add(tail);
  parts.tail = tail;

  if (cfg.tail === "ring") {
    for (let i = 0; i < 3; i++) {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.13 - i * 0.015, 16, 16), i % 2 ? dark : fur);
      seg.position.set(0, 0.1 + i * 0.16, -0.08 - i * 0.06);
      tail.add(seg);
    }
  } else if (cfg.tail === "big") {
    for (let i = 0; i < 4; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.16 + i * 0.05, 20, 20), fur);
      puff.position.set(0, 0.12 + i * 0.13, -0.12 - i * 0.05);
      tail.add(puff);
    }
  } else if (cfg.tail === "long") {
    const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.45, 8, 12), fur);
    t.position.set(0, 0.22, -0.14);
    t.rotation.x = -1.1;
    tail.add(t);
  } else {
    const stub = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 14), m.white);
    stub.position.set(0, 0.08, -0.06);
    tail.add(stub);
  }

  root.scale.setScalar(0.78);
  addAccessory(head, m, accessory);
  return { root, parts, mats: m };
}

function makeMascot(species, hex, accessory = "none") {
  const m = mascotMats(hex);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const parts = { tail: null, head: null, earL: null, earR: null, wings: [], limbs: [] };

  if (FUR_SPECIES[species]) return buildFurry(FUR_SPECIES[species], m, species, accessory);

  if (species === "kus") {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.46, 48, 48), m.base);
    b.scale.set(1, 0.95, 1.05);
    b.position.y = 0.42;
    b.castShadow = true;
    body.add(b);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 32), m.white);
    belly.scale.set(0.85, 0.9, 0.5);
    belly.position.set(0, 0.38, 0.28);
    body.add(belly);

    const head = new THREE.Group();
    head.position.set(0, 0.96, 0.06);
    body.add(head);
    parts.head = head;

    const h = new THREE.Mesh(new THREE.SphereGeometry(0.48, 48, 48), m.base);
    h.scale.set(1.05, 1, 1);
    h.castShadow = true;
    head.add(h);
    addCheeks(head, m, 0.3, -0.07, 0.42);

    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.3, 20), m.orange);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, -0.03, 0.5);
    head.add(beak);

    head.add(makeEye(m, -0.18, 0.06, 0.42));
    head.add(makeEye(m, 0.18, 0.06, 0.42));

    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.26, 28, 28), m.base);
      wing.scale.set(0.24, 0.6, 0.8);
      wing.position.set(s * 0.44, 0.46, 0.02);
      wing.rotation.z = s * 0.25;
      wing.castShadow = true;
      body.add(wing);
      parts.wings.push(wing);
    }

    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.4, 14), m.base);
      f.position.set(0, 0.42, -0.42);
      f.rotation.x = -Math.PI / 2.1;
      f.rotation.z = (i - 1) * 0.22;
      body.add(f);
    }

    for (const s of [-1, 1]) {
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), m.orange);
      foot.scale.set(1, 0.45, 1.4);
      foot.position.set(s * 0.16, 0.05, 0.06);
      foot.userData.by = foot.position.y;
      foot.userData.bz = foot.position.z;
      body.add(foot);
      parts.limbs.push(foot);
    }
  } else if (species === "kopek") {
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.42, 20, 32), m.base);
    b.position.y = 0.44;
    b.castShadow = true;
    body.add(b);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 32), m.white);
    belly.scale.set(0.88, 1, 0.5);
    belly.position.set(0, 0.38, 0.26);
    body.add(belly);

    const head = new THREE.Group();
    head.position.set(0, 1.0, 0.08);
    body.add(head);
    parts.head = head;

    const h = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 48), m.base);
    h.scale.set(1.08, 1, 1.02);
    h.castShadow = true;
    head.add(h);
    addCheeks(head, m, 0.32, -0.09, 0.44);

    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 32), m.white);
    snout.scale.set(1.1, 0.8, 0.8);
    snout.position.set(0, -0.08, 0.42);
    head.add(snout);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 20), m.dark);
    nose.scale.set(1.25, 0.85, 0.8);
    nose.position.set(0, 0.0, 0.6);
    head.add(nose);

    head.add(makeEye(m, -0.19, 0.12, 0.42));
    head.add(makeEye(m, 0.19, 0.12, 0.42));

    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.34, 12, 20), m.base);
      ear.position.set(s * 0.42, 0.18, 0);
      ear.rotation.z = s * 0.55;
      ear.rotation.x = -0.1;
      ear.castShadow = true;
      head.add(ear);
      if (s < 0) parts.earL = ear; else parts.earR = ear;
    }

    for (const s of [-1, 1]) {
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 20), m.white);
      paw.scale.set(1, 0.7, 1.25);
      paw.position.set(s * 0.22, 0.09, 0.24);
      paw.userData.by = paw.position.y;
      paw.userData.bz = paw.position.z;
      body.add(paw);
      parts.limbs.push(paw);
    }

    const tail = new THREE.Group();
    tail.position.set(0, 0.5, -0.36);
    body.add(tail);
    parts.tail = tail;
    const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.4, 10, 14), m.base);
    t.position.set(0, 0.12, -0.16);
    t.rotation.x = -0.9;
    tail.add(t);
  } else {
    // kedi (varsayılan)
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.4, 20, 32), m.base);
    b.position.y = 0.42;
    b.rotation.x = Math.PI / 14;
    b.castShadow = true;
    body.add(b);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.33, 32, 32), m.white);
    belly.scale.set(0.9, 1.05, 0.5);
    belly.position.set(0, 0.4, 0.24);
    body.add(belly);

    const head = new THREE.Group();
    head.position.set(0, 0.98, 0.08);
    body.add(head);
    parts.head = head;

    const h = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 48), m.base);
    h.scale.set(1.12, 1, 1.04);
    h.castShadow = true;
    head.add(h);
    addCheeks(head, m, 0.33, -0.08, 0.44);

    const earGeo = new THREE.ConeGeometry(0.2, 0.36, 24);
    const innerGeo = new THREE.ConeGeometry(0.12, 0.25, 20);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(earGeo, m.base);
      ear.position.set(s * 0.32, 0.5, 0);
      ear.rotation.set(-0.1, 0, s * -0.34);
      ear.castShadow = true;
      head.add(ear);
      const inner = new THREE.Mesh(innerGeo, m.pink);
      inner.position.set(s * 0.31, 0.49, 0.04);
      inner.rotation.set(-0.1, 0, s * -0.34);
      head.add(inner);
      if (s < 0) parts.earL = ear; else parts.earR = ear;
    }

    head.add(makeEye(m, -0.19, 0.06, 0.44));
    head.add(makeEye(m, 0.19, 0.06, 0.44));

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), m.pink);
    nose.scale.set(1.2, 0.8, 0.8);
    nose.position.set(0, -0.1, 0.5);
    head.add(nose);

    for (const s of [-1, 1]) {
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 18), m.white);
      paw.scale.set(1, 0.68, 1.2);
      paw.position.set(s * 0.22, 0.1, 0.22);
      paw.userData.by = paw.position.y;
      paw.userData.bz = paw.position.z;
      body.add(paw);
      parts.limbs.push(paw);
    }

    const tail = new THREE.Group();
    tail.position.set(0, 0.32, -0.34);
    body.add(tail);
    parts.tail = tail;
    const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.46, 10, 14), m.base);
    t.position.set(0, 0.2, -0.14);
    t.rotation.x = -0.95;
    tail.add(t);
  }

  root.scale.setScalar(0.78);
  addAccessory(parts.head, m, accessory);
  return { root, parts, mats: m };
}

/* ---------- yumuşak temas gölgesi ---------- */
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

let FOLDER_TEX = null;
function folderTexture() {
  if (FOLDER_TEX) return FOLDER_TEX;
  const c = document.createElement("canvas");
  c.width = 128; c.height = 96;
  const g = c.getContext("2d");
  g.clearRect(0, 0, 128, 96);
  g.fillStyle = "#E8B45A";
  g.strokeStyle = "rgba(0,0,0,0.5)";
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(18, 34); g.lineTo(52, 34); g.lineTo(58, 22); g.lineTo(86, 22);
  g.lineTo(94, 34); g.lineTo(110, 34); g.lineTo(110, 78); g.lineTo(18, 78);
  g.closePath();
  g.fill(); g.stroke();
  g.strokeStyle = "rgba(0,0,0,0.22)";
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(22, 48); g.lineTo(106, 48); g.stroke();
  FOLDER_TEX = new THREE.CanvasTexture(c);
  return FOLDER_TEX;
}

/* ---------- ajan ---------- */
function makeAgent(a) {
  const g = new THREE.Group();

  const mascot = makeMascot(a.species || "kedi", a.color, a.accessory || "none");
  g.add(mascot.root);
  if (a.species !== "kus" && (!mascot.parts.arms || !mascot.parts.arms.length)) {
    mascot.parts.arms = addArms(mascot.root, mascot.mats, mascot.mats.base);
  }
  if (mascot.parts.head) {
    const mouth = new THREE.Mesh(
      new THREE.TorusGeometry(0.08, 0.012, 6, 16, Math.PI),
      standard(0x2a1a1a, { roughness: 0.5 })
    );
    mouth.position.set(0, -0.15, 0.5);
    mouth.rotation.z = Math.PI;
    mascot.parts.head.add(mouth);
  }
  const eyes = [];
  mascot.root.traverse((o) => { if (o.userData.eye) eyes.push(o); });
  mascot.parts.eyes = eyes;

  // Opsiyonel GLB/glTF karakter modeli (Sketchfab vb. — lisans kullanıcıya aittir)
  if (a.model) {
    let src = String(a.model).trim();
    if (/^models\//i.test(src)) src = "/" + src;

    if (/sketchfab\.com\/3d-models\//i.test(src)) {
      window.dispatchEvent(new CustomEvent("zk-model-error", { detail: { agent: a.name, url: src, reason: "Sketchfab sayfa bağlantısı — indirilebilir .glb adresi gerekir" } }));
    } else {
      new GLTFLoader().load(
        src,
        (gltf) => {
          const obj = gltf.scene;
          obj.traverse((o) => {
            if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
          });
          obj.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(obj);
          const size = box.getSize(new THREE.Vector3());
          obj.scale.setScalar(1.4 / Math.max(size.y, 0.001));
          obj.updateMatrixWorld(true);
          box.setFromObject(obj);
          obj.position.y -= box.min.y;
          mascot.root.visible = false;
          g.add(obj);
          g.userData.modelFailed = false;
        },
        undefined,
        () => {
          g.userData.modelFailed = true;
          window.dispatchEvent(new CustomEvent("zk-model-error", { detail: { agent: a.name, url: src, reason: "model yüklenemedi (404 / CORS / geçersiz GLB)" } }));
        }
      );
    }
  }

  const ringMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(a.color), transparent: true, opacity: 0.75, side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.37, 40), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  g.add(ring);

  const halo = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.42, 1.25, 18, 1, true),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(a.color), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
  );
  halo.position.y = 0.7;
  g.add(halo);

  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.15),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, opacity: 0.36, depthWrite: false })
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.013;
  g.add(contact);

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
  g.add(sprite);

  const folderSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: folderTexture(), transparent: true, depthWrite: false }));
  folderSprite.position.y = 1.95;
  folderSprite.scale.set(0.52, 0.39, 1);
  folderSprite.visible = false;
  g.add(folderSprite);

  g.userData = { mascot, ring, ringMat, halo, sprite, contact, folderSprite };
  return g;
}

/* ---------- sahne ---------- */
export function createOffice3D(container, state) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070a10);
  scene.fog = new THREE.Fog(0x070a10, 32, 70);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  const lowPower = (navigator.hardwareConcurrency || 8) <= 4;
  renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  container.appendChild(renderer.domElement);
  renderer.domElement.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("zk-webgl-lost"));
  });

  scene.add(new THREE.HemisphereLight(0x9db7e0, 0x0a0f18, 1.05));
  try {
    scene.environment = createStudioEnv(renderer);
  } catch (e) {
    console.warn("stüdyo ortamı atlandı", e);
  }

  const hemi = scene.children[scene.children.length - 1];

  const key = new THREE.DirectionalLight(0xffe0b0, 1.55);
  key.position.set(9, 17, 11);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -14;
  key.shadow.camera.right = 14;
  key.shadow.camera.top = 14;
  key.shadow.camera.bottom = -14;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 60;
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.02;
  scene.add(key);

  const warm = new THREE.PointLight(C.amber, 26, 18, 2);
  warm.position.set(4, 4.5, 3);
  scene.add(warm);
  const cool = new THREE.PointLight(0x6fa8ff, 18, 18, 2);
  cool.position.set(-4, 4, -3);
  scene.add(cool);

  const fill = new THREE.DirectionalLight(0x89a8d6, 0.35);
  fill.position.set(-9, 6, -7);
  scene.add(fill);

  const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture(false), color: 0xffffff, roughness: 0.95, metalness: 0 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, H), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const zones = [
    { x: 0.5, y: 0.5, w: 7.9, h: 6, color: 0x6fd3c0 },
    { x: 9.6, y: 0.5, w: 7.9, h: 6, color: 0x6fa8ff },
    { x: 0.5, y: 7.5, w: 7.9, h: 6, color: 0xa78bfa },
    { x: 9.6, y: 7.5, w: 7.9, h: 6, color: 0xe8b45a },
  ];
  for (const z of zones) {
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(z.w, z.h),
      new THREE.MeshBasicMaterial({ color: z.color, transparent: true, opacity: 0.09, depthWrite: false })
    );
    p.rotation.x = -Math.PI / 2;
    p.position.set(toX(z.x + z.w / 2), 0.012, toZ(z.y + z.h / 2));
    scene.add(p);
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(z.w, z.h)),
      new THREE.LineBasicMaterial({ color: z.color, transparent: true, opacity: 0.34 })
    );
    edge.rotation.x = -Math.PI / 2;
    edge.position.copy(p.position);
    scene.add(edge);
  }

  const w1 = box(W, 2.4, 0.22, C.wall);
  w1.position.set(0, 1.2, toZ(0) - 0.11);
  scene.add(w1);
  const w2 = box(0.22, 2.4, H, C.wall);
  w2.position.set(toX(0) - 0.11, 1.2, 0);
  scene.add(w2);
  const wallMats = [w1.material, w2.material];

  // süpürgelik + duvar üst bitişi
  const trimMats = [];
  const skirt1 = box(W, 0.14, 0.06, 0x1a2534);
  skirt1.position.set(0, 0.07, toZ(0) + 0.03);
  scene.add(skirt1);
  const skirt2 = box(0.06, 0.14, H, 0x1a2534);
  skirt2.position.set(toX(0) + 0.03, 0.07, 0);
  scene.add(skirt2);
  const cap1 = box(W, 0.07, 0.26, 0x1e2a3a);
  cap1.position.set(0, 2.4, toZ(0) - 0.11);
  scene.add(cap1);
  trimMats.push(skirt1.material, skirt2.material, cap1.material);

  // pencereler (gündüz/gece rengi temaya göre)
  const windowMats = [];
  const frameMats = [];
  for (const wx of [-5.4, 0, 5.4]) {
    const ww = 3.1, wh = 1.15, wy = 1.42, zf = toZ(0) + 0.015;
    const glassMat = new THREE.MeshBasicMaterial({ color: 0x0e1a2a });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), glassMat);
    glass.position.set(wx, wy, zf);
    scene.add(glass);
    windowMats.push(glassMat);

    const frameMat = standard(0x22303f, { roughness: 0.6 });
    frameMats.push(frameMat);
    const top = new THREE.Mesh(new THREE.BoxGeometry(ww + 0.16, 0.07, 0.07), frameMat);
    top.position.set(wx, wy + wh / 2 + 0.035, zf + 0.02);
    scene.add(top);
    const bot = top.clone();
    bot.position.y = wy - wh / 2 - 0.035;
    scene.add(bot);
    for (const s of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.07, wh + 0.14, 0.07), frameMat);
      side.position.set(wx + s * (ww / 2 + 0.045), wy, zf + 0.02);
      scene.add(side);
    }
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.05, wh, 0.05), frameMat);
    mullion.position.set(wx, wy, zf + 0.02);
    scene.add(mullion);
  }

  // duvar saati
  const clockRim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 32), standard(0x2a3547));
  clockRim.rotation.x = Math.PI / 2;
  clockRim.position.set(7.4, 1.55, toZ(0) + 0.03);
  scene.add(clockRim);
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.26, 32), standard(0xf2efe6, { roughness: 0.9 }));
  clockFace.position.set(7.4, 1.55, toZ(0) + 0.06);
  scene.add(clockFace);
  const handMat = standard(0x1b2431);
  const hour = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.13, 0.005), handMat);
  hour.position.set(7.34, 1.61, toZ(0) + 0.07);
  hour.rotation.z = 0.6;
  scene.add(hour);
  const minute = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.19, 0.005), handMat);
  minute.position.set(7.46, 1.58, toZ(0) + 0.07);
  minute.rotation.z = -0.35;
  scene.add(minute);

  for (const a of Object.values(state.agents)) {
    const desk = makeDesk(a.desk[0], a.desk[1], a.color);
    scene.add(desk);
    a.__screen = desk.userData.screenMat;
  }

  const deskMats = { top: [], leg: [], chair: [] };
  scene.traverse((o) => {
    if (o.isMesh && o.userData.role && deskMats[o.userData.role]) deskMats[o.userData.role].push(o.material);
  });
  scene.add(makePlant(0.9, 0.8));
  scene.add(makePlant(17.2, 12.9));
  scene.add(makePlant(8.4, 0.8));
  scene.add(makeBoard(5.3, 4.15));
  scene.add(makeTable(10.9, 11.2));
  scene.add(makeRack(15.9, 8.0));
  scene.add(makeRack(15.9, 9.2));

  const avatars = {};
  const contacts = [];
  for (const a of Object.values(state.agents)) {
    const g = makeAgent(a);
    g.position.set(toX(a.x), 0, toZ(a.y));
    g.userData.agentId = a.id;
    scene.add(g);
    avatars[a.id] = g;
    if (g.userData.contact) contacts.push(g.userData.contact);
  }

  const transferSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: folderTexture(), transparent: true, depthWrite: false }));
  transferSprite.scale.set(0.6, 0.45, 1);
  transferSprite.visible = false;
  scene.add(transferSprite);

  /* ---------- tema / görünürlük ---------- */
  function applyTheme() {
    const light = document.documentElement.dataset.theme === "light";
    const bg = new THREE.Color(light ? 0xd8e3f0 : 0x070a10);
    scene.background = bg;
    scene.fog.color = bg;
    scene.fog.near = light ? 44 : 32;
    scene.fog.far = light ? 96 : 70;
    renderer.toneMappingExposure = light ? 1.02 : 1.15;
    hemi.color.set(light ? 0xf2f7ff : 0x9db7e0);
    hemi.groundColor.set(light ? 0xc6d2e0 : 0x0a0f18);
    hemi.intensity = light ? 1.05 : 1.05;
    key.color.set(light ? 0xfff3df : 0xffe0b0);
    key.intensity = light ? 2.1 : 1.55;
    fill.intensity = light ? 0.35 : 0.35;
    warm.intensity = light ? 0 : 26;
    cool.intensity = light ? 0 : 18;
    for (const m of wallMats) m.color.set(light ? 0xdde5ef : C.wall);
    for (const m of wallMats) m.envMapIntensity = 0.2;
    floorMat.envMapIntensity = 0.25;
    for (const m of deskMats.top) m.envMapIntensity = 0.3;
    for (const m of deskMats.leg) m.envMapIntensity = 0.3;
    for (const m of deskMats.chair) m.envMapIntensity = 0.3;
    for (const m of trimMats) m.color.set(light ? 0xc9d4e2 : 0x1a2534);
    for (const m of frameMats) m.color.set(light ? 0xc3cfdd : 0x22303f);
    for (const m of windowMats) m.color.set(light ? 0xdcecff : 0x0e1a2a);
    for (const m of deskMats.top) m.color.set(light ? 0xcfd9e6 : 0x2b3648);
    for (const m of deskMats.leg) m.color.set(light ? 0xb3c1d2 : 0x1a2230);
    for (const m of deskMats.chair) m.color.set(light ? 0xc3cedd : 0x1b2431);
    floorMat.roughness = light ? 0.98 : 0.95;
    for (const c of contacts) c.material.opacity = light ? 0.22 : 0.36;
    if (floorMat.map) floorMat.map.dispose();
    floorMat.map = floorTexture(light);
    floorMat.needsUpdate = true;
  }
  applyTheme();

  let active = true;

  /* ---------- kamera ---------- */
  let theta = 0.66, phi = 0.95, radius = 16.5;
  const target = new THREE.Vector3(0, 0.9, 0);
  const apply = () => {
    const sp = Math.sin(phi), cp = Math.cos(phi);
    camera.position.set(radius * sp * Math.cos(theta), radius * cp, radius * sp * Math.sin(theta));
    camera.lookAt(target);
  };
  apply();

  let drag = null;
  let downAt = null;
  const raycaster = new THREE.Raycaster();
  function pickAgent(e) {
    const rect = el.getBoundingClientRect();
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
  const el = renderer.domElement;
  el.style.cursor = "grab";
  el.style.touchAction = "none";
  el.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, y: e.clientY };
    downAt = { x: e.clientX, y: e.clientY, moved: false };
    el.setPointerCapture(e.pointerId);
    el.style.cursor = "grabbing";
  });
  el.addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) downAt.moved = true;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag = { x: e.clientX, y: e.clientY };
    theta += dx * 0.005;
    phi = Math.max(0.3, Math.min(1.3, phi - dy * 0.004));
    apply();
  });
  const end = (e) => {
    if (downAt && !downAt.moved && e && e.clientX !== undefined) pickAgent(e);
    downAt = null;
    drag = null;
    el.style.cursor = "grab";
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", () => { downAt = null; drag = null; el.style.cursor = "grab"; });
  el.addEventListener("wheel", (e) => {
    e.preventDefault();
    radius = Math.max(12, Math.min(40, radius + e.deltaY * 0.02));
    apply();
  }, { passive: false });
  el.addEventListener("dblclick", () => { theta = 0.66; phi = 0.95; radius = 16.5; apply(); });

  /* ---------- döngü ---------- */
  let raf = 0;
  const clock = new THREE.Clock();

  function tick() {
    raf = requestAnimationFrame(tick);
    if (!active) return;
    const dt = Math.min(0.05, clock.getDelta());
    const now = performance.now();

    for (const a of Object.values(state.agents)) {
      const g = avatars[a.id];
      if (!g) continue;
      g.position.x += (toX(a.x) - g.position.x) * Math.min(1, dt * 9);
      g.position.z += (toZ(a.y) - g.position.z) * Math.min(1, dt * 9);

      const working = a.status === "çalışıyor";
      const waiting = a.status === "bekliyor";
      const { mascot, ring, ringMat, halo } = g.userData;

      // nefes / yürüme salınımı
      g.position.y = a.moving ? Math.abs(Math.sin(now * 0.012)) * 0.06 : Math.sin(now * 0.002 + a.t) * 0.012;

      const phase = now * 0.014 + a.t;
      for (let i = 0; i < mascot.parts.limbs.length; i++) {
        const p = mascot.parts.limbs[i];
        const sw = Math.sin(phase + i * Math.PI);
        const amp = a.moving ? 1 : 0;
        p.position.z = (p.userData.bz || 0) + sw * 0.1 * amp;
        p.position.y = (p.userData.by || 0) + Math.max(0, sw) * 0.05 * amp;
      }
      mascot.root.rotation.x = a.moving ? 0.05 : 0;

      for (let i = 0; i < (mascot.parts.arms || []).length; i++) {
        const arm = mascot.parts.arms[i];
        arm.rotation.x = a.moving ? Math.sin(phase + i * Math.PI) * 0.45 : Math.sin(now * 0.002 + a.t + i) * 0.06;
      }

      const fs = g.userData.folderSprite;
      if (fs) {
        fs.visible = !!a.folder;
        fs.position.y = 1.95 + Math.sin(now * 0.004 + a.t) * 0.05;
      }

      // hareket yönüne dönüş
      const vx = toX(a.x) - g.position.x;
      const vz = toZ(a.y) - g.position.z;
      if (vx * vx + vz * vz > 0.00002) {
        let target = Math.atan2(vx, vz);
        let diff = ((target - g.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        g.rotation.y += diff * Math.min(1, dt * 8);
      }

      if (mascot.parts.head) mascot.parts.head.rotation.y = Math.sin(now * 0.0012 + a.t) * 0.09;
      if (mascot.parts.tail) mascot.parts.tail.rotation.y = Math.sin(now * 0.003 + a.t) * 0.35;
      if (mascot.parts.earL) mascot.parts.earL.rotation.z = -0.34 - Math.max(0, Math.sin(now * 0.004 + a.t)) * 0.08;
      if (mascot.parts.earR) mascot.parts.earR.rotation.z = 0.34 + Math.max(0, Math.sin(now * 0.004 + a.t + 1)) * 0.08;
      for (const w of mascot.parts.wings) w.rotation.z += Math.sin(now * 0.006 + a.t) * 0.0015;

      // göz kırpma
      const bt = (now + a.t * 900) % 4200;
      const closed = bt < 120;
      for (const e of mascot.parts.eyes || []) e.scale.y = closed ? 0.12 : 1;

      const pulse = 1 + Math.sin(now * 0.004) * (working ? 0.08 : 0.03);
      ring.scale.set(pulse, pulse, pulse);
      ringMat.opacity = working ? 0.9 : waiting ? 0.7 : 0.35;
      ringMat.color.set(g.userData.modelFailed ? 0xf08a8a : a.color);
      halo.material.opacity = working ? 0.05 + Math.sin(now * 0.003) * 0.02 : 0;

      const scr = a.__screen;
      if (scr) scr.emissiveIntensity = working ? 0.9 : 0.15;
    }

    const tr = (state.transfers || [])[0];
    if (tr) {
      const A = avatars[tr.from], B = avatars[tr.to];
      if (A && B) {
        const k = Math.min(1, tr.t / tr.dur);
        transferSprite.position.set(
          A.position.x + (B.position.x - A.position.x) * k,
          1.35 + Math.sin(Math.PI * k) * 0.9,
          A.position.z + (B.position.z - A.position.z) * k
        );
        transferSprite.visible = true;
      } else {
        transferSprite.visible = false;
      }
    } else {
      transferSprite.visible = false;
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
    setActive(v) { active = Boolean(v); if (active) { clock.getDelta(); resize(); } },
    setTheme: applyTheme,
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const mm of mats) { if (mm.map) mm.map.dispose(); mm.dispose(); }
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      for (const a of Object.values(state.agents)) delete a.__screen;
    },
  };
}
