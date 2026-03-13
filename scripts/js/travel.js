// --- SISTEMA DE VIAJES ---
function openTravelMenu() {
    document.getElementById('travel-menu').classList.remove('hidden');
    document.getElementById('travel-progress-ui').classList.add('hidden');
    
    // En lugar de usar mytopianFriends del localStorage, usamos los de multiplayer
    document.getElementById('travel-selection').classList.remove('hidden');
    refreshOtherIslandsList();

    
    // Ya no necesitamos lógica de configuración manual de amigos aquí


    document.getElementById('go-home-btn').onclick = () => startTravel('home', multiplayer.userId);
    document.getElementById('go-central-btn').onclick = () => startTravel('central', 'world');
    document.getElementById('close-travel-btn').onclick = () => {
        document.getElementById('travel-menu').classList.add('hidden');
    };
}

function refreshOtherIslandsList() {
    const list = document.getElementById('other-islands-list');
    list.innerHTML = '';
    
    // Usamos multiplayer.friends y los datos de multiplayer.allUsers
    if (!multiplayer.friends || multiplayer.friends.length === 0) {
        list.innerHTML = '<p style="font-size:12px; opacity:0.7;">No tienes amigos agregados (Usa la Q).</p>';
        return;
    }
    
    multiplayer.friends.forEach(fUid => {
        const userData = multiplayer.allUsers[fUid];
        if (!userData) return;
        
        let btn = document.createElement('button');
        btn.className = 'travel-btn';
        btn.innerText = `🏝️ Isla de ${userData.username}`;
        // Para viajar usamos el username o el UID dependiendo de cómo esté montado el generador
        btn.onclick = () => startTravel(userData.username.toLowerCase(), fUid);
        list.appendChild(btn);
    });
}

function startTravel(targetId, ownerUid) {
    if (targetIslandIsSame(targetId)) {
        alert("¡Ya estás en esa isla!"); return;
    }

    // Ocultar primero el panel de selección de viaje para dejar todo limpio
    document.getElementById('travel-selection').classList.add('hidden');

    // 1. Efecto Fade y Sonido de Despegue
    const fadeOverlay = document.getElementById('fade-overlay');
    if (fadeOverlay) {
        fadeOverlay.classList.add('active'); // Fundir a negro
    }
    
    if (audioAssets.takeoffPlane) {
        audioAssets.takeoffPlane.currentTime = 0;
        audioAssets.takeoffPlane.play().catch(e => console.log(e));
    }
    
    // Parar el ambiente de noche y reproducir ambiente de avion
    if (audioAssets.ambience && !audioAssets.ambience.paused) {
        audioAssets.ambience.pause();
    }
    
    // Si la música de día está sonando, hacerle un fade out suave
    if (audioAssets.dayMusic && !audioAssets.dayMusic.paused) {
        // En lugar de pararlo seco, bajamos el volumen dinámicamente en update, 
        // pero podemos iniciar el proceso o simplemente simular un fade aquí con setInterval
        let fadeInterval = setInterval(() => {
            if (audioAssets.dayMusic.volume > 0.05) {
                audioAssets.dayMusic.volume -= 0.05;
            } else {
                audioAssets.dayMusic.pause();
                audioAssets.dayMusic.volume = musicVolume; // restaurar al valor del slider
                clearInterval(fadeInterval);
            }
        }, 100);
    }
    
    if (audioAssets.planeAmbience) {
        audioAssets.planeAmbience.loop = true;
        // Iniciar el ambiente de avion con volumen 0 para el crossfade posterior
        audioAssets.planeAmbience.currentTime = 0;
        audioAssets.planeAmbience.volume = 0;
        audioAssets.planeAmbience.play().catch(e => console.log(e));
    }

    // 2. Transición lógica con pequeño retraso para que de tiempo a fundido
    setTimeout(() => {
        targetTravelIsland = targetId;
        targetTravelOwner = ownerUid;
        isTraveling = true;
        travelTimer = 0.01;
        gameState = 'traveling';
        
        document.getElementById('travel-progress-ui').classList.remove('hidden');
        document.getElementById('flight-bar').style.width = '0%';
        
        // 3. Volver a aclarar la vista 
        if (fadeOverlay) {
            fadeOverlay.classList.remove('active');
        }
    }, 500); // 0.5s de fade para el despegue (opcional ajustar)
}

function targetIslandIsSame(targetId) {
    if (currentIsland === 'home' && targetId === 'home') return true;
    if (currentIsland === targetId) return true;
    return false;
}

function completeTravel() {
    // 1. Efecto Fade de Aterrizaje
    const fadeOverlay = document.getElementById('fade-overlay');
    if (fadeOverlay) {
        fadeOverlay.classList.add('active'); // Fundir a negro
    }
    
    // Parar ambiente de avion y tocar aterrizaje
    if (audioAssets.planeAmbience && !audioAssets.planeAmbience.paused) {
        audioAssets.planeAmbience.pause();
    }
    if (audioAssets.takeoffPlane && !audioAssets.takeoffPlane.paused) {
        audioAssets.takeoffPlane.pause();
    }
    // landPlane ahora se lanza desde update.js cruzado con el ambiente, 
    // así que no lo iniciamos aquí, dejamos que termine de sonar de fondo.

    // Retardo durante el fundido
    setTimeout(() => {
        isTraveling = false;
        travelTimer = 0;
        gameState = 'playing';
        currentIsland = targetTravelIsland;
        multiplayer.currentIslandOwnerUid = targetTravelOwner;
        const menuEl = document.getElementById('travel-menu');
        if (menuEl) {
            menuEl.classList.add('hidden');
            menuEl.classList.remove('cabin-mode');
            // Asegurar que las sub-ventanas del menú también se oculten
            document.getElementById('travel-selection').classList.add('hidden');
            document.getElementById('travel-progress-ui').classList.add('hidden');
        }
        
        // El jugador sale en la arena cerca del avion (que esta en el agua)
        player.x = planeX * 64;
        player.y = (planeY - 2) * 64; 
        
        // Forzar actualización inmediata a red sobre nuestro cambio de isla
        multiplayer.lastSend = 0; 
        multiplayer.players = {}; // Limpiar estado de red anterior
        sendMovement();
        listenToIslandChat();

        // 3. Volver a aclarar
        if (fadeOverlay) {
            fadeOverlay.classList.remove('active');
        }
    }, 500); // 0.5s en negro como transición (igual que el takeoff)
}

