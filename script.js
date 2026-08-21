document.addEventListener('DOMContentLoaded', () => {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwP2tSFXzqooASgXiht5tMMUfMKhyoWXf-JxxAjSrtoG8-CpXKS1JQrsDLm6q-lo8DxmQ/exec";

    let sessionId = localStorage.getItem("lumina_session_id");
    if (!sessionId) {
        sessionId = "user_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
        localStorage.setItem("lumina_session_id", sessionId);
    }

    function sendActivityData(actionType, nickname = "") {
        const payload = { action: actionType, nickname: nickname, sessionId: sessionId };
        fetch(SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        }).catch(err => console.error("API error:", err));
    }

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');

    if (localStorage.getItem('lumina_theme') === 'light') {
        document.body.classList.add('light-mode');
        themeIcon.textContent = '🌙';
    } else {
        themeIcon.textContent = '☀️';
    }

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        if (document.body.classList.contains('light-mode')) {
            themeIcon.textContent = '🌙';
            localStorage.setItem('lumina_theme', 'light');
        } else {
            themeIcon.textContent = '☀️';
            localStorage.setItem('lumina_theme', 'dark');
        }
    });

    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarClose = document.getElementById('sidebarClose');
    const sidebar = document.getElementById('sidebar');
    const mainArea = document.getElementById('mainArea');
    const btnHelp = document.getElementById('btn-help');

    function toggleSidebar() {
        sidebar.classList.toggle('collapsed');
        mainArea.classList.toggle('expanded');
        sidebarToggle.classList.toggle('hidden');
    }

    sidebarToggle.addEventListener('click', toggleSidebar);
    sidebarClose.addEventListener('click', toggleSidebar);

    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    const contentSections = document.querySelectorAll('.content-section');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(nav => nav.classList.remove('active'));
            contentSections.forEach(sec => sec.classList.remove('active'));

            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            if (targetId === 'section-simulator') {
                btnHelp.style.display = 'block';
            } else {
                btnHelp.style.display = 'none';
            }
        });
    });

    const lightTabs = document.querySelectorAll('.light-tab-btn');
    const lightCards = document.querySelectorAll('.light-panel-body .light-card');

    lightTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            lightTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const targetIndex = tab.getAttribute('data-light-tab');
            lightCards.forEach(card => {
                if (card.getAttribute('data-index') === targetIndex) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    const previewPanel = document.getElementById('preview-panel');
    const cameraPreviewPanel = document.getElementById('camera-preview-panel');
    const studioPanel = document.getElementById('studio');
    const scene = new THREE.Scene();
    
    const cameraCenter = new THREE.PerspectiveCamera(39.6, 1, 0.1, 100);
    cameraCenter.position.set(0, 1.5, 5);
    cameraCenter.layers.enable(1); 

    const rendererCenter = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    rendererCenter.shadowMap.enabled = true;
    rendererCenter.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererCenter.toneMapping = THREE.ACESFilmicToneMapping;
    rendererCenter.toneMappingExposure = 1.0; 
    previewPanel.appendChild(rendererCenter.domElement);

    const cameraRight = new THREE.PerspectiveCamera(39.6, 1, 0.1, 100);
    cameraRight.position.set(0, 1.5, 5);

    const rendererRight = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    rendererRight.shadowMap.enabled = true;
    rendererRight.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRight.toneMapping = THREE.ACESFilmicToneMapping;
    rendererRight.toneMappingExposure = 1.0; 
    cameraPreviewPanel.appendChild(rendererRight.domElement);

    const composerRight = new THREE.EffectComposer(rendererRight);
    const renderPassRight = new THREE.RenderPass(scene, cameraRight);
    composerRight.addPass(renderPassRight);

    const bokehPass = new THREE.BokehPass(scene, cameraRight, {
        focus: 5.0,        
        aperture: 0.0089,  
        maxblur: 0.03,     
        width: cameraPreviewPanel.clientWidth || 100,
        height: cameraPreviewPanel.clientHeight || 100
    });
    composerRight.addPass(bokehPass);

    let renderRequested = false;
    function requestRenderIfNotRequested() {
        if (!renderRequested) {
            renderRequested = true;
            requestAnimationFrame(renderScene);
        }
    }

    function renderScene() {
        renderRequested = false;
        if (subjectGroup) {
            cameraCenter.lookAt(subjectGroup.position.x, currentFocusY, subjectGroup.position.z);
            cameraRight.lookAt(subjectGroup.position.x, currentFocusY, subjectGroup.position.z);
            
            const focusTarget = new THREE.Vector3(subjectGroup.position.x, currentFocusY, subjectGroup.position.z);
            const dist = cameraRight.position.distanceTo(focusTarget);
            bokehPass.uniforms["focus"].value = dist;
        }
        rendererCenter.render(scene, cameraCenter);
        composerRight.render(); 
    }

    const ROOM_WIDTH = 10; 
    let ROOM_DEPTH = 10;
    
    function updateRoomSize() {
        const cw = studioPanel.clientWidth || 100;
        const ch = studioPanel.clientHeight || 100;
        const aspect = ch / cw;
        ROOM_DEPTH = ROOM_WIDTH * aspect;
        if (isNaN(ROOM_DEPTH) || ROOM_DEPTH === 0) ROOM_DEPTH = 10;
    }
    updateRoomSize();

    const floorGeo = new THREE.PlaneGeometry(1, 1);
    const floorMat = new THREE.MeshStandardMaterial({ color: document.getElementById('floorColor').value, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const backWallGeo = new THREE.PlaneGeometry(1, 1);
    const backWallMat = new THREE.MeshStandardMaterial({ color: document.getElementById('bgColor').value, roughness: 1.0 });
    const backWall = new THREE.Mesh(backWallGeo, backWallMat);
    backWall.receiveShadow = true;
    scene.add(backWall);

    function applyRoomScale() {
        floor.scale.set(ROOM_WIDTH, ROOM_DEPTH, 1);
        backWall.scale.set(ROOM_WIDTH, 10, 1); 
        backWall.position.set(0, 5, -ROOM_DEPTH / 2);
    }
    applyRoomScale();
    scene.background = new THREE.Color(document.getElementById('bgColor').value);

    let exposureMultiplier = 1.0;
    const baseAmbientIntensity = 0.5;
    let ambientLight = new THREE.AmbientLight(0x222222, baseAmbientIntensity);
    scene.add(ambientLight);

    const camMode = document.getElementById('camMode');
    const camF = document.getElementById('camF');
    const camSS = document.getElementById('camSS');
    const camISO = document.getElementById('camISO');

    const fValues = [1.2, 1.4, 1.8, 2.0, 2.8, 4.0, 5.6, 8.0, 11, 16, 22];
    const ssValues = [15, 30, 60, 125, 250, 500, 1000, 2000, 4000, 8000];

    function getClosest(arr, target) {
        return arr.reduce((prev, curr) => Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev);
    }

    function updateCameraExposure() {
        const mode = camMode.value;
        let f = parseFloat(camF.value);
        let ss = parseFloat(camSS.value); 
        let iso = parseFloat(camISO.value);

        const baseF = 5.6;
        const baseSS = 125;
        const baseISO = 400;

        camF.disabled = (mode === 'P' || mode === 'Tv');
        camSS.disabled = (mode === 'P' || mode === 'Av');

        if (mode === 'Av') {
            let targetSS = baseSS * (iso / baseISO) * (Math.pow(baseF, 2) / Math.pow(f, 2));
            ss = getClosest(ssValues, targetSS);
            camSS.value = ss;
        } 
        else if (mode === 'Tv') {
            let targetF = Math.sqrt(Math.pow(baseF, 2) * (iso / baseISO) * (baseSS / ss));
            f = getClosest(fValues, targetF);
            camF.value = f;
        } 
        else if (mode === 'P') {
            f = 5.6;
            let targetSS = baseSS * (iso / baseISO) * (Math.pow(baseF, 2) / Math.pow(f, 2));
            ss = getClosest(ssValues, targetSS);
            
            if (targetSS > 8000) {
                ss = 8000;
                let targetF = Math.sqrt(Math.pow(baseF, 2) * (iso / baseISO) * (baseSS / ss));
                f = getClosest(fValues, targetF);
            } else if (targetSS < 15) {
                ss = 15;
                let targetF = Math.sqrt(Math.pow(baseF, 2) * (iso / baseISO) * (baseSS / ss));
                f = getClosest(fValues, targetF);
            }
            camF.value = f;
            camSS.value = ss;
        }

        const apertureValue = 0.035 / f; 
        const maxBlurValue = Math.max(0.0001, 0.05 * (2.0 / f));
        
        bokehPass.uniforms["aperture"].value = apertureValue;
        bokehPass.uniforms["maxblur"].value = maxBlurValue;

        const noiseLevel = Math.pow((iso / 25600), 0.6); 
        const noiseOverlayRight = document.getElementById('noise-overlay-right');
        if (noiseOverlayRight) {
            noiseOverlayRight.style.opacity = noiseLevel * 0.8; 
        }

        exposureMultiplier = (iso / baseISO) * (baseSS / ss) * (Math.pow(baseF, 2) / Math.pow(f, 2));
        rendererRight.toneMappingExposure = exposureMultiplier;
        
        updateAllLights();
        requestRenderIfNotRequested();
    }
    
    [camMode, camF, camSS, camISO].forEach(el => el.addEventListener('change', updateCameraExposure));

    const camFocal = document.getElementById('camFocal');
    const valCamFocal = document.getElementById('val-cam-focal');

    function updateCameraFocalLength() {
        const focalLength = parseFloat(camFocal.value);
        valCamFocal.textContent = `${focalLength} mm`;
        const sensorHeight = 24; 
        const fov = 2 * Math.atan(sensorHeight / (2 * focalLength)) * (180 / Math.PI);
        
        cameraRight.fov = fov;
        cameraRight.updateProjectionMatrix(); 
        requestRenderIfNotRequested();
    }
    camFocal.addEventListener('input', updateCameraFocalLength);

    const camWB = document.getElementById('camWB');
    const valCamWB = document.getElementById('val-cam-wb');
    const wbOverlayRight = document.getElementById('wb-overlay-right');
    let currentWbTintColor = 'rgba(0,0,0,0)'; 

    function updateCameraWB() {
        const wb = parseFloat(camWB.value);
        valCamWB.textContent = `${wb}K`;

        if (wb < 5500) {
            const opacity = ((5500 - wb) / 3000) * 0.35; 
            currentWbTintColor = `rgba(0, 80, 255, ${opacity})`;
        } else if (wb > 5500) {
            const opacity = ((wb - 5500) / 4500) * 0.35; 
            currentWbTintColor = `rgba(255, 120, 0, ${opacity})`;
        } else {
            currentWbTintColor = `rgba(0,0,0,0)`;
        }
        
        if (wbOverlayRight) wbOverlayRight.style.backgroundColor = currentWbTintColor;
    }
    camWB.addEventListener('input', updateCameraWB);

    let subjectGroup = new THREE.Group();
    scene.add(subjectGroup);
    let currentFocusY = 0.9; 
    const subject2DUI = document.getElementById('subject');

    function enableLightingAndShadows(meshGroup) {
        meshGroup.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.geometry) {
                    child.geometry.computeVertexNormals();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            mat.roughness = Math.max(0.4, mat.roughness || 0.5);
                            mat.metalness = Math.min(0.2, mat.metalness || 0.1);
                            mat.needsUpdate = true;
                        });
                    } else {
                        child.material.roughness = Math.max(0.4, child.material.roughness || 0.5);
                        child.material.metalness = Math.min(0.2, child.material.metalness || 0.1);
                        child.material.needsUpdate = true;
                    }
                }
            }
        });
    }

    function createModel(type) {
        while(subjectGroup.children.length > 0) {
            const child = subjectGroup.children[0];
            child.traverse((obj) => {
                if (obj.isMesh) {
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) {
                        if (Array.isArray(obj.material)) {
                            obj.material.forEach(mat => mat.dispose());
                        } else {
                            obj.material.dispose();
                        }
                    }
                }
            });
            subjectGroup.remove(child); 
        }

        let newModelGroup = new THREE.Group();

        if (type === 'dog') {
            const orangeMat = new THREE.MeshStandardMaterial({ color: 0xe87a1e, roughness: 0.6, flatShading: true });
            const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, flatShading: true });
            const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, flatShading: true });

            const hip = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.5), orangeMat);
            hip.position.set(0, 0.2, -0.2); newModelGroup.add(hip);

            const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.38), orangeMat);
            body.position.set(0, 0.45, -0.05); newModelGroup.add(body);

            const chest = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.48, 0.2), whiteMat);
            chest.position.set(0, 0.45, 0.11); newModelGroup.add(chest);

            const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), orangeMat);
            head.position.set(0, 0.8, 0.15); newModelGroup.add(head);

            const blaze = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.46, 0.46), whiteMat);
            blaze.position.set(0, 0.8, 0.14); newModelGroup.add(blaze);

            const snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.35), whiteMat);
            snout.position.set(0, 0.67, 0.38); newModelGroup.add(snout);

            const nose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.1), blackMat);
            nose.position.set(0, 0.73, 0.64); newModelGroup.add(nose);

            const earGeo = new THREE.ConeGeometry(0.18, 0.5, 4);
            const leftEar = new THREE.Mesh(earGeo, whiteMat);
            leftEar.position.set(-0.25, 1.15, 0.05); leftEar.rotation.z = -Math.PI / 10; newModelGroup.add(leftEar);

            const rightEar = new THREE.Mesh(earGeo, whiteMat);
            rightEar.position.set(0.25, 1.15, 0.05); rightEar.rotation.z = Math.PI / 10; newModelGroup.add(rightEar);

            const frontLegGeo = new THREE.BoxGeometry(0.14, 0.35, 0.14);
            const leftFrontLeg = new THREE.Mesh(frontLegGeo, whiteMat);
            leftFrontLeg.position.set(-0.16, 0.175, 0.22); newModelGroup.add(leftFrontLeg);

            const rightFrontLeg = new THREE.Mesh(frontLegGeo, whiteMat);
            rightFrontLeg.position.set(0.16, 0.175, 0.22); newModelGroup.add(rightFrontLeg);

            const hindPawGeo = new THREE.BoxGeometry(0.15, 0.15, 0.3);
            const leftHindPaw = new THREE.Mesh(hindPawGeo, whiteMat);
            leftHindPaw.position.set(-0.26, 0.075, -0.2); newModelGroup.add(leftHindPaw);

            const rightHindPaw = new THREE.Mesh(hindPawGeo, whiteMat);
            rightHindPaw.position.set(0.26, 0.075, -0.2); newModelGroup.add(rightHindPaw);

            currentFocusY = 0.8;
            subject2DUI.innerHTML = `<div class="cute-avatar" style="width:45px; height:45px; background-color:#e87a1e; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:22px; box-shadow:0 4px 10px rgba(0,0,0,0.3); border:2px solid #fff;">🦊</div>`;
        }
        else if (type === 'cat') {
            const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf49f1c, roughness: 0.6, flatShading: true });
            const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, flatShading: true });
            const pinkMat = new THREE.MeshStandardMaterial({ color: 0xffb5a7, roughness: 0.4, flatShading: true });

            const hip = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.45), orangeMat);
            hip.position.set(0, 0.18, -0.15); newModelGroup.add(hip);

            const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.45, 0.38), orangeMat);
            body.position.set(0, 0.4, -0.05); newModelGroup.add(body);

            const chest = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.18), whiteMat);
            chest.position.set(0, 0.4, 0.11); newModelGroup.add(chest);

            const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.38), orangeMat);
            head.position.set(0, 0.72, 0.12); newModelGroup.add(head);

            const faceWhite = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.22), whiteMat);
            faceWhite.position.set(0, 0.62, 0.24); newModelGroup.add(faceWhite);

            const nose = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.04), pinkMat);
            nose.position.set(0, 0.58, 0.36); newModelGroup.add(nose);

            const leftEar = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 3), orangeMat);
            leftEar.position.set(-0.15, 0.98, 0.12); leftEar.rotation.z = -Math.PI / 12; newModelGroup.add(leftEar);

            const rightEar = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 3), orangeMat);
            rightEar.position.set(0.15, 0.98, 0.12); rightEar.rotation.z = Math.PI / 12; newModelGroup.add(rightEar);

            const legGeo = new THREE.BoxGeometry(0.12, 0.38, 0.12);
            const leftLeg = new THREE.Mesh(legGeo, whiteMat);
            leftLeg.position.set(-0.13, 0.19, 0.18); newModelGroup.add(leftLeg);

            const rightLeg = new THREE.Mesh(legGeo, whiteMat);
            rightLeg.position.set(0.13, 0.19, 0.18); newModelGroup.add(rightLeg);

            const hindPawGeo = new THREE.BoxGeometry(0.14, 0.14, 0.25);
            const leftHindPaw = new THREE.Mesh(hindPawGeo, whiteMat);
            leftHindPaw.position.set(-0.24, 0.07, -0.15); newModelGroup.add(leftHindPaw);

            const rightHindPaw = new THREE.Mesh(hindPawGeo, whiteMat);
            rightHindPaw.position.set(0.24, 0.07, -0.15); newModelGroup.add(rightHindPaw);

            const tailGeo = new THREE.BoxGeometry(0.1, 0.1, 0.55);
            const tail = new THREE.Mesh(tailGeo, orangeMat);
            tail.position.set(0.2, 0.08, -0.25); tail.rotation.y = Math.PI / 4; newModelGroup.add(tail);

            currentFocusY = 0.72;
            subject2DUI.innerHTML = `<div class="cute-avatar" style="width:45px; height:45px; background-color:#f49f1c; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:22px; box-shadow:0 4px 10px rgba(0,0,0,0.3); border:2px solid #fff;">🐱</div>`;
        }
        else if (type === 'tree') {
            const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 1 }); 
            const leafMat = new THREE.MeshStandardMaterial({ color: 0x4CAF50, roughness: 0.9 });
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.2, 16), trunkMat); trunk.position.y = 0.6; newModelGroup.add(trunk);
            const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), leafMat); leaves.position.y = 1.6; newModelGroup.add(leaves);
            
            currentFocusY = 1.4;
            subject2DUI.innerHTML = `<div class="tree-leaves"></div><div class="tree-trunk"></div>`;
        } else if (type === 'box') {
            const boxMat = new THREE.MeshStandardMaterial({ color: 0xFFB74D, roughness: 0.7 });
            const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), boxMat); box.position.y = 0.5; newModelGroup.add(box);
            currentFocusY = 0.5;
            subject2DUI.innerHTML = `<div class="box-shape"></div>`;
        } else if (type === 'sphere') {
            const sphereMat = new THREE.MeshStandardMaterial({ color: 0x64B5F6, roughness: 0.2, metalness: 0.3 });
            const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 32), sphereMat); sphere.position.y = 0.6; newModelGroup.add(sphere);
            currentFocusY = 0.6;
            subject2DUI.innerHTML = `<div class="sphere-shape"></div>`;
        } else if (type === 'car') {
            const carMat = new THREE.MeshStandardMaterial({ color: 0xef5350, roughness: 0.5 }); 
            const tireMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
            const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.8), carMat); base.position.y = 0.3; newModelGroup.add(base);
            const top = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.7), carMat); top.position.y = 0.7; newModelGroup.add(top);
            const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16); wheelGeo.rotateX(Math.PI / 2);
            [[-0.5, 0.2, 0.45], [0.5, 0.2, 0.45], [-0.5, 0.2, -0.45], [0.5, 0.2, -0.45]].forEach(pos => {
                const w = new THREE.Mesh(wheelGeo, tireMat); w.position.set(pos[0], pos[1], pos[2]); newModelGroup.add(w);
            });
            currentFocusY = 0.4;
            subject2DUI.innerHTML = `<div class="car-shape"></div>`;
        }

        enableLightingAndShadows(newModelGroup);
        subjectGroup.add(newModelGroup);
        
        const subjectRot = document.getElementById('subjectRot');
        if(subjectRot) {
            subjectGroup.rotation.y = parseFloat(subjectRot.value) * (Math.PI / 180);
        }
        requestRenderIfNotRequested();
    }
    
    createModel('box');
    document.getElementById('modelSelector').addEventListener('change', (e) => createModel(e.target.value));

    const subjectRotSlider = document.getElementById('subjectRot');
    const valSubjectRot = document.getElementById('val-subject-rot');
    if (subjectRotSlider) {
        subjectRotSlider.addEventListener('input', (e) => {
            const deg = parseFloat(e.target.value);
            valSubjectRot.textContent = `${deg}°`;
            subjectGroup.rotation.y = deg * (Math.PI / 180);
            updateAllLights(); 
        });
    }

    function rotateToSubject(element, offsetAngle = 0) {
        const elRect = element.getBoundingClientRect();
        const subRect = subject2DUI.getBoundingClientRect();
        const eX = elRect.left + elRect.width / 2;
        const eY = elRect.top + elRect.height / 2;
        const sX = subRect.left + subRect.width / 2;
        const sY = subRect.top + subRect.height / 2;
        const angle = Math.atan2(sY - eY, sX - eX) * (180 / Math.PI);
        element.style.transform = `rotate(${angle + offsetAngle}deg)`;
        const label = element.querySelector('.light-label');
        if (label) label.style.transform = `rotate(${-(angle + offsetAngle)}deg)`;
    }

    // 🌟 ระบบลากวางรองรับทั้ง Mouse และ Touch (iPad)
    function makeDraggable(element, onDragCallback, isClickToggle = false, toggleCallback = null) {
        let isDragging = false, hasMoved = false;
        let animationFrameId = null; 
        
        const startDrag = () => { isDragging = true; hasMoved = false; };
        const moveDrag = (clientX, clientY) => {
            if (!isDragging) return;
            hasMoved = true;
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            
            animationFrameId = requestAnimationFrame(() => {
                const sRect = studioPanel.getBoundingClientRect();
                let newX = Math.max(0, Math.min(clientX - sRect.left, sRect.width));
                let newY = Math.max(0, Math.min(clientY - sRect.top, sRect.height));
                element.style.left = `${(newX / sRect.width) * 100}%`;
                element.style.top = `${(newY / sRect.height) * 100}%`;
                if (onDragCallback) onDragCallback(newX / sRect.width, newY / sRect.height);
                requestRenderIfNotRequested();
            });
        };
        const endDrag = () => {
            if (isDragging) {
                isDragging = false;
                if (!hasMoved && isClickToggle && toggleCallback) toggleCallback();
            }
        };

        element.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
        document.addEventListener('mouseup', endDrag);

        element.style.touchAction = 'none';
        element.addEventListener('touchstart', (e) => { if (e.touches.length === 1) startDrag(); });
        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            if (e.touches.length === 1) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });
        document.addEventListener('touchend', endDrag);
    }

    makeDraggable(subject2DUI, (pctX, pctY) => {
        subjectGroup.position.x = (pctX - 0.5) * ROOM_WIDTH;
        subjectGroup.position.z = (pctY - 0.5) * ROOM_DEPTH;
        document.querySelectorAll('.light:not(.hidden)').forEach(light => rotateToSubject(light, 0));
        rotateToSubject(document.getElementById('camera2d'), 90); 
        updateAllLights(); 
    });

    makeDraggable(document.getElementById('camera2d'), (pctX, pctY) => {
        const xPos = (pctX - 0.5) * ROOM_WIDTH;
        const zPos = (pctY - 0.5) * ROOM_DEPTH;
        cameraCenter.position.x = xPos;
        cameraCenter.position.z = zPos;
        cameraRight.position.x = xPos;
        cameraRight.position.z = zPos;
        rotateToSubject(document.getElementById('camera2d'), 90);
        requestRenderIfNotRequested();
    });

    document.getElementById('camHeight').addEventListener('input', (e) => {
        const h = parseFloat(e.target.value);
        document.getElementById('val-cam-height').textContent = `${h} cm`;
        cameraCenter.position.y = h / 100;
        cameraRight.position.y = h / 100;
        requestRenderIfNotRequested();
    });

    function kelvinToRGB(kelvin) {
        let temp = kelvin / 100; let r, g, b;
        if (temp <= 66) {
            r = 255; g = Math.max(0, Math.min(255, 99.4708025861 * Math.log(temp) - 161.1195681661));
            b = temp <= 19 ? 0 : Math.max(0, Math.min(255, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
        } else {
            r = Math.max(0, Math.min(255, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
            g = Math.max(0, Math.min(255, 288.1221695283 * Math.pow(temp - 60, -0.0755148492))); b = 255;
        }
        return new THREE.Color(r / 255, g / 255, b / 255);
    }

    const domLights = document.querySelectorAll('.light');
    const lightsData = [];

    const standMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const boxBackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const tubeBackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });

    domLights.forEach((domLight, index) => {
        const mapSize = index === 0 ? 1024 : 512; 
        const isRGB = domLight.classList.contains('rgb-light');
        
        const pl = new THREE.PointLight(0xffffff, 0, 25);
        pl.castShadow = true; 
        pl.shadow.mapSize.width = mapSize; 
        pl.shadow.mapSize.height = mapSize; 
        pl.shadow.camera.near = 0.5;
        pl.shadow.camera.far = 15;
        scene.add(pl);
        
        const sl = new THREE.SpotLight(0xffffff, 0, 25, Math.PI / 10, 0.3, 1);
        sl.castShadow = true; 
        sl.shadow.mapSize.width = mapSize; 
        sl.shadow.mapSize.height = mapSize; 
        sl.shadow.camera.near = 0.5;
        sl.shadow.camera.far = 15;
        scene.add(sl); scene.add(sl.target); 

        const fixtureGroup = new THREE.Group();
        
        const standGeo = new THREE.CylinderGeometry(0.015, 0.03, 1, 8);
        standGeo.translate(0, 0.5, 0); 
        const standMesh = new THREE.Mesh(standGeo, standMat);
        standMesh.castShadow = true;
        fixtureGroup.add(standMesh);

        const headGroup = new THREE.Group();
        let glowMesh, softboxMesh, softboxGlow, snootMesh, snootGlow;

        if (isRGB) {
            const backGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 16);
            backGeo.translate(0, 0.6, 0); 
            const backMesh = new THREE.Mesh(backGeo, tubeBackMat);
            backMesh.castShadow = true;
            headGroup.add(backMesh);

            const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const glowGeo = new THREE.PlaneGeometry(0.06, 1.15);
            glowGeo.translate(0, 0.6, 0);
            glowMesh = new THREE.Mesh(glowGeo, glowMat);
            glowMesh.position.z = 0.041; 
            headGroup.add(glowMesh);
        } else {
            const softboxGeo = new THREE.BoxGeometry(0.5, 0.7, 0.3);
            softboxGeo.translate(0, 0, 0.15); 
            softboxMesh = new THREE.Mesh(softboxGeo, boxBackMat);
            softboxMesh.castShadow = true;
            headGroup.add(softboxMesh);

            const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            softboxGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.68), glowMat);
            softboxGlow.position.z = 0.301;
            headGroup.add(softboxGlow);

            const snootGeo = new THREE.CylinderGeometry(0.05, 0.15, 0.4, 16);
            snootGeo.rotateX(Math.PI / 2); 
            snootGeo.translate(0, 0, 0.2); 
            snootMesh = new THREE.Mesh(snootGeo, boxBackMat);
            snootMesh.castShadow = true;
            headGroup.add(snootMesh);

            snootGlow = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), glowMat);
            snootGlow.position.z = 0.401;
            headGroup.add(snootGlow);
        }

        fixtureGroup.add(headGroup);
        scene.add(fixtureGroup);

        fixtureGroup.traverse(child => child.layers.set(1));

        const cards = document.querySelectorAll('.light-panel-body .light-card');
        const card = cards[index];
        const toggleBtn = card.querySelector('.toggle-power');
        const intensitySlider = card.querySelector('.intensity-slider');
        const heightSlider = card.querySelector('.height-slider');
        const colorInput = isRGB ? card.querySelector('.rgb-picker') : card.querySelector('.kelvin-slider');
        const modifierSelect = card.querySelector('.modifier-select');
        const valDistance = card.querySelector('.val-distance');

        lightsData.push({ 
            domLight, pl, sl, card, isRGB, toggleBtn, intensitySlider, heightSlider, colorInput, modifierSelect, valDistance,
            fixtureGroup, standMesh, headGroup, glowMesh, softboxMesh, softboxGlow, snootMesh, snootGlow
        });
        
        const syncPositionTo3D = (pctX, pctY) => { 
            pl.position.x = (pctX - 0.5) * ROOM_WIDTH; 
            pl.position.z = (pctY - 0.5) * ROOM_DEPTH; 
            sl.position.copy(pl.position);
        };

        makeDraggable(domLight, (pctX, pctY) => {
            rotateToSubject(domLight, 0); 
            syncPositionTo3D(pctX, pctY);
            updateAllLights(); 
        }, true, () => {
            toggleBtn.checked = !toggleBtn.checked; updateAllLights();
        });

        [toggleBtn, intensitySlider, colorInput, heightSlider, modifierSelect].forEach(el => { 
            if(el) el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', updateAllLights); 
        });

        rotateToSubject(domLight, 0);
        const lRect = domLight.getBoundingClientRect(); const sRect = studioPanel.getBoundingClientRect();
        syncPositionTo3D((lRect.left - sRect.left + lRect.width/2)/sRect.width, (lRect.top - sRect.top + lRect.height/2)/sRect.height);
    });

    function updateAllLights() {
        let activeLightCount = 0;
        const targetVec = new THREE.Vector3(subjectGroup.position.x, currentFocusY, subjectGroup.position.z);

        lightsData.forEach(data => {
            const pctX = parseFloat(data.domLight.style.left) / 100;
            const pctY = parseFloat(data.domLight.style.top) / 100;
            if (!isNaN(pctX) && !isNaN(pctY)) {
                data.pl.position.x = (pctX - 0.5) * ROOM_WIDTH;
                data.pl.position.z = (pctY - 0.5) * ROOM_DEPTH;
                data.sl.position.copy(data.pl.position);
            }

            if (data.valDistance) {
                const dist = data.pl.position.distanceTo(targetVec);
                data.valDistance.textContent = `${dist.toFixed(2)} m`;
            }

            const isActive = data.toggleBtn.checked;
            let colorObj;
            if(data.isRGB) { colorObj = new THREE.Color(data.colorInput.value); } 
            else { 
                colorObj = kelvinToRGB(parseFloat(data.colorInput.value)); 
                const kelvinValEl = data.card.querySelector('.val-kelvin');
                if(kelvinValEl) kelvinValEl.textContent = `${data.colorInput.value}K`; 
            }
            
            data.card.querySelector('.val-intensity').textContent = `${data.intensitySlider.value}%`;
            data.card.querySelector('.val-height').textContent = `${data.heightSlider.value} cm`;
            
            const heightMeters = parseFloat(data.heightSlider.value) / 100;
            data.pl.color = colorObj; 
            data.pl.position.y = heightMeters;
            
            data.sl.color = colorObj;
            data.sl.position.y = data.pl.position.y;
            data.sl.target.position.copy(targetVec);
            data.sl.target.updateMatrixWorld();

            data.standMesh.position.set(data.pl.position.x, 0, data.pl.position.z);
            data.standMesh.scale.y = heightMeters;
            
            data.headGroup.position.set(data.pl.position.x, heightMeters, data.pl.position.z);
            data.headGroup.lookAt(targetVec); 

            if (data.domLight.classList.contains('hidden')) {
                data.fixtureGroup.visible = false;
            } else {
                data.fixtureGroup.visible = true;
                const isPowerOn = (isActive && parseFloat(data.intensitySlider.value) > 0);
                const targetColor = isPowerOn ? colorObj : new THREE.Color(0x222222); 

                if (!data.isRGB) {
                    const modifier = data.modifierSelect ? data.modifierSelect.value : 'softbox';
                    const isSnoot = (modifier === 'snoot');
                    
                    data.softboxMesh.visible = !isSnoot;
                    data.softboxGlow.visible = !isSnoot;
                    data.snootMesh.visible = isSnoot;
                    data.snootGlow.visible = isSnoot;

                    data.softboxGlow.material.color = targetColor;
                    data.snootGlow.material.color = targetColor;

                    if (isSnoot) {
                        data.domLight.classList.add('is-snoot');
                    } else {
                        data.domLight.classList.remove('is-snoot');
                    }
                } else {
                    data.glowMesh.material.color = targetColor;
                }
            }

            if (isActive && parseFloat(data.intensitySlider.value) > 0 && !data.domLight.classList.contains('hidden')) {
                activeLightCount++;
                const basePower = (parseFloat(data.intensitySlider.value) / 100) * 4.0;
                
                const finalIntensity = basePower;
                
                const modifier = data.modifierSelect ? data.modifierSelect.value : 'softbox';
                
                if (modifier === 'snoot') {
                    data.pl.intensity = 0; 
                    data.sl.intensity = finalIntensity * 1.5; 
                } else {
                    data.sl.intensity = 0;
                    data.pl.intensity = finalIntensity;
                }

                data.domLight.classList.add('active');
                data.domLight.style.setProperty('--light-color', `#${colorObj.getHexString()}`);
            } else {
                data.pl.intensity = 0; 
                data.sl.intensity = 0;
                data.domLight.classList.remove('active');
            }
        });

        if (activeLightCount === 0) {
            ambientLight.intensity = 0;
        } else {
            ambientLight.intensity = baseAmbientIntensity;
        }
        
        requestRenderIfNotRequested();
    }

    rotateToSubject(document.getElementById('camera2d'), 90);

    const presetButtons = document.querySelectorAll('.btn-preset');
    const presetDesc = document.getElementById('preset-desc');

    const presetsConfig = {
        three_point: {
            desc: " 3-Point Lighting: มาตรฐานการจัดไฟ 3 จุด (Key, Fill, Rim) พื้นฐานสำหรับงานถ่ายภาพและวิดีโอ",
            setup: [
                { index: 0, left: '25%', top: '40%', power: 80, h: 180, on: true, modifier: 'softbox' },
                { index: 1, left: '75%', top: '65%', power: 30, h: 150, on: true, modifier: 'softbox' },
                { index: 2, left: '50%', top: '15%', power: 50, h: 220, on: true, modifier: 'softbox' }
            ]
        },
        rembrandt: {
            desc: " Rembrandt Lighting: ไฟหลักเยื้อง 30 องศา สร้างสามเหลี่ยมแสงที่แก้ม (ใช้ 3 ดวง)",
            setup: [
                { index: 0, left: '30%', top: '38%', power: 85, h: 190, on: true, modifier: 'softbox' },
                { index: 1, left: '75%', top: '70%', power: 15, h: 140, on: true, modifier: 'softbox' },
                { index: 2, left: '50%', top: '15%', power: 50, h: 220, on: true, modifier: 'softbox' }
            ]
        },
        butterfly: {
            desc: " Butterfly Lighting: ไฟหลักเยื้องหน้าเหนือตัวแบบ ไม่บังกล้อง (ใช้ 3 ดวง)",
            setup: [
                { index: 0, left: '50%', top: '35%', power: 90, h: 240, on: true, modifier: 'softbox' },
                { index: 1, left: '50%', top: '75%', power: 30, h: 120, on: true, modifier: 'softbox' },
                { index: 2, left: '50%', top: '15%', power: 40, h: 200, on: true, modifier: 'softbox' }
            ]
        },
        split: {
            desc: " Split Lighting: ไฟหลักด้านข้าง 90 องศา พร้อมไฟเสริมด้านหน้าเบาๆ (ใช้ 3 ดวง)",
            setup: [
                { index: 0, left: '15%', top: '50%', power: 90, h: 170, on: true, modifier: 'softbox' },
                { index: 1, left: '35%', top: '80%', power: 20, h: 120, on: true, modifier: 'softbox' },
                { index: 2, left: '50%', top: '20%', power: 30, h: 200, on: true, modifier: 'softbox' }
            ]
        },
        loop: {
            desc: " Loop Lighting: ไฟหลักเยื้อง 35 องศา แสงธรรมชาติสวยงาม (ใช้ 3 ดวง)",
            setup: [
                { index: 0, left: '35%', top: '35%', power: 80, h: 180, on: true, modifier: 'softbox' },
                { index: 1, left: '70%', top: '65%', power: 25, h: 150, on: true, modifier: 'softbox' },
                { index: 2, left: '50%', top: '15%', power: 45, h: 210, on: true, modifier: 'softbox' }
            ]
        },
        clamshell: {
            desc: " Clamshell (Beauty): ไฟบนเยื้อง + ไฟล่างส่องหน้า ไม่บังหน้ากล้อง (ใช้ 3 ดวง)",
            setup: [
                { index: 0, left: '40%', top: '32%', power: 85, h: 220, on: true, modifier: 'softbox' }, 
                { index: 5, left: '60%', top: '68%', power: 40, h: 100, on: true, modifier: 'softbox' }, 
                { index: 2, left: '50%', top: '10%', power: 30, h: 200, on: true, modifier: 'softbox' }
            ]
        },
        product: {
            desc: " Product Flat Lay: แสงสว่างเคลียร์รอบทิศทาง 4 มุม (ใช้ 4 ดวง)",
            setup: [
                { index: 0, left: '20%', top: '30%', power: 70, h: 180, on: true, modifier: 'softbox' },
                { index: 1, left: '80%', top: '30%', power: 70, h: 180, on: true, modifier: 'softbox' },
                { index: 5, left: '20%', top: '80%', power: 60, h: 150, on: true, modifier: 'softbox' },
                { index: 6, left: '80%', top: '80%', power: 60, h: 150, on: true, modifier: 'softbox' }
            ]
        },
        silhouette: {
            desc: " Silhouette: ย้อนแสงเต็มตัว + ไฟหน้าสว่างพอดีตัว (ใช้ 3 ดวง)",
            setup: [
                { index: 2, left: '50%', top: '10%', power: 100, h: 180, on: true, modifier: 'softbox' },
                { index: 5, left: '30%', top: '70%', power: 40, h: 120, on: true, modifier: 'softbox' },
                { index: 6, left: '70%', top: '70%', power: 40, h: 120, on: true, modifier: 'softbox' }
            ]
        },
        interview: {
            desc: " Cinematic Interview: 3-Point Lighting + ไฟฉากหลัง (ใช้ 4 ดวง)",
            setup: [
                { index: 0, left: '28%', top: '40%', power: 80, h: 180, on: true, modifier: 'softbox' },
                { index: 1, left: '80%', top: '65%', power: 20, h: 150, on: true, modifier: 'softbox' },
                { index: 2, left: '80%', top: '15%', power: 50, h: 220, on: true, modifier: 'softbox' },
                { index: 5, left: '25%', top: '15%', power: 60, h: 100, on: true, modifier: 'snoot' } 
            ]
        },
        cyberpunk: {
            desc: " Cyberpunk: ไฟหน้าเคลียร์ + ย้อมแสง RGB ม่วง-ฟ้าด้านข้าง (ใช้ 3 ดวง)",
            setup: [
                { index: 0, left: '50%', top: '65%', power: 50, h: 150, on: true, modifier: 'softbox' },
                { index: 3, left: '15%', top: '35%', power: 90, h: 150, on: true, color: '#00ffff' },
                { index: 4, left: '85%', top: '35%', power: 90, h: 150, on: true, color: '#ff00ff' }
            ]
        },
        neon_wash: {
            desc: " Neon Wash: ไฟหน้าสว่าง + ย้อมฉากหลัง RGB แดง-น้ำเงิน (ใช้ 3 ดวง)",
            setup: [
                { index: 0, left: '50%', top: '70%', power: 70, h: 180, on: true, modifier: 'softbox' },
                { index: 3, left: '20%', top: '15%', power: 100, h: 100, on: true, color: '#ff3300' },
                { index: 4, left: '80%', top: '15%', power: 100, h: 100, on: true, color: '#3300ff' }
            ]
        }
    };

    let visibleStudioCount = 0;
    const addStudioBtn = document.getElementById('addStudioBtn');
    const removeStudioBtn = document.getElementById('removeStudioBtn');
    let visibleRgbCount = 0;
    const addRgbBtn = document.getElementById('addRgbBtn');
    const removeRgbBtn = document.getElementById('removeRgbBtn');

    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            presetButtons.forEach(b => b.classList.remove('active-preset'));
            btn.classList.add('active-preset');

            const type = btn.getAttribute('data-preset');
            const data = presetsConfig[type];
            if(!data) return;

            presetDesc.textContent = data.desc;

            lightsData.forEach(ld => { ld.toggleBtn.checked = false; });

            document.querySelectorAll('.extra-light').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.extra-tab-item').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.rgb-light').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.rgb-tab-item').forEach(el => el.classList.add('hidden'));
            
            visibleStudioCount = 0;
            if(addStudioBtn) addStudioBtn.classList.remove('hidden');
            if(removeStudioBtn) removeStudioBtn.classList.add('hidden');
            
            visibleRgbCount = 0;
            if(addRgbBtn) addRgbBtn.classList.remove('hidden');
            if(removeRgbBtn) removeRgbBtn.classList.add('hidden');

            data.setup.forEach(item => {
                const domEl = document.querySelector(`.light[data-index="${item.index}"]`);
                const cardEl = document.querySelector(`.light-card[data-index="${item.index}"]`);
                if(domEl && cardEl) {
                    domEl.style.left = item.left;
                    domEl.style.top = item.top;
                    
                    const toggle = cardEl.querySelector('.toggle-power');
                    const intensity = cardEl.querySelector('.intensity-slider');
                    const height = cardEl.querySelector('.height-slider');
                    const modifier = cardEl.querySelector('.modifier-select');
                    const color = cardEl.querySelector('.rgb-picker');

                    if(toggle) toggle.checked = item.on;
                    if(intensity) intensity.value = item.power;
                    if(height) height.value = item.h;
                    if(modifier && item.modifier) modifier.value = item.modifier;
                    if(color && item.color) color.value = item.color;

                    if (item.index === 5 || item.index === 6) {
                        domEl.classList.remove('hidden');
                        cardEl.classList.remove('hidden');
                        document.querySelector(`.extra-tab-item[data-light-tab="${item.index}"]`).classList.remove('hidden');
                        visibleStudioCount++;
                    }
                    if (item.index === 3 || item.index === 4) {
                        domEl.classList.remove('hidden');
                        cardEl.classList.remove('hidden');
                        document.querySelector(`.rgb-tab-item[data-light-tab="${item.index}"]`).classList.remove('hidden');
                        visibleRgbCount++;
                    }
                }
            });

            if(visibleStudioCount > 0 && removeStudioBtn) removeStudioBtn.classList.remove('hidden');
            if(visibleStudioCount === 2 && addStudioBtn) addStudioBtn.classList.add('hidden');
            
            if(visibleRgbCount > 0 && removeRgbBtn) removeRgbBtn.classList.remove('hidden');
            if(visibleRgbCount === 2 && addRgbBtn) addRgbBtn.classList.add('hidden');

            const keyTab = document.querySelector('.light-tab-btn[data-light-tab="0"]');
            if(keyTab) keyTab.click();

            document.querySelectorAll('.light:not(.hidden)').forEach(light => rotateToSubject(light, 0));
            updateAllLights();
        });
    });

    function generateDiagramDataURL() {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, 800, 800);

        ctx.strokeStyle = '#444';
        ctx.lineWidth = 3;
        ctx.strokeRect(100, 100, 600, 600);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Prompt';
        ctx.textAlign = 'center';
        ctx.fillText('LuminaStudio - Lighting Diagram', 400, 60);

        const sRect = studioPanel.getBoundingClientRect();
        
        const subRect = subject2DUI.getBoundingClientRect();
        const subX = 100 + ((subRect.left - sRect.left + subRect.width/2) / sRect.width) * 600;
        const subY = 100 + ((subRect.top - sRect.top + subRect.height/2) / sRect.height) * 600;
        
        ctx.fillStyle = '#ffb74d';
        ctx.beginPath();
        ctx.arc(subX, subY, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = '12px Prompt';
        ctx.fillText('SUBJECT', subX, subY + 4);

        const camEl = document.getElementById('camera2d');
        const camRect = camEl.getBoundingClientRect();
        const camX = 100 + ((camRect.left - sRect.left + camRect.width/2) / sRect.width) * 600;
        const camY = 100 + ((camRect.top - sRect.top + camRect.height/2) / sRect.height) * 600;

        ctx.fillStyle = '#64b5f6';
        ctx.fillRect(camX - 15, camY - 10, 30, 20);
        ctx.fillStyle = '#000';
        ctx.fillText('CAM', camX, camY + 4);

        document.querySelectorAll('.light:not(.hidden)').forEach(light => {
            const lRect = light.getBoundingClientRect();
            const lX = 100 + ((lRect.left - sRect.left + lRect.width/2) / sRect.width) * 600;
            const lY = 100 + ((lRect.top - sRect.top + lRect.height/2) / sRect.height) * 600;
            const label = light.querySelector('.light-label').textContent;

            ctx.fillStyle = '#e57373';
            ctx.beginPath();
            ctx.arc(lX, lY, 15, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(229, 115, 115, 0.4)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(lX, lY);
            ctx.lineTo(subX, subY);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#fff';
            ctx.font = '11px Prompt';
            ctx.fillText(label, lX, lY - 20);
        });

        return canvas.toDataURL('image/png');
    }

    function roundRect(ctx, x, y, width, height, radius, fill, stroke, strokeWidth) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = strokeWidth; ctx.stroke(); }
    }

    function generateInfographic(photoCanvas) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const pad = 30;
        const w = 900;
        const photoAspect = photoCanvas.height / photoCanvas.width;
        const photoW = w - (pad * 2);
        const photoH = photoW * photoAspect;
        
        let activeLightsCount = 0;
        lightsData.forEach(d => { if(!d.domLight.classList.contains('hidden') && d.toggleBtn.checked) activeLightsCount++; });
        
        const diagramSize = 350;
        const listsHeight = activeLightsCount * 90;
        const bottomSectionHeight = Math.max(diagramSize, listsHeight);
        const h = pad + 30 + photoH + 20 + 70 + 30 + bottomSectionHeight + pad;
        
        canvas.width = w;
        canvas.height = h;
        
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(0, 0, w, h);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Prompt';
        ctx.textAlign = 'center';
        ctx.fillText('LuminaStudio - Lighting Recipe', w/2, pad + 20);
        
        const photoY = pad + 40;
        ctx.drawImage(photoCanvas, pad, photoY, photoW, photoH);
        
        const camY = photoY + photoH + 20;
        roundRect(ctx, pad, camY, photoW, 70, 12, '#1f242c');
        ctx.fillStyle = '#58a6ff';
        ctx.font = 'bold 18px Prompt';
        ctx.textAlign = 'center';
        ctx.fillText('📷 การตั้งค่ากล้อง (Camera Settings)', w/2, camY + 28);
        
        ctx.fillStyle = '#c9d1d9';
        ctx.font = '14px Prompt';
        const camMode = document.getElementById('camMode').value;
        const camF = document.getElementById('camF').options[document.getElementById('camF').selectedIndex].text;
        const camSS = document.getElementById('camSS').options[document.getElementById('camSS').selectedIndex].text;
        const camISO = document.getElementById('camISO').value;
        const camFocal = document.getElementById('camFocal').value;
        const camWB = document.getElementById('camWB').value;
        const camText = `โหมด: ${camMode}   |   F-Stop: ${camF}   |   Shutter: ${camSS}   |   ISO: ${camISO}   |   ระยะเลนส์: ${camFocal}mm   |   WB: ${camWB}K`;
        ctx.fillText(camText, w/2, camY + 52);
        
        const diagX = pad;
        const diagY = camY + 70 + 25;
        roundRect(ctx, diagX, diagY, diagramSize, diagramSize, 16, '#161b22', '#30363d', 2);
        
        const getX = (el) => { const pct = parseFloat(el.style.left) / 100 || 0.5; return diagX + (pct * diagramSize); };
        const getY = (el) => { const pct = parseFloat(el.style.top) / 100 || 0.5; return diagY + (pct * diagramSize); };

        const subX = getX(subject2DUI);
        const subY = getY(subject2DUI);
        roundRect(ctx, subX - 15, subY - 15, 30, 30, 6, '#adb5bd'); 
        
        const camEl = document.getElementById('camera2d');
        const cX = getX(camEl);
        const cY = getY(camEl);
        roundRect(ctx, cX - 12, cY - 8, 24, 16, 4, '#222', '#666', 2); 
        
        const listX = diagX + diagramSize + 30;
        let listY = diagY;
        const listW = photoW - diagramSize - 30;

        lightsData.forEach(data => {
            if(data.domLight.classList.contains('hidden') || !data.toggleBtn.checked) return;
            
            const lx = getX(data.domLight);
            const ly = getY(data.domLight);
            const label = data.domLight.querySelector('.light-label').textContent;
            const match = data.domLight.style.transform.match(/rotate\(([-0-9.]+)deg\)/);
            const angle = match ? parseFloat(match[1]) : 0;
            const isRGB = data.isRGB;
            const isSnoot = data.domLight.classList.contains('is-snoot');
            
            ctx.save();
            ctx.translate(lx, ly);
            ctx.rotate(angle * Math.PI / 180);
            
            roundRect(ctx, -8, -8, 16, 16, 4, '#222', '#444', 1);
            
            let colorHex = '#fff';
            if(isRGB) {
                colorHex = data.colorInput.value;
                roundRect(ctx, 8, -16, 8, 32, 3, '#111');
                roundRect(ctx, 10, -14, 4, 28, 2, colorHex);
            } else {
                colorHex = `#${kelvinToRGB(parseFloat(data.colorInput.value)).getHexString()}`;
                ctx.fillStyle = '#1a1a1a';
                ctx.beginPath();
                if(isSnoot) {
                    ctx.moveTo(8, -8); ctx.lineTo(24, -4); ctx.lineTo(24, 4); ctx.lineTo(8, 8);
                } else {
                    ctx.moveTo(8, -16); ctx.lineTo(32, -20); ctx.lineTo(32, 20); ctx.lineTo(8, 16);
                }
                ctx.fill();
                
                ctx.fillStyle = colorHex;
                ctx.beginPath();
                if(isSnoot) {
                    ctx.rect(24, -4, 3, 8);
                } else {
                    ctx.rect(32, -20, 5, 40);
                }
                ctx.fill();
            }
            ctx.restore();
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px Prompt';
            ctx.textAlign = 'center';
            ctx.fillText(label, lx, ly - 16);
            
            roundRect(ctx, listX, listY, listW, 80, 12, '#1f242c');
            
            ctx.fillStyle = colorHex;
            ctx.beginPath();
            ctx.arc(listX + 25, listY + 40, 8, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.font = 'bold 16px Prompt';
            ctx.fillText(label, listX + 45, listY + 32);
            
            ctx.fillStyle = '#8b949e';
            ctx.font = '13px Prompt';
            const power = data.intensitySlider.value;
            const kelvin = isRGB ? 'RGB Mode' : data.colorInput.value + 'K';
            const height = data.heightSlider.value;
            const modifier = isRGB ? 'Tube Light' : data.modifierSelect.options[data.modifierSelect.selectedIndex].text;
            
            ctx.fillText(`กำลังไฟ: ${power}%   |   อุณหภูมิสี: ${kelvin}   |   ความสูง: ${height} cm`, listX + 45, listY + 52);
            ctx.fillText(`ตัวกรองแสง: ${modifier}`, listX + 45, listY + 70);
            
            listY += 90;
        });
        
        return canvas.toDataURL('image/png');
    }

    if(addStudioBtn) {
        addStudioBtn.addEventListener('click', () => {
            if (visibleStudioCount === 0) {
                document.querySelector('.extra-light[data-index="5"]').classList.remove('hidden');
                document.getElementById('card-extra1').classList.remove('hidden');
                document.querySelector('.extra-tab-item[data-light-tab="5"]').classList.remove('hidden');
                removeStudioBtn.classList.remove('hidden'); 
                rotateToSubject(document.querySelector('.extra-light[data-index="5"]'), 0);
                
                const toggle = document.querySelector('#card-extra1 .toggle-power');
                if (toggle) toggle.checked = true;
                
                visibleStudioCount = 1;
                updateAllLights();
            } else if (visibleStudioCount === 1) {
                document.querySelector('.extra-light[data-index="6"]').classList.remove('hidden');
                document.getElementById('card-extra2').classList.remove('hidden');
                document.querySelector('.extra-tab-item[data-light-tab="6"]').classList.remove('hidden');
                addStudioBtn.classList.add('hidden'); 
                rotateToSubject(document.querySelector('.extra-light[data-index="6"]'), 0);
                
                const toggle = document.querySelector('#card-extra2 .toggle-power');
                if (toggle) toggle.checked = true;
                
                visibleStudioCount = 2;
                updateAllLights();
            }
        });
    }

    if(removeStudioBtn) {
        removeStudioBtn.addEventListener('click', () => {
            if (visibleStudioCount === 2) {
                document.querySelector('.extra-light[data-index="6"]').classList.add('hidden');
                document.getElementById('card-extra2').classList.add('hidden');
                document.querySelector('.extra-tab-item[data-light-tab="6"]').classList.add('hidden');
                addStudioBtn.classList.remove('hidden'); 
                
                const toggle = document.querySelector('#card-extra2 .toggle-power');
                if(toggle) { toggle.checked = false; }
                
                const activeTab = document.querySelector('.light-tab-btn.active');
                if (activeTab && activeTab.getAttribute('data-light-tab') === "6") {
                    document.querySelector('.light-tab-btn[data-light-tab="0"]').click();
                }
                visibleStudioCount = 1;
                updateAllLights();
            } else if (visibleStudioCount === 1) {
                document.querySelector('.extra-light[data-index="5"]').classList.add('hidden');
                document.getElementById('card-extra1').classList.add('hidden');
                document.querySelector('.extra-tab-item[data-light-tab="5"]').classList.add('hidden');
                removeStudioBtn.classList.add('hidden'); 
                
                const toggle = document.querySelector('#card-extra1 .toggle-power');
                if(toggle) { toggle.checked = false; }
                
                const activeTab = document.querySelector('.light-tab-btn.active');
                if (activeTab && activeTab.getAttribute('data-light-tab') === "5") {
                    document.querySelector('.light-tab-btn[data-light-tab="0"]').click();
                }
                visibleStudioCount = 0;
                updateAllLights();
            }
        });
    }

    if(addRgbBtn) {
        addRgbBtn.addEventListener('click', () => {
            if (visibleRgbCount === 0) {
                document.querySelector('.rgb-light[data-index="3"]').classList.remove('hidden');
                document.getElementById('card-rgb1').classList.remove('hidden');
                document.querySelector('.rgb-tab-item[data-light-tab="3"]').classList.remove('hidden');
                removeRgbBtn.classList.remove('hidden'); 
                rotateToSubject(document.querySelector('.rgb-light[data-index="3"]'), 0);
                
                const toggle = document.querySelector('#card-rgb1 .toggle-power');
                if (toggle) toggle.checked = true;
                
                visibleRgbCount = 1;
            } else if (visibleRgbCount === 1) {
                document.querySelector('.rgb-light[data-index="4"]').classList.remove('hidden');
                document.getElementById('card-rgb2').classList.add('hidden');
                document.querySelector('.rgb-tab-item[data-light-tab="4"]').classList.add('hidden');
                addRgbBtn.classList.add('hidden'); 
                rotateToSubject(document.querySelector('.rgb-light[data-index="4"]'), 0);
                
                const toggle = document.querySelector('#card-rgb2 .toggle-power');
                if (toggle) toggle.checked = true;
                
                visibleRgbCount = 2;
            }
            updateAllLights();
        });
    }

    if(removeRgbBtn) {
        removeRgbBtn.addEventListener('click', () => {
            if (visibleRgbCount === 2) {
                document.querySelector('.rgb-light[data-index="4"]').classList.add('hidden');
                document.getElementById('card-rgb2').classList.add('hidden');
                document.querySelector('.rgb-tab-item[data-light-tab="4"]').classList.add('hidden');
                addRgbBtn.classList.remove('hidden'); 
                const toggle = document.querySelector('#card-rgb2 .toggle-power');
                if(toggle) { toggle.checked = false; }
                const activeTab = document.querySelector('.light-tab-btn.active');
                if (activeTab && activeTab.getAttribute('data-light-tab') === "4") {
                    document.querySelector('.light-tab-btn[data-light-tab="0"]').click();
                }
                visibleRgbCount = 1;
            } else if (visibleRgbCount === 1) {
                document.querySelector('.rgb-light[data-index="3"]').classList.add('hidden');
                document.getElementById('card-rgb1').classList.add('hidden');
                document.querySelector('.rgb-tab-item[data-light-tab="3"]').classList.add('hidden');
                removeRgbBtn.classList.add('hidden'); 
                const toggle = document.querySelector('#card-rgb1 .toggle-power');
                if(toggle) { toggle.checked = false; }
                const activeTab = document.querySelector('.light-tab-btn.active');
                if (activeTab && activeTab.getAttribute('data-light-tab') === "3") {
                    document.querySelector('.light-tab-btn[data-light-tab="0"]').click();
                }
                visibleRgbCount = 0;
            }
            updateAllLights();
        });
    }

    document.getElementById('bgColor').addEventListener('input', (e) => { 
        scene.background.set(e.target.value); 
        backWall.material.color.set(e.target.value); 
        document.getElementById('backdrop2d').style.backgroundColor = e.target.value; 
        requestRenderIfNotRequested();
    });
    
    document.getElementById('floorColor').addEventListener('input', (e) => {
        floor.material.color.set(e.target.value);
        requestRenderIfNotRequested();
    });

    const btnCapture = document.getElementById('btnCapture');
    const flashEffectRight = document.getElementById('flash-effect-right');
    const captureModal = document.getElementById('captureModal');
    const capturedImage = document.getElementById('capturedImage');
    const downloadPhotoBtn = document.getElementById('downloadPhotoBtn');
    const closeModal = document.querySelector('.close-modal');

    btnCapture.addEventListener('click', () => {
        const nicknameInput = document.getElementById('userNicknameInput');
        const nickname = nicknameInput && nicknameInput.value.trim() ? nicknameInput.value.trim() : "นักเรียน";
        
        sendActivityData("update_checkout", nickname);

        if(flashEffectRight) {
            flashEffectRight.classList.remove('flash'); 
            void flashEffectRight.offsetWidth; 
            flashEffectRight.classList.add('flash');
        }
        
        composerRight.render(); 
        const dataURL = rendererRight.domElement.toDataURL('image/png');
        const img = new Image(); img.src = dataURL;
        
        img.onload = () => {
            const tempCanvas = document.createElement('canvas'); 
            tempCanvas.width = img.width; 
            tempCanvas.height = img.height;
            const ctx = tempCanvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            const iso = parseFloat(document.getElementById('camISO').value);
            const noiseLevel = Math.pow((iso / 25600), 0.6) * 0.8;
            
            if (noiseLevel > 0.01) {
                const imgData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                const data = imgData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const noise = (Math.random() - 0.5) * 255 * noiseLevel;
                    data[i] = Math.min(255, Math.max(0, data[i] + noise));     
                    data[i+1] = Math.min(255, Math.max(0, data[i+1] + noise)); 
                    data[i+2] = Math.min(255, Math.max(0, data[i+2] + noise)); 
                }
                ctx.putImageData(imgData, 0, 0);
            }

            if(currentWbTintColor !== 'rgba(0,0,0,0)') { 
                ctx.fillStyle = currentWbTintColor; 
                ctx.globalCompositeOperation = 'color'; 
                ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height); 
            }
            
            const finalInfographicUrl = generateInfographic(tempCanvas);

            capturedImage.src = finalInfographicUrl;
            downloadPhotoBtn.href = finalInfographicUrl;
            downloadPhotoBtn.download = 'LuminaStudio_Lighting_Recipe.png';

            setTimeout(() => { captureModal.classList.add('show'); }, 300); 
        };
    });

    closeModal.addEventListener('click', () => { captureModal.classList.remove('show'); });
    captureModal.addEventListener('click', (e) => { if(e.target === captureModal) captureModal.classList.remove('show'); });
    
    updateCameraFocalLength(); 
    updateCameraExposure();
    updateCameraWB();
    updateAllLights();
    
    const resizeObserver = new ResizeObserver(() => {
        const cw = previewPanel.clientWidth || 100;
        const ch = previewPanel.clientHeight || 100;
        cameraCenter.aspect = cw / ch;
        cameraCenter.updateProjectionMatrix();
        rendererCenter.setSize(cw, ch);

        const rw = cameraPreviewPanel.clientWidth || 100;
        const rh = cameraPreviewPanel.clientHeight || 100;
        cameraRight.aspect = rw / rh;
        cameraRight.updateProjectionMatrix();
        rendererRight.setSize(rw, rh);
        composerRight.setSize(rw, rh); 

        updateRoomSize(); 
        applyRoomScale();
        requestRenderIfNotRequested();
    });
    resizeObserver.observe(previewPanel);
    resizeObserver.observe(cameraPreviewPanel);

    // 🌟 ระบบคู่มือ (ดันหน้าจอหลักไปทางซ้ายเมื่อเปิดบน PC)
    const tourSidebar = document.getElementById('tour-sidebar');
    const stepsListEl = document.getElementById('tour-steps-list');
    const btnSkipAll = document.getElementById('btn-skip-all-tour');
    const btnCloseSidebar = document.getElementById('tour-close-sidebar');

    const tourSteps = [
        { text: "1. เลือกเปลี่ยนโมเดล (Subject)", target: "#modelSelector", event: "change" },
        { text: "2. ลากปรับตำแหน่งไฟในพื้นที่ 2D", target: "#studio", event: "mousedown" },
        { text: "3. เลือกรูปแบบพรีเซ็ตจัดไฟ (Presets)", target: "#tour-presets", event: "click" },
        { text: "4. เพิ่มไฟสตูดิโอหรือไฟ RGB", target: "#tour-rgbbtn", event: "click" },
        { text: "5. ปรับแผงควบคุมค่าแสงไฟสตูดิโอ", target: "#tour-light", event: "input" },
        { text: "6. ปรับตั้งค่ากล้องถ่ายภาพ", target: "#tour-camera", event: "change" },
        { text: "7. กดถ่ายภาพ 3D เพื่อรับ Lighting Recipe", target: "#btnCapture", event: "click" }
    ];

    let currentTourIdx = 0;

    function renderTourChecklist() {
        if(!stepsListEl) return;
        stepsListEl.innerHTML = '';
        tourSteps.forEach((step, idx) => {
            const li = document.createElement('li');
            if (idx < currentTourIdx) {
                li.className = 'completed-step';
                li.innerHTML = `<span>✔</span> ${step.text}`;
            } else if (idx === currentTourIdx) {
                li.className = 'active-step';
                li.innerHTML = `<span>▶</span> <strong>กำลังทำ:</strong> ${step.text} <button class="btn-tour-secondary" id="btn-skip-step" style="margin-left:auto; padding:5px 12px; font-size:12px; cursor:pointer;">ข้ามขั้นนี้</button>`;
            } else {
                li.innerHTML = `<span>○</span> ${step.text}`;
            }
            stepsListEl.appendChild(li);
        });

        const btnSkipStep = document.getElementById('btn-skip-step');
        if (btnSkipStep) {
            btnSkipStep.addEventListener('click', (e) => {
                e.stopPropagation();
                currentTourIdx++;
                runTourStep();
            });
        }
    }

    function runTourStep() {
        document.querySelectorAll('.highlight-tour').forEach(el => el.classList.remove('highlight-tour'));

        if (currentTourIdx >= tourSteps.length) {
            closeTour();
            return;
        }

        renderTourChecklist();
        const step = tourSteps[currentTourIdx];
        const targetEl = document.querySelector(step.target);

        if (targetEl) {
            targetEl.classList.add('highlight-tour');
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

            const handleAction = () => {
                targetEl.removeEventListener(step.event, handleAction);
                currentTourIdx++;
                runTourStep();
            };
            targetEl.addEventListener(step.event, handleAction, { once: true });
        }
    }

    function openTour() {
        if(tourSidebar) {
            tourSidebar.style.display = 'flex';
            document.body.classList.add('tour-open'); // ดันหน้าจอหลักไปซ้ายบน PC
            currentTourIdx = 0;
            runTourStep();
        }
    }

    function closeTour() {
        if(tourSidebar) {
            tourSidebar.style.display = 'none';
            document.body.classList.remove('tour-open'); // คืนค่าหน้าจอหลัก
            document.querySelectorAll('.highlight-tour').forEach(el => el.classList.remove('highlight-tour'));
        }
    }

    if (btnSkipAll) btnSkipAll.addEventListener('click', closeTour);
    if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', closeTour);
    
    if (btnHelp) {
        btnHelp.addEventListener('click', () => { openTour(); });
    }

    const welcomeModal = document.getElementById('welcome-modal');
    const btnStartTour = document.getElementById('btn-start-tour');
    const btnSkipTour = document.getElementById('btn-skip-tour');
    const userNicknameInput = document.getElementById('userNicknameInput');

    if (btnStartTour) {
        btnStartTour.addEventListener('click', () => {
            const nickname = userNicknameInput.value.trim();
            if (!nickname) {
                alert("กรุณากรอกชื่อเล่นก่อนเริ่มต้นใช้งานครับ!");
                userNicknameInput.focus();
                return;
            }
            sendActivityData("checkin", nickname);
            if(welcomeModal) welcomeModal.classList.remove('show');
            openTour();
        });
    }

    if (btnSkipTour) {
        btnSkipTour.addEventListener('click', () => {
            const nickname = userNicknameInput.value.trim();
            if (!nickname) {
                alert("กรุณากรอกชื่อเล่นก่อนเข้าสู่โปรแกรมครับ!");
                userNicknameInput.focus();
                return;
            }
            sendActivityData("checkin", nickname);
            if(welcomeModal) welcomeModal.classList.remove('show');
        });
    }

    const defaultPresetBtn = document.querySelector('.btn-preset[data-preset="three_point"]');
    if (defaultPresetBtn) {
        defaultPresetBtn.click();
    }
});