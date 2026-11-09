import {
      PoseLandmarker,
      FilesetResolver,
      DrawingUtils
    } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

    // how accurate is the model (lite, full, heavy)
    const POSE_MODEL = "full";
    
    // basic 3d model body
    class Body {
      constructor(vs, is, ns) {
        this.vertices = vs;
        this.indices = is;
        this.normals = ns;
      }
    }

    // basic 3d body + colour, position, size, rotate, and shininess coefficient
    class AttributeBody extends Body {
      constructor(mesh, size, position, colour, shininess) {
        super(mesh.vertices, mesh.indices, mesh.normals);
        this.position = position;
        this.colour = colour;
        this.size = size;
        this.rotate = mat4Identity();
        this.shininess = shininess;
      }
      // get the matrix that transforms the body according to its attributes
      get transform() {
        const scale = new Float32Array([this.size[0], 0, 0, 0, 0, this.size[1], 0, 0, 0, 0, this.size[2], 0, 0, 0, 0, 1]);
        const translate = mat4Translate(mat4Identity(), this.position);
        return multiplyMat4(translate, multiplyMat4(this.rotate, scale));
      }
    }

    // complex object contains multiple attribute bodies
    class ComplexObject {
      constructor() {
        this.bodies = [];
        this.globalSpaceTransform = mat4Identity();
      }

      // adds an AttributeBody to the object
      push(obj) {
        this.bodies.push(obj);
      }
    }

    // node for the tree structure of heirarchical models
    class HeirarchicalModelNode {
      constructor(complexObj, transform) {
        this.body = complexObj;
        this.transform = transform;
        this.children = [];
      }
    }

    // setup WebGL
    const canvas = document.getElementById("glcanvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) alert("WebGL2 not supported");

    // creates the shader according to the source (text areas, but i might remove those later tbh since they're just kinda left over from the CS512 template code)
    function createShader(gl, type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
      }
      return shader;
    }

    // creates the full shader program from vertex and fragment
    function createProgram(gl, vsSource, fsSource) {
      const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
      const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(prog));
      }
      return prog;
    }

    // get shader controls
    const vertEditor = document.getElementById("vertEditor");
    const fragEditor = document.getElementById("fragEditor");
    vertEditor.value = document.getElementById("vertex-shader").textContent;
    fragEditor.value = document.getElementById("fragment-shader").textContent;

    // define shader program locations
    let program, posLoc, normLoc, colourLoc, lightPosLoc, light2PosLoc, timeLoc, facetLoc, shininessLoc, uMVM, uPM, uMTM;

    // assign all of our program locations
    function initShaderProgram() {
      try {
        program = createProgram(gl, vertEditor.value, fragEditor.value);
        gl.useProgram(program);
        posLoc = gl.getAttribLocation(program, "aPosition");
        normLoc = gl.getAttribLocation(program, "aNormal");
        colourLoc = gl.getUniformLocation(program, "uColour");
        lightPosLoc = gl.getUniformLocation(program, "uLightPos");
        light2PosLoc = gl.getUniformLocation(program, "uLightPos2");
        shininessLoc = gl.getUniformLocation(program, "shininess");
        timeLoc = gl.getUniformLocation(program, "uTime");
        facetLoc = gl.getUniformLocation(program, "isFaceted");
        uMVM = gl.getUniformLocation(program, "uModelViewMatrix");
        uPM = gl.getUniformLocation(program, "uProjectionMatrix");
        uMTM = gl.getUniformLocation(program, "uModelTransformationMatrix");
      } catch (e) { console.error(e); }
    }
    initShaderProgram();

    // update shader whenever we release a key in the text area
    vertEditor.onkeyup = initShaderProgram;
    fragEditor.onkeyup = initShaderProgram;

    // create buffers for each mesh
    const meshes = new Map();
    function getMesh(body) {
      let mesh = meshes.get(body.vertices);
      // if mesh doesn't exist in meshes, create it and add it
      if (!mesh) {
        mesh = { vbo: gl.createBuffer(), nbo: gl.createBuffer(), ibo: gl.createBuffer() };
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo); gl.bufferData(gl.ARRAY_BUFFER, body.vertices, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.nbo); gl.bufferData(gl.ARRAY_BUFFER, body.normals, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, body.indices, gl.STATIC_DRAW);
        meshes.set(body.vertices, mesh);
      }
      return mesh;
    }

    // robot construction
    const grey = [0.9, 0.9, 0.9];
    const shineCoeff = 3.0;
    const cube = createCube();
    const sphere = createUVSphere(24, 16, 1);

    // creates a node with given bodies
    function node(parent, location, ...bodies) {
      // construct the complex body out of the attribute bodies
      const cObj = new ComplexObject();
      bodies.forEach(body => cObj.push(body));
      cObj.globalSpaceTransform = mat4Translate(mat4Identity(), location);
      const n = new HeirarchicalModelNode(cObj, mat4Identity());
      if (parent) {
        parent.children.push(n);
      }
      return n;
    }

    const torso = node(null, [0, 0, 0],
      new AttributeBody(cube, [0.7, 1, 0.35], [0,0,0], grey, shineCoeff),
      new AttributeBody(cube, [0.85, 0.6, 0.4], [0,1,0], grey, shineCoeff)
    )

    function buildArm(side) { // 1 = left, -1 = right
      const shoulder = node(
        torso,
        [1.05 * side, 1.3, 0], // swap shoulder location based on side
        new AttributeBody(sphere, [0.4, 0.4, 0.4], [0,0,0], grey, shineCoeff)
      );

      const bicep = node(
        shoulder,
        [0, -0.8, 0],
        new AttributeBody(cube, [0.33, 0.6, 0.33], [0,0,0], grey, shineCoeff)
      );

      const elbow = node(
        bicep, 
        [0, -0.6, 0], 
        new AttributeBody(sphere, [0.4, 0.4, 0.4], [0,0,0], grey, shineCoeff)
      );
      
      // don't need to track forearm since it's a leaf
      node(
        elbow,
        [0, -0.8, 0],
        new AttributeBody(cube, [0.28, 0.7, 0.28], [0,0,0], grey, shineCoeff)
      );

      // only return shoulder and elbow since they're the only rotating pieces
      return {shoulder, elbow};
    }

    function buildLeg(side) { // 1 = left, -1 = right
      const hip = node(
        torso,
        [0.45 * side, -0.9, 0],
        new AttributeBody(sphere, [0.45, 0.45, 0.45], [0,0,0], grey, shineCoeff)
      );

      const thigh = node(
        hip,
        [0, -0.85, 0],
        new AttributeBody(cube, [0.4, 0.7, 0.4], [0,0,0], grey, shineCoeff)
      );
      
      const knee  = node(
        thigh,
        [0, -0.85, 0],
        new AttributeBody(sphere, [0.4, 0.4, 0.4], [0,0,0], grey, shineCoeff)
      );

      // don't need to track shin because it's a leaf
      node(
        knee,
        [0, -0.85, 0],
        new AttributeBody(cube, [0.35, 0.8, 0.35], [0,0,0], grey, shineCoeff)
      );

      // only return knee and hiip since they're the only rotating pieces
      return {hip, knee};
    }

    // build all body parts
    const leftArm = buildArm(1); 
    const rightArm = buildArm(-1);
    const leftLeg = buildLeg(1); 
    const rightLeg = buildLeg(-1);
    const neck = node(
      torso,
      [0, 1.5, 0],
      new AttributeBody(cube, [0.25, 0.25, 0.25], [0,0,0], grey, shineCoeff)
    );
    // don't need to track head since it's a leaf
    node(
      neck,
      [0, 1, 0],
      new AttributeBody(sphere, [0.8, 0.8, 0.8], [0,0,0], grey, shineCoeff)
    );

    // get all world space transforms
    function computeWorldTransforms(tree, parentTransform, out) {
      const local = multiplyMat4(tree.body.globalSpaceTransform, tree.transform);
      const world = multiplyMat4(parentTransform, local);
      out.push([tree.body, world]);
      tree.children.forEach(c => computeWorldTransforms(c, world, out));
      return out;
    }

    // setup camera controls
    let camX = 0, camY = 0, camZ = -15, rotX = 0, rotY = 0, mouseDown = false, lastX = 0, lastY = 0;
    canvas.addEventListener('mousedown', e => { mouseDown = true; lastX = e.clientX; lastY = e.clientY; });
    window.addEventListener('mouseup', () => mouseDown = false);
    window.addEventListener('mousemove', e => {
      if (!mouseDown) return;
      rotY += (e.clientX - lastX) * 0.01;
      rotX += (e.clientY - lastY) * 0.01;
      lastX = e.clientX; lastY = e.clientY;
    });
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'VIDEO') return;
      const step = 0.2;
      switch (e.key) {
        case 'ArrowUp': camY -= step; break;
        case 'ArrowDown': camY += step; break;
        case 'ArrowLeft': camX += step; break;
        case 'ArrowRight': camX -= step; break;
        case 'w': camZ += step; break;
        case 's': camZ -= step; break;
      }
    });

    // camera projection
    const proj = perspective(Math.PI / 4, canvas.width / canvas.height, 0.1, 100);

    // render all of the bodies
    function renderScene() {
      gl.enable(gl.DEPTH_TEST);
      gl.clearColor(1, 1, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (!program) return;

      const cx = Math.cos(rotY), sx = Math.sin(rotY);
      const cy = Math.cos(rotX), sy = Math.sin(rotX);
      const mRotX = [1, 0, 0, 0, 0, cy, sy, 0, 0, -sy, cy, 0, 0, 0, 0, 1];
      const mRotY = [cx, 0, -sx, 0, 0, 1, 0, 0, sx, 0, cx, 0, 0, 0, 0, 1];
      const rotation = multiplyMat4(mRotY, mRotX);

      gl.uniformMatrix4fv(uPM, false, proj);
      gl.uniformMatrix4fv(uMVM, false, mat4Translate(mat4Identity(), [camX, camY, camZ]));
      gl.uniform1f(timeLoc, performance.now() / 1000);
      gl.uniform1i(facetLoc, 0);
      gl.uniform3fv(lightPosLoc, [0, 0.1, 0]);
      gl.uniform3fv(light2PosLoc, [-1, -1, 1]);

      // get all the bodies plus their worldspace transforms in a list rather than a tree
      let b = computeWorldTransforms(torso, mat4Identity(), []); // terrible list name; truly cannot come up with a good one. best i can do is "bodiesAndWorldTransforms"
      
      // iterate over all objects
      for (const [cObj, tr] of b) {
        // iterate over each sub-body in each object
        for (const body of cObj.bodies) {
          // compute its movement matrix and send to shader program
          const mtm = multiplyMat4(rotation, multiplyMat4(tr, body.transform));
          gl.uniformMatrix4fv(uMTM, false, mtm);
          gl.uniform1f(shininessLoc, body.shininess);
          gl.uniform3fv(colourLoc, body.colour);

          // get mesh and send its vertices to the shader program to be drawn
          const mesh = getMesh(body);
          gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
          gl.enableVertexAttribArray(posLoc);
          gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
          gl.bindBuffer(gl.ARRAY_BUFFER, mesh.nbo);
          gl.enableVertexAttribArray(normLoc);
          gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ibo);
          gl.drawElements(gl.TRIANGLES, body.indices.length, gl.UNSIGNED_SHORT, 0);
        }
      }
    }
    
    // define the render loop of rendering and requesting a frame
    function renderLoop() {
      renderScene();
      requestAnimationFrame(renderLoop);
    };
    renderLoop();

    // vector functions
    function vectorSubtract(a, b) {
      return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    }

    function vectorAverage(a, b) {
      return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    }

    function dot(a, b) {
      return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }

    function cross(a, b) {
      return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    }

    function normalize(a) {
      const l = Math.hypot(a[0], a[1], a[2]);
      return l < 1e-8 ? [0, -1, 0] : [a[0] / l, a[1] / l, a[2] / l];
    }

    // build a rotation matrix from three orthonormal basis vectors.
    function rotation(x, y, z) {
      return new Float32Array([...x, 0, ...y, 0, ...z, 0, 0, 0, 0, 1]);
    }

    // find a vector's absolute position relative to a local rotated position
    function rotInv(m, d) {
      return [
        m[0] * d[0] + m[1] * d[1] + m[2] * d[2],
        m[4] * d[0] + m[5] * d[1] + m[6] * d[2],
        m[8] * d[0] + m[9] * d[1] + m[10] * d[2]
      ];
    }

    // find the shortest rotation from direction a to direction b (rodrigues rotation formula)
    function shortestArc(a, b) {
      const c = dot(a, b);
      if (c < -0.9999) { // it doesn't matter; rotate 180 degrees
        const u = normalize(Math.abs(a[0]) < 0.9 ? cross(a, [1, 0, 0]) : cross(a, [0, 1, 0]));
        const [x, y, z] = u;
        return new Float32Array([
          2 * x * x - 1, 2 * x * y, 2 * x * z, 0,
          2 * x * y, 2 * y * y - 1, 2 * y * z, 0,
          2 * x * z, 2 * y * z, 2 * z * z - 1, 0,
          0, 0, 0, 1]);
      }
      const [x, y, z] = cross(a, b);
      const k = 1 / (1 + c);
      return new Float32Array([
        1 - k * (y * y + z * z), z + k * x * y, -y + k * x * z, 0,
        -z + k * x * y, 1 - k * (x * x + z * z), x + k * y * z, 0,
        y + k * x * z, -x + k * y * z, 1 - k * (x * x + y * y), 0,
        0, 0, 0, 1]);
    }

    // get our mediapipe controls
    const smoothingSlider = document.getElementById("smoothing");
    const rotTorsoControl = document.getElementById("rotTorso");
    const mirrorControl = document.getElementById("mirror"); // mirroring for help LEARNING dances! :D
    const invertDepthControl = document.getElementById("invertDepth");

    /*
    MediaPipe node indices that we actually care about
    7/8   - ears
    11/12 - shoulders
    13/14 - elbows
    15/16 - wrists
    23/24 - hips
    25/26 - knees
    27/28 - ankles
    */
    const TRACKED_NODES = [7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
    // smoothed positions
    let smooth = {};

    function getNodeInfo(world) {
      // get info from controls
      const alpha = 1 - Number(smoothingSlider.value);
      const xMirror = mirrorControl.checked ? -1 : 1;
      const zMirror = invertDepthControl.checked ? 1 : -1;

      // iterate through tracked nodes
      for (const i of TRACKED_NODES) {
        // swap which nodes are left and which are right based on mirrored
        const src = mirrorControl.checked ? (i % 2 ? i + 1 : i - 1) : i;
        const worldPos = world[src];

        // prevent jitter from uncertainty (0.4 threshold)
        if (!worldPos || (worldPos.visibility !== undefined && worldPos.visibility < 0.4)) continue; 

        // compute movement via exponential moving average dictated by smoothing slider
        const currentPos = [xMirror * worldPos.x, -worldPos.y, zMirror * worldPos.z];
        const previousPos = smooth[i];
        smooth[i] = previousPos
          ? [previousPos[0] + (currentPos[0] - previousPos[0]) * alpha, previousPos[1] + (currentPos[1] - previousPos[1]) * alpha, previousPos[2] + (currentPos[2] - previousPos[2]) * alpha]
          : currentPos;
      }
    }

    // define direction constants
    const DOWN = [0, -1, 0];
    const UP = [0, 1, 0];

    // figure out how much the joint needs to move from its default direction
    function aim(jointNode, parentRot, worldDir, restDir) {
      const local = rotInv(parentRot, worldDir);
      const rotation = shortestArc(restDir, local);
      jointNode.transform = rotation;
      return multiplyMat4(parentRot, rotation);
    }

    // apply pose to the model
    function applyPose() {
      // check if the smooth array contains all necessary information
      function has(...ids) {
        return ids.every(i => smooth[i]);
      }

      // compute torso rotation from shoulder and hip positions
      let torsoRot = mat4Identity();
      if (rotTorsoControl.checked && has(11, 12, 23, 24)) {
        // direction of average hip position to average shoulder position (spine pointing up)
        let up = normalize(vectorSubtract(vectorAverage(smooth[11], smooth[12]), vectorAverage(smooth[23], smooth[24])));

        // get the side to side axis from the vector from the right to the left shoulder
        let left = normalize(vectorSubtract(smooth[11], smooth[12]));
        
        // get the forward facing axis from the cross product of the up and side to side vectors
        let forward = normalize(cross(left, up));

        // recompute left with up and forward to guarantee orthagonal basis
        left = cross(up, forward);

        // generate change of basis matrix according to those directions
        torsoRot = rotation(left, up, forward);
      }

      // rotate the torso according to that change of basis matrix
      torso.transform = torsoRot;

      // shIdx = Shoulder / Hip
      // ekIdx = Elbow    / Knee
      // wfIdx = Wrist    / Foot
      const limb = (shIdx, ekIdx, wfIdx, joint1, joint2) => {
        if (!has(shIdx, ekIdx)) {
          return;
        }
        const r1 = aim(
          joint1,                                                       // aim joint 1 (either the shoulder or the hip)
          torsoRot,                                                     // with the torso's rotation as its reference point
          normalize(vectorSubtract(smooth[ekIdx], smooth[shIdx])),      // toward the direction from the shoulder (or hip) to the elbow (or knee)
          DOWN                                                          // with down as its resting position
        );
        if (has(wfIdx)) {
          aim(
            joint2,                                                     // aim joint 2 (either the elbow or knee)
            r1,                                                         // with r1 as its parent rotation (the bicep aim direction)
            normalize(vectorSubtract(smooth[wfIdx], smooth[ekIdx])),    // to the direction from the elbow (or knee) to the wrist (or foot)
            DOWN                                                        // with down as its resting position
          );
        }
      };
      
      // rotate all our limbs according to the positions from mediapipe
      limb(11, 13, 15, leftArm.shoulder, leftArm.elbow);
      limb(12, 14, 16, rightArm.shoulder, rightArm.elbow);
      limb(23, 25, 27, leftLeg.hip, leftLeg.knee);
      limb(24, 26, 28, rightLeg.hip, rightLeg.knee);

      // aim head only if head points exist.
      if (has(7, 8, 11, 12)) {
        aim(
          neck,                                                         // aim neck joint
          torsoRot,                                                     // with the torso's rotation as its reference point
          normalize(vectorSubtract(vectorAverage(smooth[7], smooth[8]), 
          vectorAverage(smooth[11], smooth[12]))),                      // toward the direction from the average shoulder point to the average ear point 
          UP                                                            // with up as its resting position
        );
      }
    }

    // gete video and mediapipe canvas elements from HTML
    const danceSelect = document.getElementById("danceSelect");
    const video = document.getElementById("video");
    const overlay = document.getElementById("overlay");
    const overlayCtx = overlay.getContext("2d");
    const statusText = document.getElementById("status");
    const fileInput = document.getElementById("videoFile");
    const drawingUtils = new DrawingUtils(overlayCtx);

    // setup mediapipe variable
    let poseLandmarker = null;
    let lastVideoTime = -1;
    let lastTimeStamp = 0;
    let currentURL = null;

    // initialize mediapipe
    async function initMediaPipe() {
      const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
      const make = delegate => PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_${POSE_MODEL}/float16/1/pose_landmarker_${POSE_MODEL}.task`,
          delegate
        },
        runningMode: "VIDEO",
        numPoses: 1
      });
      try {
        // try to use the GPU for the landmarker
        poseLandmarker = await make("GPU");
      }
      catch (e) {
        // fall back to CPU if GPU doesn't work
        console.warn("GPU delegate failed, using CPU", e);
        poseLandmarker = await make("CPU");
      }
      statusText.textContent = "Pose model ready. Choose an .mp4 to begin.";
    }

    function detect() {
      if (!poseLandmarker || video.readyState < 2) return;
      const timeStamp = Math.max(performance.now(), lastTimeStamp + 1);
      lastTimeStamp = timeStamp;
      const poseOut = poseLandmarker.detectForVideo(video, timeStamp);

      overlayCtx.drawImage(video, 0, 0, overlay.width, overlay.height);
      if (poseOut.landmarks && poseOut.landmarks.length > 0) {
        drawingUtils.drawConnectors(poseOut.landmarks[0], PoseLandmarker.POSE_CONNECTIONS, { color: "#00FF00", lineWidth: 3 });
        drawingUtils.drawLandmarks(poseOut.landmarks[0], { color: "#FF0000", lineWidth: 1, radius: 3 });
        if (poseOut.worldLandmarks && poseOut.worldLandmarks.length > 0) {
          getNodeInfo(poseOut.worldLandmarks[0]);
          applyPose();
        }
      }
    }

    function videoLoop() {
      if (!video.paused && !video.ended && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        detect();
      }
      requestAnimationFrame(videoLoop);
    }
    videoLoop();

    video.addEventListener("seeked", () => { lastVideoTime = video.currentTime; detect(); });

    video.addEventListener("loadedmetadata", () => {
      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;
      smooth = {};
    });

    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) return;
      if (currentURL) URL.revokeObjectURL(currentURL);
      currentURL = URL.createObjectURL(file);
      video.src = currentURL;
      statusText.textContent = poseLandmarker ? `Tracking: ${file.name}` : "Video loaded, waiting for pose model…";
      video.play().catch(() => { statusText.textContent = "Press play on the video to start."; });
    });

    // Handle Dropdown selection for preset dances in ./savedDances/
    danceSelect.addEventListener("change", () => {
      const selectedUrl = danceSelect.value;
      if (!selectedUrl) return;

      // Clear local file input selection
      fileInput.value = "";

      if (currentURL) {
        URL.revokeObjectURL(currentURL);
        currentURL = null;
      }

      video.src = selectedUrl;
      const selectedName = danceSelect.options[danceSelect.selectedIndex].text;
      statusText.textContent = poseLandmarker ? `Tracking: ${selectedName}` : "Video loaded, waiting for pose model…";
      video.play().catch(() => { statusText.textContent = "Press play on the video to start."; });
    });

    initMediaPipe().catch(e => { console.error(e); statusText.textContent = "Failed to load pose model (see console)."; });