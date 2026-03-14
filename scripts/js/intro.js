// --- SISTEMA DE INTRO ---
const intro = {
    phase: 'loading',   // loading -> cutscene -> zoomout -> title -> done
    timer: 0,
    cutsceneStep: 0,     // 0=appear, 1=walk to door, 2=exit
    cutsceneTimer: 0,
    zoomoutTimer: 0,
    logoY: -200,         // Empieza fuera de pantalla (arriba)
    logoTargetY: 30,
    logoAsset: new Image(),
    introMusic: null,
    pressAnyKeyAlpha: 0,
    pressAnyKeyDir: 1,
    fadeOutAlpha: 0,
    fadingOut: false,
    keyListenerAdded: false,
    loadingDotsTimer: 0,
    loadingDots: '',
    musicStarted: false,

    // Posiciones para la cutscene dentro de casa
    housePlayerStartX: 0,
    housePlayerStartY: 0,
    houseDoorX: 0,
    houseDoorY: 0,

    // Para el zoomout
    zoomStart: 1,
    zoomEnd: 0.15,       // Zoom muy lejano para ver toda la isla
    zoomDuration: 3,     // 3 segundos

    // Para la cutscene de caminar
    walkSpeed: 120,      // px/s
    walkDuration: 0,

    // Flag para saber si el jugador ya salió de la casa
    exitedHouse: false,
};

// Cargar logo
intro.logoAsset.src = 'sprites/hud/logo.png';

// Cargar musica intro
intro.introMusic = new Audio('sfx/music/intromusic.m4a');
intro.introMusic.volume = 0;

// --- PANTALLA DE CARGA ---
function drawLoadingScreen() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Texto "Cargando..."
    intro.loadingDotsTimer += 0.016;
    if (intro.loadingDotsTimer > 0.5) {
        intro.loadingDotsTimer = 0;
        intro.loadingDots += '.';
        if (intro.loadingDots.length > 3) intro.loadingDots = '';
    }

    ctx.save();
    ctx.font = '28px "Tiny5", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.8;
    ctx.fillText('Cargando' + intro.loadingDots, canvas.width / 2, canvas.height / 2);

    // Barra de progreso sutil
    const barW = 200;
    const barH = 4;
    const barX = canvas.width / 2 - barW / 2;
    const barY = canvas.height / 2 + 30;

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(barX, barY, barW, barH);

    // Animación de barra pulsante
    const pulse = (Math.sin(performance.now() * 0.003) + 1) / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(barX, barY, barW * pulse, barH);
    ctx.restore();
}

// --- INICIAR INTRO CUTSCENE ---
function startIntroCutscene() {
    intro.phase = 'cutscene';
    intro.cutsceneStep = 0;
    intro.cutsceneTimer = 0;

    // Generar el interior de la casa para la cutscene
    const insideIslandId = currentIsland + '_inside_intro';
    generateIsland(insideIslandId);

    // Posicionar jugador en medio de la casa
    const centerX = (mapSize / 2) * 64;
    const centerY = (mapSize / 2) * 64;
    player.x = centerX;
    player.y = centerY;
    player.direction = 'forward';
    player.isMoving = false;
    player.frame = 0;

    // Guardar posiciones
    intro.housePlayerStartX = centerX;
    intro.housePlayerStartY = centerY;
    intro.houseDoorX = centerX;
    intro.houseDoorY = (mapSize / 2 + 5) * 64; // Posición de la puerta

    // Calcular duración del caminar
    const dist = Math.hypot(intro.houseDoorX - intro.housePlayerStartX, intro.houseDoorY - intro.housePlayerStartY);
    intro.walkDuration = dist / intro.walkSpeed;

    // Centrar cámara inmediatamente
    camera.x = player.x - canvas.width / 2 + player.width / 2;
    camera.y = player.y - canvas.height / 2 + player.height / 2;
}

// --- ACTUALIZAR INTRO ---
function updateIntro(dt) {
    if (intro.phase === 'loading') {
        // La pantalla de carga se maneja en el draw
        return;
    }

    if (intro.phase === 'cutscene') {
        intro.cutsceneTimer += dt;
        updateIntroCutscene(dt);
        return;
    }

    if (intro.phase === 'zoomout') {
        updateIntroZoomout(dt);
        return;
    }

    if (intro.phase === 'title') {
        updateIntroTitle(dt);
        return;
    }
}

// --- CUTSCENE: Jugador camina hacia la puerta ---
function updateIntroCutscene(dt) {
    if (intro.cutsceneStep === 0) {
        // Paso 0: Esperar 1.5s mirando alrededor
        if (intro.cutsceneTimer > 1.5) {
            intro.cutsceneStep = 1;
            intro.cutsceneTimer = 0;
            player.direction = 'forward';
        }
        return;
    }

    if (intro.cutsceneStep === 1) {
        // Paso 1: Caminar hacia la puerta
        const targetY = intro.houseDoorY;
        const dy = targetY - player.y;

        if (Math.abs(dy) > 5) {
            player.y += intro.walkSpeed * dt;
            player.isMoving = true;
            player.direction = 'forward';

            // Animar frame
            player.frameTimer += dt;
            if (player.frameTimer > player.frameDuration) {
                player.frame = (player.frame + 1) % totalFrames;
                player.frameTimer = 0;
            }

            // Seguir cámara suavemente
            const targetCamX = player.x - canvas.width / 2 + player.width / 2;
            const targetCamY = player.y - canvas.height / 2 + player.height / 2;
            camera.x += (targetCamX - camera.x) * 5 * dt;
            camera.y += (targetCamY - camera.y) * 5 * dt;
        } else {
            // Llegó a la puerta
            player.isMoving = false;
            player.frame = 0;
            intro.cutsceneStep = 2;
            intro.cutsceneTimer = 0;

            // Efecto de fade para "salir" de la casa
            const fadeOverlay = document.getElementById('fade-overlay');
            if (fadeOverlay) fadeOverlay.classList.add('active');

            // Sonido de salir de casa
            if (audioAssets.exitHome) {
                audioAssets.exitHome.currentTime = 0;
                audioAssets.exitHome.play().catch(e => console.log(e));
            }
        }
        return;
    }

    if (intro.cutsceneStep === 2) {
        // Paso 2: Transición a fuera (fade)
        intro.cutsceneTimer += 0; // ya se sumó arriba
        if (intro.cutsceneTimer > 0.5) {
            // Generar isla exterior
            currentIsland = 'home';
            generateIsland(currentIsland);

            // Posicionar jugador fuera de la casa
            if (islandFeatures.house) {
                player.x = islandFeatures.house.x * 64 + 64;
                player.y = islandFeatures.house.y * 64 + 180;
            } else {
                player.x = (mapSize / 2) * 64;
                player.y = (mapSize / 2) * 64;
            }
            player.direction = 'forward';
            player.isMoving = false;
            player.frame = 0;

            // Snappear cámara
            camera.x = player.x - canvas.width / 2 + player.width / 2;
            camera.y = player.y - canvas.height / 2 + player.height / 2;
            camera.zoom = 1;

            // Quitar fade
            const fadeOverlay = document.getElementById('fade-overlay');
            if (fadeOverlay) fadeOverlay.classList.remove('active');

            intro.exitedHouse = true;
            intro.cutsceneStep = 3;
            intro.cutsceneTimer = 0;
        }
        return;
    }

    if (intro.cutsceneStep === 3) {
        // Paso 3: Esperar 0.5 segundos mostrando la isla exterior
        if (intro.cutsceneTimer > 0.5) {
            // Empezar zoomout
            intro.phase = 'zoomout';
            intro.zoomoutTimer = 0;
            intro.zoomStart = camera.zoom;

            // Empezar música con fade in
            if (!intro.musicStarted) {
                intro.introMusic.volume = 0;
                intro.introMusic.play().catch(e => console.log('Intro music error:', e));
                intro.musicStarted = true;
            }
        }
        return;
    }
}

// --- ZOOMOUT: Zoom out a toda la isla ---
function updateIntroZoomout(dt) {
    intro.zoomoutTimer += dt;
    const progress = Math.min(1, intro.zoomoutTimer / intro.zoomDuration);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);

    camera.zoom = intro.zoomStart + (intro.zoomEnd - intro.zoomStart) * eased;

    // Centrar cámara en el centro de la isla
    const islandCenterX = (mapSize / 2) * 64;
    const islandCenterY = (mapSize / 2) * 64;
    const targetCamX = islandCenterX - canvas.width / 2 + 32;
    const targetCamY = islandCenterY - canvas.height / 2 + 32;
    camera.x += (targetCamX - camera.x) * 3 * dt;
    camera.y += (targetCamY - camera.y) * 3 * dt;

    // Fade in de la música
    if (intro.introMusic && intro.musicStarted) {
        const vol = Math.min(musicVolume, intro.introMusic.volume + dt * 0.3);
        intro.introMusic.volume = vol;
    }

    if (progress >= 1) {
        intro.phase = 'title';
        intro.timer = 0;
    }
}

// --- TITLE SCREEN: Logo + Press Any Key ---
function updateIntroTitle(dt) {
    intro.timer += dt;

    // Logo baja desde arriba
    if (intro.logoY < intro.logoTargetY) {
        // Ease out con bounce sutil
        const logoProgress = Math.min(1, intro.timer / 1.5);
        const eased = 1 - Math.pow(1 - logoProgress, 3);
        intro.logoY = -200 + (intro.logoTargetY + 200) * eased;
    }

    // "Press Any Key" parpadeo después de 2s
    if (intro.timer > 2) {
        intro.pressAnyKeyAlpha += intro.pressAnyKeyDir * dt * 1.5;
        if (intro.pressAnyKeyAlpha >= 1) { intro.pressAnyKeyAlpha = 1; intro.pressAnyKeyDir = -1; }
        if (intro.pressAnyKeyAlpha <= 0.2) { intro.pressAnyKeyAlpha = 0.2; intro.pressAnyKeyDir = 1; }
    }

    // Escuchar tecla
    if (!intro.keyListenerAdded && intro.timer > 2) {
        intro.keyListenerAdded = true;

        const handleIntroKey = (e) => {
            if (intro.fadingOut) return;
            intro.fadingOut = true;

            window.removeEventListener('keydown', handleIntroKey);
            window.removeEventListener('mousedown', handleIntroMouseDown);
            window.removeEventListener('touchstart', handleIntroTouchStart);
        };

        const handleIntroMouseDown = () => {
            if (intro.fadingOut) return;
            intro.fadingOut = true;
            window.removeEventListener('keydown', handleIntroKey);
            window.removeEventListener('mousedown', handleIntroMouseDown);
            window.removeEventListener('touchstart', handleIntroTouchStart);
        };

        const handleIntroTouchStart = () => {
            if (intro.fadingOut) return;
            intro.fadingOut = true;
            window.removeEventListener('keydown', handleIntroKey);
            window.removeEventListener('mousedown', handleIntroMouseDown);
            window.removeEventListener('touchstart', handleIntroTouchStart);
        };

        window.addEventListener('keydown', handleIntroKey);
        window.addEventListener('mousedown', handleIntroMouseDown);
        window.addEventListener('touchstart', handleIntroTouchStart);
    }

    // Fade out cuando se presiona una tecla
    if (intro.fadingOut) {
        intro.fadeOutAlpha += dt * 1.5;

        // Fade out música
        if (intro.introMusic) {
            const vol = Math.max(0, intro.introMusic.volume - dt * 0.5);
            intro.introMusic.volume = vol;
        }

        if (intro.fadeOutAlpha >= 1) {
            intro.fadeOutAlpha = 1;
            finishIntro();
        }
    }
}

// --- DIBUJAR INTRO ---
function drawIntro() {
    if (intro.phase === 'loading') {
        drawLoadingScreen();
        return;
    }

    if (intro.phase === 'cutscene') {
        // Dibujar el mundo normalmente (dentro de casa o fuera)
        drawIntroWorld();
        return;
    }

    if (intro.phase === 'zoomout') {
        drawIntroWorld();
        return;
    }

    if (intro.phase === 'title') {
        drawIntroWorld();
        drawIntroTitleOverlay();
        return;
    }
}

// --- DIBUJAR MUNDO EN MODO INTRO ---
function drawIntroWorld() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    drawTiles();

    // Solo dibujar elementos si estamos fuera
    if (intro.exitedHouse) {
        drawTreeShadows();
        drawPalmtreeShadows();
        drawHouseShadow();
        drawPlayerShadows();
    }

    const renderList = [];

    // Jugador
    renderList.push({ y: player.y + player.height, draw: () => drawPlayer() });

    // Solo dibujar árboles/casa si estamos fuera
    if (intro.exitedHouse) {
        treeData.forEach(tree => {
            const sortingY = tree.y * 64 + treeHitbox.yRel + (treeHitbox.h / 2);
            renderList.push({ y: sortingY, draw: () => drawSingleTree(tree, 64) });
        });

        palmtreeData.forEach(tree => {
            const sortingY = tree.y * 64 + treeHitbox.yRel + (treeHitbox.h / 2);
            renderList.push({ y: sortingY, draw: () => drawSinglePalmtree(tree, 64) });
        });

        if (islandFeatures.house) {
            const hx = islandFeatures.house.x * 64;
            const hy = islandFeatures.house.y * 64;
            renderList.push({ y: hy + 80, draw: () => drawHouse(hx - camera.x, hy - camera.y) });
        }

        if (islandFeatures.dock) {
            const dx = islandFeatures.dock.x * 64;
            const dy = islandFeatures.dock.y * 64;
            renderList.push({ y: dy + 32, draw: () => drawDock(dx - camera.x, dy - camera.y) });
        }

        // Avión
        const airplaneY = planeY * 64 + 64;
        renderList.push({ y: airplaneY, draw: () => drawAirplane(planeX * 64 - camera.x, planeY * 64 - camera.y) });
    } else {
        // Dentro de la casa - dibujar puerta interior
        const doorY = (mapSize / 2 + 5) * 64;
        const doorX = (mapSize / 2) * 64;
        renderList.push({ y: doorY + 64, draw: () => drawInsideDoor(doorX - camera.x, doorY - camera.y) });
    }

    renderList.sort((a, b) => a.y - b.y);
    renderList.forEach(item => item.draw());

    ctx.restore();

    // Efecto de día (para que no sea totalmente oscuro)
    // No aplicar efecto de noche durante intro
}

// --- OVERLAY DEL TÍTULO ---
function drawIntroTitleOverlay() {
    // Viñeta/overlay oscuro sutil
    ctx.save();
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.height * 0.3,
        canvas.width / 2, canvas.height / 2, canvas.height * 0.8
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Logo
    if (intro.logoAsset.complete && intro.logoAsset.naturalWidth > 0) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const logoScale = 4; // Escalar el logo x4 para que se vea bien
        const logoW = intro.logoAsset.naturalWidth * logoScale;
        const logoH = intro.logoAsset.naturalHeight * logoScale;
        const logoX = canvas.width / 2 - logoW / 2;

        ctx.drawImage(intro.logoAsset, logoX, intro.logoY, logoW, logoH);
        ctx.restore();
    }

    // "Press Any Key"
    if (intro.timer > 2) {
        ctx.save();
        ctx.globalAlpha = intro.pressAnyKeyAlpha;
        ctx.font = '24px "Tiny5", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText('Press Any Key', canvas.width / 2, canvas.height - 60);
        ctx.restore();
    }

    // Fade out negro
    if (intro.fadingOut && intro.fadeOutAlpha > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${intro.fadeOutAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
}

// --- FINALIZAR INTRO ---
function finishIntro() {
    intro.phase = 'done';

    // Parar musica de intro
    if (intro.introMusic) {
        intro.introMusic.pause();
        intro.introMusic.currentTime = 0;
    }

    // Resetear zoom y cámara
    camera.zoom = 1;
    camera.targetZoom = 1;

    // Regenerar isla home con la semilla del usuario
    currentIsland = 'home';
    if (multiplayer.currentIslandOwnerUid) {
        generateIsland(currentIsland);
    } else {
        generateIsland(currentIsland);
    }

    // Posicionar jugador en centro
    player.x = (mapSize / 2) * 64;
    player.y = (mapSize / 2) * 64;
    player.direction = 'forward';
    player.isMoving = false;
    player.frame = 0;

    // Snap cámara
    camera.x = player.x - canvas.width / 2 + player.width / 2;
    camera.y = player.y - canvas.height / 2 + player.height / 2;

    // Restaurar visibilidad del HUD
    document.getElementById('coins-hud').style.display = '';
    document.getElementById('minimap-container').style.display = '';
    document.getElementById('inventory-hud').style.display = '';
    document.getElementById('chat-hud').style.display = '';
    document.getElementById('voice-status').style.display = '';
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) settingsBtn.style.display = '';

    // Manejar estado de autenticación
    if (multiplayer.userId) {
        // Ya está logueado
        document.getElementById('auth-menu').style.display = '';
        document.getElementById('auth-menu').classList.add('hidden');
        if (settingsBtn) settingsBtn.classList.remove('hidden');

        // Verificar si tiene skin guardado
        const cached = skinCaches[skinColor];
        if (cached || skinColor !== '#ffdbac') {
            // Tiene skin guardado, ir directo a jugar
            skinMenu.classList.add('hidden');
            gameState = 'playing';
        } else {
            // Sin skin guardado, mostrar selector
            skinMenu.classList.remove('hidden');
            gameState = 'customizing';
        }
    } else {
        // No logueado, mostrar auth
        document.getElementById('auth-menu').style.display = '';
        document.getElementById('auth-menu').classList.remove('hidden');
        gameState = 'intro'; // Esperar a que se loguee
    }
}

