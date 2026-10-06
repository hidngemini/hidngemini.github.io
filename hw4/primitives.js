// cube
const cubeVertices = new Float32Array([
  -1, -1, -1,  // 0
   1, -1, -1,  // 1
   1,  1, -1,  // 2
  -1,  1, -1,  // 3
  -1, -1,  1,  // 4
   1, -1,  1,  // 5
   1,  1,  1,  // 6
  -1,  1,  1   // 7
]);

const cubeColors = new Float32Array([
  1,0,0,  // 0
  0,1,0,  // 1
  0,0,1,  // 2
  1,1,0,  // 3
  1,0,1,  // 4
  0,1,1,  // 5
  1,1,0,  // 6
  1,0,1,  // 7
]);


const cubeIndices = new Uint16Array([
  // Front
  4, 5, 6,   4, 6, 7,
  // Back
  1, 0, 3,   1, 3, 2,
  // Top
  3, 7, 6,   3, 6, 2,
  // Bottom
  0, 1, 5,   0, 5, 4,
  // Right
  1, 2, 6,   1, 6, 5,
  // Left
  0, 4, 7,   0, 7, 3,
]);

function UVSphereVertices(uSteps, vSteps, r) {
  let vertices = [];
  for (let i = 0; i <= vSteps; i++) {
  const v = i * Math.PI / vSteps;
    const sinv = Math.sin(v);
    const cosv = Math.cos(v);
    for (let j = 0; j <= uSteps; j++) {
      const u = j * 2 * Math.PI / uSteps;
      const sinu = Math.sin(u);
      const cosu = Math.cos(u);
      const x = r * cosu * sinv;
      const y = r * cosv;
      const z = r * sinu * sinv;
      vertices.push(x, y, z);
    }
  }
  return new Float32Array(vertices);
}

function coneVertices(uSteps, vSteps, r, h) {
  let vertices = [];
  for (let i = 0; i <= vSteps; i++) {
  const v = i / vSteps;
    for (let j = 0; j <= uSteps; j++) {
      const u = j * 2 * Math.PI / uSteps;
      const sinu = Math.sin(u);
      const cosu = Math.cos(u);
      const x = r * (1-v) * cosu;
      const y = r * (1-v) * sinu;
      const z = h * v
      vertices.push(x, y, z);
    }
  }
  return new Float32Array(vertices);
}

function torusVertices(uSteps, vSteps, R, r) {
  let vertices = [];
  for (let i = 0; i <= vSteps; i++) {
  const v = i * 2 * Math.PI / vSteps;
    const sinv = Math.sin(v);
    const cosv = Math.cos(v);
    for (let j = 0; j <= uSteps; j++) {
      const u = j * 2 * Math.PI / uSteps;
      const sinu = Math.sin(u);
      const cosu = Math.cos(u);
      const x = (R + r*cosv) * cosu;
      const y = (R + r*cosv) * sinu;
      const z = r * sinv;
      vertices.push(x, y, z);
    }
  }
  return new Float32Array(vertices);
}

function indices(uSteps, vSteps) {
  let indices = [];
  for (let i = 0; i < vSteps; i++) {
    for (let j = 0; j < uSteps; j++) {
      const k1 = (i * (uSteps + 1)) + j;
      const k2 = k1 + uSteps + 1;
      indices.push(k1, k2, k1 + 1);
      indices.push(k2, k2 + 1, k1 + 1);
    }
  }
  return new Uint16Array(indices);
}

function getColoursFromScheme(numVertices, sel) {
  let colours;
  switch (sel) {
    case "sun": colours = getRandomColours(numVertices, 1, 0.15, 0.15, 0, 0.5, 0); break;
    case "earth": colours = getRandomColours(numVertices, 0.33, 0, 0, 0, 1, 1); break;
    case "mars": colours = getRandomColours(numVertices, 0.4, 0.2, 0.2, 0.7, 0.1, 0); break;
    case "moon": colours = getRandomGreyscale(numVertices, 0.4, 0.4); break;
    case "solar": colours = getRandomColours(numVertices, 0.3, 0.2, 0.9, 0.1, 0.1, 0.1); break;
    case "gold": colours = getRandomColours(numVertices, 0.7, 0.55, 0.45, 0.2, 0.2, 0); break;
    case "satelite": colours = getRandomGreyscale(numVertices, 0.6, 0.6); break;
  }
  return colours;
}

function getRandomColours(vertexCount, rBase, gBase, bBase, rVar, gVar, bVar) {
  let colours = [];
  for (let i = 0; i <= vertexCount; i++) {
    colours.push(rBase+rVar*Math.random(), gBase+gVar*Math.random(), bBase+bVar*Math.random());
  }
  return new Float32Array(colours);
}

function getRandomGreyscale(vertexCount, base, variance) {
  let colours = [];
  for (let i = 0; i <= vertexCount; i++) {
    let rand = Math.random();
    colours.push(base+variance*rand, base+variance*rand, base+variance*rand);
  }
  return new Float32Array(colours);
}