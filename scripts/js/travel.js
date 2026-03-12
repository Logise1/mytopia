// --- SISTEMA DE VIAJES ---
function openTravelMenu() {
    document.getElementById('travel-menu').classList.remove('hidden');
    document.getElementById('travel-progress-ui').classList.add('hidden');
    
    // En lugar de usar mytopianFriends del localStorage, usamos los de multiplayer
    document.getElementById('travel-selection').classList.remove('hidden');
    refreshOtherIslandsList();

    
    // Ya no necesitamos lógica de configuración manual de amigos aquí


    document.getElementById('go-home-btn').onclick = () => startTravel('home');
    document.getElementById('go-central-btn').onclick = () => startTravel('central');
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
        btn.onclick = () => startTravel(userData.username.toLowerCase());
        list.appendChild(btn);
    });
}

function startTravel(targetId) {
    if (targetIslandIsSame(targetId)) {
        alert("¡Ya estás en esa isla!"); return;
    }

    targetTravelIsland = targetId;
    isTraveling = true;
    travelTimer = 0.01;
    gameState = 'traveling';
    
    document.getElementById('travel-selection').classList.add('hidden');
    document.getElementById('travel-progress-ui').classList.remove('hidden');
    document.getElementById('flight-bar').style.width = '0%';
}

function targetIslandIsSame(targetId) {
    if (currentIsland === 'home' && targetId === 'home') return true;
    if (currentIsland === targetId) return true;
    return false;
}

function completeTravel() {
    isTraveling = false;
    travelTimer = 0;
    gameState = 'playing';
    currentIsland = targetTravelIsland;
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
}

