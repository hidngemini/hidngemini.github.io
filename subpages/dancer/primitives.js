function createCube() {
  const vertices = new Float32Array([
    -1, -1,  1,   1, -1,  1,   1,  1,  1,  -1,  1,  1,   // front
     1, -1, -1,  -1, -1, -1,  -1,  1, -1,   1,  1, -1,   // back
    -1,  1,  1,   1,  1,  1,   1,  1, -1,  -1,  1, -1,   // top
    -1, -1, -1,   1, -1, -1,   1, -1,  1,  -1, -1,  1,   // bottom
     1, -1,  1,   1, -1, -1,   1,  1, -1,   1,  1,  1,   // right
    -1, -1, -1,  -1, -1,  1,  -1,  1,  1,  -1,  1, -1    // left
  ]);
  const faceNormals = [[0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0]];
  const normals = new Float32Array(faceNormals.flatMap(n => [...n, ...n, ...n, ...n]));

  const indices = new Uint16Array([
     0,  1,  2,   0,  2,  3,   // front
     4,  5,  6,   4,  6,  7,   // back
     8,  9, 10,   8, 10, 11,   // top
    12, 13, 14,  12, 14, 15,   // bottom
    16, 17, 18,  16, 18, 19,   // right
    20, 21, 22,  20, 22, 23    // left
  ]);
  return { vertices, normals, indices };
}

function createUVSphere(uSteps, vSteps, r) {
  const vertices = [];
  const normals = [];
  const indices = [];

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

      const length = Math.hypot(x, y, z);
      normals.push(x / length, y / length, z / length);
    }
  }

  for (let i = 0; i < vSteps; i++) {
    for (let j = 0; j < uSteps; j++) {
      const first = i * (uSteps + 1) + j;
      const second = first + uSteps + 1;

      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices)
  };
}

function createCone(uSteps, vSteps, r, h) {
  let vertices = [];
  let normals = [];
  let indices = [];

  const slant = Math.hypot(r, h);
  const nxFactor = h / slant;
  const nzFactor = r / slant;

  for (let i = 0; i <= vSteps; i++) {
    const v = i / vSteps;
    for (let j = 0; j <= uSteps; j++) {
      const u = j * 2 * Math.PI / uSteps;
      const sinu = Math.sin(u);
      const cosu = Math.cos(u);

      const x = r * (1 - v) * cosu;
      const y = r * (1 - v) * sinu;
      const z = h * v;
      vertices.push(x, y, z);

      if (v === 1.0) {
        normals.push(0, 0, 1);
      } else {
        // formula i found online :)
        normals.push(cosu * nxFactor, sinu * nxFactor, nzFactor);
      }
    }
  }

  for (let i = 0; i < vSteps; i++) {
    for (let j = 0; j < uSteps; j++) {
      const first = i * (uSteps + 1) + j;
      const second = first + uSteps + 1;

      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices)
  };
}

function createTorus(u, v, majorRadius, minorRadius) {
  let vertices = [];
  let normals = [];
  let indices = [];

  for (let i = 0; i <= u; i++) {
    let uAngle = (i / u) * 2 * Math.PI;
    let cosU = Math.cos(uAngle);
    let sinU = Math.sin(uAngle);

    for (let j = 0; j <= v; j++) {
      let vAngle = (j / v) * 2 * Math.PI;
      let cosV = Math.cos(vAngle);
      let sinV = Math.sin(vAngle);

      let x = (majorRadius + minorRadius * cosV) * cosU;
      let y = minorRadius * sinV;
      let z = (majorRadius + minorRadius * cosV) * sinU;
      vertices.push(x, y, z);

      let nx = cosV * cosU;
      let ny = sinV;
      let nz = cosV * sinU;
      normals.push(nx, ny, nz);
    }
  }

  for (let i = 0; i < u; i++) {
    for (let j = 0; j < v; j++) {
      let first = i * (v + 1) + j;
      let second = (i + 1) * (v + 1) + j;

      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices)
  };
}

