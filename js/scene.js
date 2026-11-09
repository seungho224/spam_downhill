import { clamp, createMaterial } from "./utils.js";

const ROAD_WIDTH = 18;
const SLOPE = 0.018;

function box(THREE, parent, size, material, position) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(
  THREE,
  parent,
  top,
  bottom,
  height,
  material,
  position,
  segments = 12,
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(top, bottom, height, segments),
    material,
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function makeSpamTexture(THREE, seed, charOnly = false, marbleOnly = false) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  const random = seededRandom(seed);

  if (marbleOnly) {
    for (let index = 0; index < 24; index++) {
      const startX = 20 + random() * 216;
      const startY = 18 + random() * 220;
      const length = 18 + random() * 72;
      const drift = (random() - 0.5) * 34;
      context.beginPath();
      context.moveTo(startX, startY);
      context.bezierCurveTo(
        startX + drift * 0.3,
        startY + length * 0.28,
        startX + drift,
        startY + length * 0.72,
        startX + drift * 0.65,
        startY + length,
      );
      context.strokeStyle = `rgba(255, 250, 244, ${0.5 + random() * 0.45})`;
      context.lineWidth = 1.6 + random() * 3;
      context.lineCap = "round";
      context.stroke();
    }
  } else if (charOnly) {
    for (let index = 0; index < 54; index++) {
      const x = 30 + random() * 196;
      const y = 28 + random() * 200;
      const length = 5 + random() * 27;
      context.beginPath();
      context.moveTo(x, y);
      context.bezierCurveTo(
        x + (random() - 0.5) * 13,
        y + length * 0.32,
        x + (random() - 0.5) * 12,
        y + length * 0.72,
        x + (random() - 0.5) * 8,
        y + length,
      );
      context.strokeStyle = `rgba(15, 13, 12, ${0.38 + random() * 0.55})`;
      context.lineWidth = 1.1 + random() * 2.5;
      context.lineCap = "round";
      context.stroke();
    }
    for (let index = 0; index < 150; index++) {
      context.fillStyle = `rgba(12, 11, 10, ${0.25 + random() * 0.62})`;
      context.beginPath();
      context.ellipse(
        24 + random() * 208,
        24 + random() * 208,
        0.6 + random() * 2.2,
        0.5 + random() * 1.6,
        random() * Math.PI,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  } else {
    context.fillStyle = "#f1a0a5";
    context.fillRect(0, 0, 256, 256);
    const fill = context.createLinearGradient(0, 0, 256, 256);
    fill.addColorStop(0, "#fff0e8");
    fill.addColorStop(0.42, "#f7e6da");
    fill.addColorStop(0.76, "#ecd4c4");
    fill.addColorStop(1, "#dfc0ae");
    context.fillStyle = fill;
    context.beginPath();
    context.roundRect(11, 11, 234, 234, 34);
    context.fill();
    context.strokeStyle = "rgba(244, 191, 131, .34)";
    context.lineWidth = 3;
    context.stroke();

    for (let index = 0; index < 175; index++) {
      const x = 22 + random() * 212;
      const y = 22 + random() * 212;
      context.fillStyle =
        random() > 0.5 ? "rgba(255, 222, 164, .14)" : "rgba(86, 47, 38, .11)";
      context.beginPath();
      context.ellipse(
        x,
        y,
        0.7 + random() * 2.1,
        0.5 + random() * 1.7,
        random() * Math.PI,
        0,
        Math.PI * 2,
      );
      context.fill();
    }

    const sheen = context.createLinearGradient(38, 40, 172, 206);
    sheen.addColorStop(0, "rgba(255, 244, 212, .3)");
    sheen.addColorStop(0.23, "rgba(255, 239, 209, .08)");
    sheen.addColorStop(0.55, "rgba(255, 239, 209, 0)");
    context.fillStyle = sheen;
    context.beginPath();
    context.roundRect(11, 11, 234, 234, 34);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function buildRoad(THREE, scene, finishDistance, materials) {
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_WIDTH, finishDistance + 180),
    materials.road,
  );
  road.rotation.x = -Math.PI / 2 - Math.atan(SLOPE);
  road.position.set(0, SLOPE * (-finishDistance / 2), -finishDistance / 2);
  road.receiveShadow = true;
  scene.add(road);

  for (const side of [-1, 1]) {
    const sidewalk = new THREE.Mesh(
      new THREE.BoxGeometry(5.8, 0.28, finishDistance + 180),
      materials.sidewalk,
    );
    sidewalk.rotation.x = -Math.atan(SLOPE);
    sidewalk.position.set(
      side * 11.9,
      SLOPE * (-finishDistance / 2) - 0.14,
      -finishDistance / 2,
    );
    sidewalk.receiveShadow = true;
    scene.add(sidewalk);

    const seams = new THREE.InstancedMesh(
      new THREE.BoxGeometry(5.7, 0.018, 0.075),
      materials.sidewalkSeam,
      Math.ceil((finishDistance + 200) / 8),
    );
    const seamTransform = new THREE.Object3D();
    let seamIndex = 0;
    for (let z = 18; z > -finishDistance - 150; z -= 8) {
      seamTransform.position.set(side * 11.9, SLOPE * z + 0.015, z);
      seamTransform.rotation.set(-Math.atan(SLOPE), 0, 0);
      seamTransform.updateMatrix();
      seams.setMatrixAt(seamIndex++, seamTransform.matrix);
    }
    seams.count = seamIndex;
    scene.add(seams);

    const curb = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.42, finishDistance + 180),
      materials.curb,
    );
    curb.rotation.x = -Math.atan(SLOPE);
    curb.position.set(
      side * 9.06,
      SLOPE * (-finishDistance / 2) - 0.03,
      -finishDistance / 2,
    );
    curb.receiveShadow = true;
    scene.add(curb);
  }

  for (const x of [-3, 3]) {
    for (let z = 0; z > -finishDistance - 130; z -= 22) {
      const dash = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.045, 9.5),
        materials.lane,
      );
      dash.position.set(x, SLOPE * z + 0.04, z);
      dash.receiveShadow = true;
      scene.add(dash);
    }
  }

  const finishZ = -finishDistance;
  for (let x = -9; x < 9; x += 1.5) {
    const tile = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.09, 0.8),
      materials.checker[Math.round((x + 9) / 1.5) % 2],
    );
    tile.position.set(x + 0.75, SLOPE * finishZ + 0.05, finishZ);
    scene.add(tile);
  }
  return finishZ;
}

function buildBuilding(THREE, scene, z, side, random, materials) {
  const group = new THREE.Group();
  const width = 13 + random() * 9;
  const depth = 22 + random() * 8;
  const floors = 3 + Math.floor(random() * 4);
  const height = floors * 3.35;
  const bodyMaterial =
    materials.buildings[Math.floor(random() * materials.buildings.length)];
  group.position.set(side * (15.25 + width / 2), SLOPE * z, z);
  scene.add(group);

  box(THREE, group, [width, height, depth], bodyMaterial, [0, height / 2, 0]);
  box(THREE, group, [width + 0.45, 0.42, depth + 0.4], materials.trim, [
    0,
    height + 0.18,
    0,
  ]);

  const columns = Math.max(3, Math.floor(width / 2.7));
  const windowWidth = Math.min(1.45, (width / (columns + 1)) * 0.58);
  const windowCount = columns * (floors - 1);
  const windows = new THREE.InstancedMesh(
    new THREE.BoxGeometry(windowWidth, 1.65, 0.12),
    materials.windowInstances,
    windowCount,
  );
  const frames = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials.trim,
    windowCount * 4,
  );
  const transform = new THREE.Object3D();
  let windowIndex = 0;
  let frameIndex = 0;
  for (let floor = 1; floor < floors; floor++) {
    for (let column = 0; column < columns; column++) {
      const wx = -width / 2 + ((column + 1) * width) / (columns + 1);
      const wy = floor * 3.35 + 0.35;
      const glass =
        random() > 0.17
          ? materials.windows[Math.floor(random() * materials.windows.length)]
          : materials.darkWindow;
      transform.position.set(wx, wy, depth / 2 + 0.065);
      transform.scale.set(1, 1, 1);
      transform.updateMatrix();
      windows.setMatrixAt(windowIndex, transform.matrix);
      windows.setColorAt(windowIndex, glass.color);
      windowIndex += 1;
      for (const offset of [-1, 1]) {
        transform.position.set(
          wx + (offset * windowWidth) / 2,
          wy,
          depth / 2 + 0.14,
        );
        transform.scale.set(0.07, 1.78, 0.16);
        transform.updateMatrix();
        frames.setMatrixAt(frameIndex++, transform.matrix);
      }
      for (const offset of [-0.5, 0.5]) {
        transform.position.set(wx, wy + offset * 1.78, depth / 2 + 0.14);
        transform.scale.set(windowWidth + 0.08, 0.07, 0.16);
        transform.updateMatrix();
        frames.setMatrixAt(frameIndex++, transform.matrix);
      }
    }
  }
  windows.instanceMatrix.needsUpdate = true;
  frames.instanceMatrix.needsUpdate = true;
  windows.castShadow = true;
  group.add(windows, frames);

  const streetColumns = Math.max(2, Math.floor(depth / 5));
  const streetWindowWidth = Math.min(
    1.45,
    (depth / (streetColumns + 1)) * 0.56,
  );
  const streetWindowCount = streetColumns * Math.max(1, floors - 1);
  const streetWindows = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.12, 1.65, streetWindowWidth),
    materials.windowInstances,
    streetWindowCount,
  );
  const streetFrames = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials.trim,
    streetWindowCount * 4,
  );
  const streetX = -side * (width / 2 + 0.065);
  let streetWindowIndex = 0;
  let streetFrameIndex = 0;
  for (let floor = 1; floor < floors; floor++) {
    for (let column = 0; column < streetColumns; column++) {
      const wz = -depth / 2 + ((column + 1) * depth) / (streetColumns + 1);
      const wy = floor * 3.35 + 0.35;
      const glass =
        random() > 0.17
          ? materials.windows[Math.floor(random() * materials.windows.length)]
          : materials.darkWindow;
      transform.position.set(streetX, wy, wz);
      transform.scale.set(1, 1, 1);
      transform.updateMatrix();
      streetWindows.setMatrixAt(streetWindowIndex, transform.matrix);
      streetWindows.setColorAt(streetWindowIndex, glass.color);
      streetWindowIndex++;
      for (const offset of [-1, 1]) {
        transform.position.set(
          streetX + -side * 0.075,
          wy,
          wz + (offset * streetWindowWidth) / 2,
        );
        transform.scale.set(0.16, 1.78, 0.07);
        transform.updateMatrix();
        streetFrames.setMatrixAt(streetFrameIndex++, transform.matrix);
      }
      for (const offset of [-0.5, 0.5]) {
        transform.position.set(streetX + -side * 0.075, wy + offset * 1.78, wz);
        transform.scale.set(0.16, 0.07, streetWindowWidth + 0.08);
        transform.updateMatrix();
        streetFrames.setMatrixAt(streetFrameIndex++, transform.matrix);
      }
    }
  }
  streetWindows.instanceMatrix.needsUpdate = true;
  streetFrames.instanceMatrix.needsUpdate = true;
  group.add(streetWindows, streetFrames);

  const doorX = -side * (width / 2 + 0.085);
  const doorZ = -depth * 0.18;
  box(THREE, group, [0.1, 2.55, 1.35], materials.shopWindows, [
    doorX,
    1.28,
    doorZ,
  ]);
  box(THREE, group, [0.15, 2.72, 0.09], materials.trim, [
    doorX + -side * 0.07,
    1.36,
    doorZ - 0.72,
  ]);
  box(THREE, group, [0.15, 2.72, 0.09], materials.trim, [
    doorX + -side * 0.07,
    1.36,
    doorZ + 0.72,
  ]);
  box(THREE, group, [0.15, 0.09, 1.52], materials.trim, [
    doorX + -side * 0.07,
    2.72,
    doorZ,
  ]);
  const streetSign = box(
    THREE,
    group,
    [0.18, 0.52, 2.4],
    materials.signs[Math.floor(random() * materials.signs.length)],
    [doorX + -side * 0.12, 3.15, doorZ],
  );
  streetSign.material.emissive = streetSign.material.color
    .clone()
    .multiplyScalar(0.12);

  const shop = box(
    THREE,
    group,
    [width * 0.78, 1.3, 0.28],
    materials.signs[Math.floor(random() * materials.signs.length)],
    [0, 2.08, depth / 2 + 0.18],
  );
  shop.material.emissive = shop.material.color.clone().multiplyScalar(0.2);
  box(
    THREE,
    group,
    [width * 0.88, 0.22, 1.5],
    materials.awning[Math.floor(random() * materials.awning.length)],
    [0, 1.3, depth / 2 + 0.73],
  );
  const shopWindowWidth = Math.min(1.8, (width / (columns + 1)) * 0.7);
  const shopWindows = new THREE.InstancedMesh(
    new THREE.BoxGeometry(shopWindowWidth, 2.35, 0.12),
    materials.shopWindows,
    columns,
  );
  for (let i = 0; i < columns; i++) {
    const wx = -width / 2 + ((i + 1) * width) / (columns + 1);
    transform.position.set(wx, 1.25, depth / 2 + 0.08);
    transform.scale.set(1, 1, 1);
    transform.updateMatrix();
    shopWindows.setMatrixAt(i, transform.matrix);
  }
  shopWindows.instanceMatrix.needsUpdate = true;
  group.add(shopWindows);
}

function buildCity(THREE, scene, finishDistance, materials) {
  const random = seededRandom(85492);
  for (let z = 24; z > -finishDistance - 80; z -= 25 + random() * 8) {
    for (const side of [-1, 1]) {
      buildBuilding(THREE, scene, z, side, random, materials);

      const lamp = new THREE.Group();
      lamp.position.set(side * 11.3, SLOPE * z, z);
      scene.add(lamp);
      cylinder(THREE, lamp, 0.09, 0.13, 5.2, materials.lamp, [0, 2.6, 0], 8);
      box(THREE, lamp, [0.14, 0.12, 1.65], materials.lamp, [
        side * -0.5,
        5.15,
        0,
      ]);
      box(THREE, lamp, [0.48, 0.16, 0.34], materials.bulb, [
        side * -1.05,
        4.95,
        0,
      ]);
      if (random() > 0.52) {
        box(THREE, lamp, [0.16, 1.5, 0.14], materials.signPole, [
          side * -0.4,
          0.8,
          0,
        ]);
        const sign = box(
          THREE,
          lamp,
          [0.7, 1.35, 0.12],
          materials.signs[Math.floor(random() * materials.signs.length)],
          [side * -0.4, 2.15, 0],
        );
        sign.material.emissive = sign.material.color
          .clone()
          .multiplyScalar(0.12);
      }
    }
  }
}

function makeCar(THREE, parent, x, z, side, materials, random) {
  const group = new THREE.Group();
  group.position.set(x, SLOPE * z, z);
  group.userData = { type: "car", hit: false };
  parent.add(group);
  const bodyMaterial =
    materials.cars[Math.floor(random() * materials.cars.length)];
  box(THREE, group, [4.6, 1.05, 5.7], bodyMaterial, [0, 0.9, 0]);
  box(THREE, group, [3.8, 0.95, 2.25], materials.glass, [0, 1.79, -0.35]);
  box(THREE, group, [3.92, 0.86, 1.85], materials.glass, [0, 1.72, 1.72]);
  const wheels = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.43, 0.43, 0.24, 12),
    materials.tire,
    4,
  );
  const transform = new THREE.Object3D();
  let wheelIndex = 0;
  for (const wx of [-2.2, 2.2]) {
    for (const wz of [-1.82, 1.82]) {
      transform.position.set(wx, 0.55, wz);
      transform.rotation.set(0, 0, Math.PI / 2);
      transform.updateMatrix();
      wheels.setMatrixAt(wheelIndex++, transform.matrix);
    }
  }
  wheels.instanceMatrix.needsUpdate = true;
  group.add(wheels);
  return group;
}

function makeCone(THREE, parent, x, z, materials) {
  const group = new THREE.Group();
  group.position.set(x, SLOPE * z, z);
  group.userData = { type: "cone", hit: false };
  parent.add(group);
  cylinder(THREE, group, 0.06, 0.54, 1.5, materials.cone, [0, 0.78, 0], 10);
  cylinder(THREE, group, 0.4, 0.4, 0.16, materials.white, [0, 0.7, 0], 10);
  box(THREE, group, [0.9, 0.16, 0.68], materials.white, [0, 0.1, 0]);
  return group;
}

function makeBarrier(THREE, parent, x, z, materials) {
  const group = new THREE.Group();
  group.position.set(x, SLOPE * z, z);
  group.userData = { type: "barrier", hit: false };
  parent.add(group);
  box(THREE, group, [2.8, 0.92, 0.48], materials.white, [0, 1.15, 0]);
  for (let index = -1; index <= 1; index++) {
    const stripe = box(THREE, group, [0.46, 0.95, 0.5], materials.cone, [
      index * 0.85,
      1.15,
      0,
    ]);
    stripe.rotation.z = -0.24;
  }
  for (const legX of [-1, 1])
    box(THREE, group, [0.18, 0.74, 0.22], materials.chrome, [legX, 0.36, 0]);
  return group;
}

function buildTraffic(THREE, scene, obstacleGroup, finishDistance, materials) {
  const random = seededRandom(42771);
  const lanePositions = [-5.7, 0, 5.7];
  const obstacles = [];
  const recentRows = [];
  let distance = 37;
  while (distance < finishDistance - 20) {
    const blockedLanes = lanePositions.filter(
      (lane) =>
        recentRows.length >= 2 &&
        recentRows.at(-1).includes(lane) &&
        recentRows.at(-2).includes(lane),
    );
    const laneOrder = lanePositions
      .filter((lane) => !blockedLanes.includes(lane))
      .sort(() => random() - 0.5);
    const count = random() < 0.34 && laneOrder.length > 1 ? 2 : 1;
    const rowLanes = laneOrder.slice(0, count);
    for (const lane of rowLanes) {
      const z = -distance + (random() - 0.5) * 3;
      const roll = random();
      const obstacle =
        roll < 0.82
          ? makeCar(THREE, obstacleGroup, lane, z, 1, materials, random)
          : roll < 0.94
            ? makeCone(THREE, obstacleGroup, lane, z, materials)
            : makeBarrier(THREE, obstacleGroup, lane, z, materials);
      obstacle.userData.distance = distance;
      obstacles.push(obstacle);
    }
    recentRows.push(rowLanes);
    if (recentRows.length > 2) recentRows.shift();
    distance += 19 + random() * 11;
  }
  return obstacles;
}

function makeCookingRig(THREE, camera, materials, cookingSystem) {
  const rig = new THREE.Group();
  rig.position.set(0.15, -0.58, -1.72);
  rig.rotation.set(0.12, 0, 0);
  camera.add(rig);

  const pan = new THREE.Group();
  rig.add(pan);
  const cookware = new THREE.Group();
  cookware.scale.setScalar(1.05);
  pan.add(cookware);
  const panMaterial = materials.wok.clone();
  panMaterial.side = THREE.DoubleSide;
  panMaterial.color.setHex(0x596266);
  panMaterial.metalness = 0.62;
  panMaterial.roughness = 0.3;
  const panProfile = [
    new THREE.Vector2(0, -0.01),
    new THREE.Vector2(0.45, -0.004),
    new THREE.Vector2(0.58, 0.025),
    new THREE.Vector2(0.66, 0.075),
    new THREE.Vector2(0.69, 0.12),
    new THREE.Vector2(0.69, 0.145),
    new THREE.Vector2(0.66, 0.145),
    new THREE.Vector2(0.63, 0.09),
    new THREE.Vector2(0.56, 0.035),
    new THREE.Vector2(0.4, 0.005),
    new THREE.Vector2(0, -0.002),
  ];
  const panBody = new THREE.Mesh(
    new THREE.LatheGeometry(panProfile, 48),
    panMaterial,
  );
  panBody.castShadow = true;
  cookware.add(panBody);

  const interiorMaterial = materials.wokInside.clone();
  interiorMaterial.color.setHex(0x4c5558);
  interiorMaterial.metalness = 0.48;
  interiorMaterial.roughness = 0.38;
  const innerProfile = [
    new THREE.Vector2(0, -0.001),
    new THREE.Vector2(0.3, 0.003),
    new THREE.Vector2(0.48, 0.018),
    new THREE.Vector2(0.58, 0.046),
    new THREE.Vector2(0.63, 0.09),
  ];
  const inner = new THREE.Mesh(
    new THREE.LatheGeometry(innerProfile, 40),
    interiorMaterial,
  );
  cookware.add(inner);

  const handle = new THREE.Group();
  handle.position.set(0.64, 0.17, 0);
  handle.scale.setScalar(0.8);
  cookware.add(handle);
  box(THREE, handle, [0.2, 0.065, 0.13], materials.chrome, [0.1, 0, 0]);
  box(THREE, handle, [0.42, 0.065, 0.11], materials.chrome, [0.4, 0, 0]);
  const gripMaterial = materials.tire.clone();
  gripMaterial.color.setHex(0x514031);
  box(THREE, handle, [0.28, 0.095, 0.14], gripMaterial, [0.74, 0, 0]);

  const spam = [];
  const spamTops = [];
  const spamSides = [];
  const spamMarbles = [];
  const getSliceBaseY = (item) => {
    const radiusRatio = Math.min(1, Math.hypot(item.x, item.z) / 0.43);
    return 0.008 + radiusRatio * radiusRatio * 0.084 + 0.033;
  };
  for (let index = 0; index < 7; index++) {
    const item = cookingSystem.items[index];
    const sliceTopMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: makeSpamTexture(THREE, 7781 + index),
      roughness: 0.29,
      metalness: 0.015,
      clearcoat: 0.62,
      clearcoatRoughness: 0.2,
    });
    const sliceSideMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf1a0a5,
      roughness: 0.34,
      metalness: 0.01,
      clearcoat: 0.45,
      clearcoatRoughness: 0.24,
    });
    const slice = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.066, 0.31), [
      sliceSideMaterial,
      sliceSideMaterial,
      sliceTopMaterial,
      sliceTopMaterial,
      sliceSideMaterial,
      sliceSideMaterial,
    ]);
    slice.position.set(item.x, getSliceBaseY(item), item.z);
    slice.rotation.y = item.rotationY;
    slice.castShadow = true;
    cookware.add(slice);
    spam.push(slice);
    spamTops.push(sliceTopMaterial);
    spamSides.push(sliceSideMaterial);

    const charMaterial = new THREE.MeshBasicMaterial({
      map: makeSpamTexture(THREE, 19823 + index, true),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const charGeometry = new THREE.PlaneGeometry(0.245, 0.285);
    const topCharMarks = new THREE.Mesh(charGeometry, charMaterial);
    topCharMarks.rotation.x = -Math.PI / 2;
    topCharMarks.position.y = 0.034;
    const bottomCharMaterial = charMaterial.clone();
    const bottomCharMarks = new THREE.Mesh(charGeometry, bottomCharMaterial);
    bottomCharMarks.rotation.x = Math.PI / 2;
    bottomCharMarks.position.y = -0.034;
    slice.add(topCharMarks, bottomCharMarks);
    slice.userData.charMarks = [topCharMarks, bottomCharMarks];

    const marbleMaterial = new THREE.MeshBasicMaterial({
      map: makeSpamTexture(THREE, 31991 + index, false, true),
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const topMarbleMarks = new THREE.Mesh(charGeometry, marbleMaterial);
    topMarbleMarks.rotation.x = -Math.PI / 2;
    topMarbleMarks.position.y = 0.0345;
    const bottomMarbleMarks = new THREE.Mesh(
      charGeometry,
      marbleMaterial.clone(),
    );
    bottomMarbleMarks.rotation.x = Math.PI / 2;
    bottomMarbleMarks.position.y = -0.0345;
    slice.add(topMarbleMarks, bottomMarbleMarks);
    spamMarbles.push([topMarbleMarks, bottomMarbleMarks]);
  }

  const steam = [];
  for (let index = 0; index < 9; index++) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xf6f0dc,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.1 + (index % 3) * 0.04, 8, 6),
      material,
    );
    puff.position.set(
      ((index % 3) - 1) * 0.31,
      0.16 + Math.floor(index / 3) * 0.28,
      (Math.floor(index / 3) - 1) * 0.2,
    );
    cookware.add(puff);
    steam.push(puff);
  }

  const oilDrops = [];
  for (let index = 0; index < 12; index++) {
    const drop = new THREE.Mesh(
      new THREE.SphereGeometry(0.045 + (index % 3) * 0.012, 8, 6),
      new THREE.MeshBasicMaterial({
        color: index % 2 ? 0xffc35e : 0xffe6a3,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    drop.userData.phase = index / 12;
    cookware.add(drop);
    oilDrops.push(drop);
  }

  return {
    rig,
    wok: pan,
    spam,
    steam,
    oilDrops,
    update(dt, cooking, time) {
      const heat = cooking.heatLevel;
      const urgency =
        cooking.sinceFlip < 6 ? 0.18 : cooking.sinceFlip < 10 ? 0.62 : 1;
      const toss =
        cooking.airTime > 0
          ? Math.sin(((0.68 - cooking.airTime) / 0.68) * Math.PI)
          : 0;
      pan.rotation.x = 0.14 - toss * 0.48;
      pan.rotation.y = -Math.PI / 4 + Math.sin(time * 1.8) * 0.012;
      pan.rotation.z = Math.sin(time * 1.8) * 0.004;
      spam.forEach((slice, index) => {
        const item = cooking.items[index];
        if (cooking.airTime > 0) {
          const progress = clamp(1 - cooking.airTime / 0.68, 0, 1);
          const eased = progress * progress * (3 - 2 * progress);
          const lift = Math.sin(progress * Math.PI) * item.flipHeight;
          slice.position.set(item.x, getSliceBaseY(item) + lift, item.z);
          slice.rotation.x =
            item.flipStartRotation +
            (item.flipEndRotation - item.flipStartRotation) * eased;
        } else {
          slice.position.lerp(
            new THREE.Vector3(item.x, getSliceBaseY(item), item.z),
            1 - Math.exp(-14 * dt),
          );
          slice.rotation.x = item.flipEndRotation;
        }
        const cooked = clamp(item.cookedLevel * 1.05, 0, 1);
        const browned = new THREE.Color(0xf1a0a5).lerp(
          new THREE.Color(0xc8784c),
          cooked,
        );
        browned.lerp(new THREE.Color(0x53342b), item.scorch * 0.62);
        spamTops[index].color.copy(browned);
        spamSides[index].color.copy(browned);
        spamSides[index].roughness = 0.31 + item.scorch * 0.18;
        const charOpacity = clamp(
          (item.cookedLevel - 0.76) * 4 + item.scorch * 0.78,
          0,
          0.95,
        );
        slice.userData.charMarks.forEach((mark) => {
          mark.material.opacity = charOpacity;
        });
        const marbleOpacity = 0.68 * (1 - clamp(item.cookedLevel / 0.8, 0, 1));
        const marbleColor = new THREE.Color(0xfff2e3).lerp(browned, 0.58);
        spamMarbles[index].forEach((mark) => {
          mark.material.color.copy(marbleColor);
          mark.material.opacity = marbleOpacity;
        });
      });
      steam.forEach((puff, index) => {
        const cycle = (time * (0.55 + urgency * 0.34) + index * 0.31) % 1;
        puff.position.y = 0.1 + cycle * 1.02;
        puff.position.x = Math.sin(time * 1.3 + index * 1.4) * 0.42;
        puff.material.opacity =
          (0.04 + heat * 0.22) *
          Math.sin(cycle * Math.PI) *
          (0.4 + urgency * 0.6);
        puff.scale.setScalar(0.6 + cycle * 1.25);
      });
      oilDrops.forEach((drop, index) => {
        const cycle = (time * (0.8 + urgency * 0.55) + drop.userData.phase) % 1;
        const active = cooking.sinceFlip > 6;
        const burst = active ? Math.sin(cycle * Math.PI) : 0;
        const angle = index * 2.4 + time * 0.7;
        drop.position.set(
          Math.cos(angle) * (0.61 + burst * 0.3),
          0.12 + burst * (0.25 + (index % 3) * 0.1),
          Math.sin(angle) * (0.61 + burst * 0.3),
        );
        drop.material.opacity = active
          ? burst * (cooking.sinceFlip > 8.5 ? 0.92 : 0.48)
          : 0;
      });
    },
  };
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

export function createGameScene(THREE, mount, finishDistance, cookingSystem) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x91bfd0);
  scene.fog = new THREE.Fog(0x91bfd0, 115, 290);
  const camera = new THREE.PerspectiveCamera(
    76,
    innerWidth / innerHeight,
    0.08,
    500,
  );
  camera.position.set(0, 1.72, 7);
  camera.rotation.x = -0.035;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  mount.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xd8efff, 0x4d483e, 2.0));
  scene.add(camera);
  const sun = new THREE.DirectionalLight(0xffd9a8, 3.0);
  sun.position.set(-35, 60, 25);
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.camera.left = -34;
  sun.shadow.camera.right = 34;
  sun.shadow.camera.top = 45;
  sun.shadow.camera.bottom = -35;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  const materials = {
    road: createMaterial(THREE, 0x333a42, 0.92),
    sidewalk: createMaterial(THREE, 0x9b9b91, 0.91),
    sidewalkSeam: createMaterial(THREE, 0x777d7a, 0.9),
    curb: createMaterial(THREE, 0xd1c2a8, 0.84),
    lane: createMaterial(THREE, 0xe7d8aa, 0.7),
    checker: [createMaterial(THREE, 0x222a32), createMaterial(THREE, 0xf5eee0)],
    buildings: [0x88796d, 0x7b8583, 0x9a8c7c, 0x777e87, 0xb09b7e].map((color) =>
      createMaterial(THREE, color),
    ),
    windows: [0x9fcee0, 0x8db5c4, 0xf3cb87, 0x6f9baa].map((color) =>
      createMaterial(THREE, color, 0.28, 0.1),
    ),
    windowInstances: createMaterial(THREE, 0xffffff, 0.28, 0.1),
    darkWindow: createMaterial(THREE, 0x394751, 0.34),
    trim: createMaterial(THREE, 0xd5c8ae, 0.66),
    signs: [0xee7950, 0x47a5a0, 0xe4b84d, 0x687ec1, 0xdb6288].map((color) =>
      createMaterial(THREE, color, 0.48),
    ),
    awning: [0xf0eee4, 0xd55e4f, 0xe2ba55].map((color) =>
      createMaterial(THREE, color),
    ),
    shopWindows: createMaterial(THREE, 0x91b6ba, 0.32, 0.12),
    lamp: createMaterial(THREE, 0x333b40, 0.48, 0.42),
    bulb: new THREE.MeshStandardMaterial({
      color: 0xffd18a,
      emissive: 0xffad48,
      emissiveIntensity: 1.2,
    }),
    signPole: createMaterial(THREE, 0x4f5657, 0.58),
    cars: [0xe1574e, 0x4c83a1, 0xe6b84b, 0x668779, 0x374957, 0xe3e0d5].map(
      (color) => createMaterial(THREE, color, 0.34, 0.12),
    ),
    glass: createMaterial(THREE, 0x9fc8d0, 0.24, 0.08),
    chrome: new THREE.MeshPhysicalMaterial({
      color: 0xaeb4ad,
      roughness: 0.24,
      metalness: 0.64,
      clearcoat: 0.5,
      clearcoatRoughness: 0.16,
    }),
    tire: createMaterial(THREE, 0x24292d, 0.82),
    tailLight: createMaterial(THREE, 0xf3523d, 0.35),
    cone: createMaterial(THREE, 0xf36c43, 0.72),
    white: createMaterial(THREE, 0xf2eee3, 0.72),
    wok: new THREE.MeshPhysicalMaterial({
      color: 0x333c42,
      roughness: 0.23,
      metalness: 0.78,
      clearcoat: 0.62,
      clearcoatRoughness: 0.18,
    }),
    wokInside: createMaterial(THREE, 0x20272a, 0.56, 0.2),
    spam: createMaterial(THREE, 0xd99868, 0.45),
  };

  const finishZ = buildRoad(THREE, scene, finishDistance, materials);
  buildCity(THREE, scene, finishDistance, materials);
  const obstacleGroup = new THREE.Group();
  scene.add(obstacleGroup);
  const obstacles = buildTraffic(
    THREE,
    scene,
    obstacleGroup,
    finishDistance,
    materials,
  );
  const cookingRig = makeCookingRig(THREE, camera, materials, cookingSystem);

  function resizeCookingRig() {
    const scale = clamp((innerWidth / 1200) * 0.98, 0.84, 1.08);
    cookingRig.rig.scale.setScalar(scale);
    cookingRig.rig.position.y = -0.66 - (1.08 - scale) * 0.45;
  }
  resizeCookingRig();

  return {
    scene,
    camera,
    renderer,
    obstacles,
    cookingRig,
    finishZ,
    resetObstacles() {
      obstacles.forEach((obstacle) => {
        obstacle.userData.hit = false;
      });
    },
    updateCamera(ride, dt) {
      const groundY = -SLOPE * ride.distance + ride.jumpHeight;
      const impactShake =
        ride.hitTimer > 1.05 ? Math.sin(performance.now() * 0.075) * 0.09 : 0;
      camera.position.x +=
        (ride.x - camera.position.x) * (1 - Math.exp(-10 * dt));
      camera.position.y = 1.72 + groundY + impactShake + ride.jumpHeight * 0.08;
      camera.position.z = 7 - ride.distance;
      camera.rotation.z +=
        (-ride.lateralVelocity * 0.008 - camera.rotation.z) *
        (1 - Math.exp(-7 * dt));
      camera.rotation.x = -0.035 - ride.jumpHeight * 0.008;
      camera.rotation.y = -ride.lateralVelocity * 0.0016;
    },
    render() {
      renderer.render(scene, camera);
    },
    resize() {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
      resizeCookingRig();
    },
  };
}
