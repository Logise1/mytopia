// --- SISTEMA DE VIAJES ---
function openTravelMenu() {
    document.getElementById('travel-menu').classList.remove('hidden');
    document.getElementById('travel-progress-ui').classList.add('hidden');
    
    // Check if friends were already set in localstorage
    const lsFriends = localStorage.getItem('mytopianFriends');
    if (lsFriends && !hasSetFriends) {
        hasSetFriends = true;
        mytopianFriends = JSON.parse(lsFriends);
    }

    if (!hasSetFriends) {
        document.getElementById('friends-setup').classList.remove('hidden');
        document.getElementById('travel-selection').classList.add('hidden');
    } else {
        document.getElementById('friends-setup').classList.add('hidden');
        document.getElementById('travel-selection').classList.remove('hidden');
        refreshOtherIslandsList();
    }
    
    document.getElementById('save-friends-btn').onclick = () => {
        const text = document.getElementById('friends-input').value;
        if (text.trim().length > 0) {
            mytopianFriends = text.split(',').map(n => n.trim()).filter(n => n.length > 0);
            hasSetFriends = true;
            localStorage.setItem('mytopianFriends', JSON.stringify(mytopianFriends));
            document.getElementById('friends-setup').classList.add('hidden');
            document.getElementById('travel-selection').classList.remove('hidden');
            refreshOtherIslandsList();
        }
    };
    
    document.getElementById('close-friends-btn').onclick = () => {
        document.getElementById('travel-menu').classList.add('hidden');
    };

    document.getElementById('go-home-btn').onclick = () => startTravel('home');
    document.getElementById('go-central-btn').onclick = () => startTravel('central');
    document.getElementById('close-travel-btn').onclick = () => {
        document.getElementById('travel-menu').classList.add('hidden');
    };
}

function refreshOtherIslandsList() {
    const list = document.getElementById('other-islands-list');
    list.innerHTML = '';
    
    if (mytopianFriends.length === 0) {
        list.innerHTML = '<p>No has añadido amigos.</p>';
        return;
    }
    
    mytopianFriends.forEach(friend => {
        let btn = document.createElement('button');
        btn.className = 'travel-btn';
        btn.innerText = `🏝️ Isla de ${friend}`;
        btn.onclick = () => startTravel(friend.toLowerCase());
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
    menuEl.classList.add('hidden');
    menuEl.classList.remove('cabin-mode');
    
    // El jugador sale en la arena cerca del avion (que esta en el agua)
    player.x = planeX * 64;
    player.y = (planeY - 2) * 64; 
    
    // Forzar actualización inmediata a red sobre nuestro cambio de isla
    multiplayer.lastSend = 0; 
    multiplayer.players = {}; // Limpiar estado de red anterior
    sendMovement();
}

