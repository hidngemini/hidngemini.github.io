function createCube() {
  const positions = new Float32Array([
    -1, -1,  1,   1, -1,  1,   1,  1,  1,  -1,  1,  1,   // front
     1, -1, -1,  -1, -1, -1,  -1,  1, -1,   1,  1, -1,   // back
    -1,  1,  1,   1,  1,  1,   1,  1, -1,  -1,  1, -1,   // top
    -1, -1, -1,   1, -1, -1,   1, -1,  1,  -1, -1,  1,   // bottom
     1, -1,  1,   1, -1, -1,   1,  1, -1,   1,  1,  1,   // right
    -1, -1, -1,  -1, -1,  1,  -1,  1,  1,  -1,  1, -1    // left
  ]);
  const faceNormals = [[0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0]];
  const normals = new Float32Array(faceNormals.flatMap(n => [...n, ...n, ...n, ...n]));

  // Tangent; bitangent = cross(N, T)
  const faceTangents = [[1, 0, 0], [-1, 0, 0], [1, 0, 0], [1, 0, 0], [0, 0, -1], [0, 0, 1]];
  const tangents = new Float32Array(faceTangents.flatMap(t => [...t, ...t, ...t, ...t]));

  const texCoords = new Float32Array(faceNormals.flatMap(() => [0, 0, 1, 0, 1, 1, 0, 1]));

  const indices = new Uint16Array([
     0,  1,  2,   0,  2,  3,   // front
     4,  5,  6,   4,  6,  7,   // back
     8,  9, 10,   8, 10, 11,   // top
    12, 13, 14,  12, 14, 15,   // bottom
    16, 17, 18,  16, 18, 19,   // right
    20, 21, 22,  20, 22, 23    // left
  ]);
  return { positions, normals, tangents, texCoords, indices };
}


function createCylinder(segments = 64, uRepeat = 3) {
  const positions = [], normals = [], tangents = [], texCoords = [], indices = [];

  // Side: theta grows with u, so T points along the circle and B = cross(N, T) points up
  for (let i = 0; i <= segments; i++) {
    const u = i / segments, theta = 2 * Math.PI * u;
    const s = Math.sin(theta), c = Math.cos(theta);
    for (const y of [-1, 1]) {
      positions.push(s, y, c);
      normals.push(s, 0, c);
      tangents.push(c, 0, -s);
      texCoords.push(u * uRepeat, (y + 1) / 2);
    }
  }
  for (let i = 0; i < segments; i++) {
    const k = 2 * i;
    indices.push(k, k + 2, k + 3, k, k + 3, k + 1);
  }

  // Caps: planar mapping of x, z into the texture, T = +x on both
  for (const y of [1, -1]) {
    const center = positions.length / 3;
    positions.push(0, y, 0);
    normals.push(0, y, 0);
    tangents.push(1, 0, 0);
    texCoords.push(0.5, 0.5);
    for (let i = 0; i <= segments; i++) {
      const theta = 2 * Math.PI * i / segments;
      const s = Math.sin(theta), c = Math.cos(theta);
      positions.push(s, y, c);
      normals.push(0, y, 0);
      tangents.push(1, 0, 0);
      texCoords.push(0.5 + 0.5 * s, 0.5 - 0.5 * y * c);  // keeps cross(N, T) along +v
    }
    for (let i = 0; i < segments; i++) {
      const a = center + 1 + i, b = a + 1;
      if (y > 0) indices.push(center, a, b);
      else indices.push(center, b, a);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    tangents: new Float32Array(tangents),
    texCoords: new Float32Array(texCoords),
    indices: new Uint16Array(indices)
  };
}

function createUVSphere(uSteps = 32, vSteps = 16, r = 1) {
  const positions = [];
  const normals = [];
  const tangents = [];
  const texCoords = [];
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

      positions.push(x, y, z);

      const length = Math.hypot(x, y, z);
      const nx = length > 0 ? x / length : 0;
      const ny = length > 0 ? y / length : 1;
      const nz = length > 0 ? z / length : 0;
      normals.push(nx, ny, nz);

      tangents.push(-sinu, 0, cosu);

      const s = j / uSteps;
      const t = i / vSteps;
      texCoords.push(s, t);
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
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    tangents: new Float32Array(tangents),
    texCoords: new Float32Array(texCoords),
    indices: new Uint16Array(indices)
  };
}

function createTorus(majorRadius = 1, minorRadius = 0.4, uSegments = 32, vSegments = 16, uRepeat = 4) {
  const positions = [];
  const normals = [];
  const tangents = [];
  const texCoords = [];
  const indices = [];

  for (let i = 0; i <= uSegments; i++) {
    const u = i / uSegments;
    const uAngle = u * 2 * Math.PI;
    const cosU = Math.cos(uAngle);
    const sinU = Math.sin(uAngle);

    for (let j = 0; j <= vSegments; j++) {
      const v = j / vSegments;
      const vAngle = v * 2 * Math.PI;
      const cosV = Math.cos(vAngle);
      const sinV = Math.sin(vAngle);

      // Vertex position
      const x = (majorRadius + minorRadius * cosV) * cosU;
      const y = minorRadius * sinV;
      const z = (majorRadius + minorRadius * cosV) * sinU;
      positions.push(x, y, z);

      // Normal vector (pointing outward from the tube center)
      const nx = cosV * cosU;
      const ny = sinV;
      const nz = cosV * sinU;
      normals.push(nx, ny, nz);

      // Tangent vector (pointing along the major circle, derivative with respect to u)
      const tx = -sinU;
      const ty = 0;
      const tz = cosU;
      const tLen = Math.hypot(tx, ty, tz);
      tangents.push(tx / tLen, ty / tLen, tz / tLen);

      // Texture coordinates mapped with optional wrapping repeat
      texCoords.push(u * uRepeat, v);
    }
  }

  for (let i = 0; i < uSegments; i++) {
    for (let j = 0; j < vSegments; j++) {
      const first = i * (vSegments + 1) + j;
      const second = (i + 1) * (vSegments + 1) + j;

      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    tangents: new Float32Array(tangents),
    texCoords: new Float32Array(texCoords),
    indices: new Uint16Array(indices)
  };
}