// --- SISTEMA DE VIAJES ---
function openTravelMenu() {
    document.getElementById('travel-menu').classList.remove('hidden');
    document.getElementById('travel-selection').classList.remove('hidden');
    document.getElementById('travel-progress-ui').classList.add('hidden');
    refreshOtherIslandsList();
    
    document.getElementById('go-home-btn').onclick = () => startTravel('home');
    document.getElementById('go-central-btn').onclick = () => startTravel('central');
    document.getElementById('close-travel-btn').onclick = () => {
        document.getElementById('travel-menu').classList.add('hidden');
    };
}

function refreshOtherIslandsList() {
    const list = document.getElementById('other-islands-list');
    list.innerHTML = '';
    // Buscar usuarios únicos en el registro local
    const uids = Object.keys(multiplayer.players);
    if (uids.length === 0) list.innerHTML = '<p>No hay nadie más online ahora mismo.</p>';
    
    // Por motivos de la demo y Firebase en vivo, podríamos hacer una query a 'players', pero ya lo tenemos localmente si están en nuestra isla. Si están en otra isla, no los vemos en multiplayer.players por el filtrado.
    // Cambiemos esto a consultar Firebase 'players' directo para ver todas las islas activas:
    fb.getDoc(fb.doc(fs, "users", multiplayer.userId)) // (Como workaround para consultar usuarios, usaremos solo los reportados o uno manual).
    // Mejor obtener directamente de realtime db
    fb.onValue(fb.ref(db, 'players'), (snapshot) => {
        const data = snapshot.val();
        list.innerHTML = '';
        if (!data) return;
        
        for (let uid in data) {
            if (uid === multiplayer.userId) continue;
            let btn = document.createElement('button');
            btn.className = 'travel-btn';
            btn.innerText = `🏝️ Isla de ${data[uid].username || 'Desconocido'}`;
            btn.onclick = () => startTravel(data[uid].island === 'home' ? uid : data[uid].island);
            list.appendChild(btn);
        }
    }, { onlyOnce: true });
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
    document.getElementById('travel-menu').classList.add('hidden');
    
    // Regenerar la nueva isla para esta ubicación
    generateIsland(currentIsland);

    // Teletransportar frente al avión
    player.x = planeX * 64 + 32;
    player.y = (planeY + 1) * 64; 
    
    // Forzar actualización inmediata a red sobre nuestro cambio de isla
    multiplayer.lastSend = 0; 
    multiplayer.players = {}; // Limpiar estado de red anterior
    sendMovement();
}

