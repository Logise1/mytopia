function initSocial() {
    const addBtn = document.getElementById('add-friend-btn');
    const searchInput = document.getElementById('friend-search-input');
    const friendsListEl = document.getElementById('friends-list');
    const socialMenu = document.getElementById('social-menu');

    // Escuchar a TODOS los usuarios para poder añadirlos y ver su estado
    const playersRef = fb.ref(db, 'players');
    fb.onValue(playersRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        multiplayer.allUsers = data;
        updateFriendsUI();
    });

    if (!addBtn) return;

    addBtn.onclick = () => {
        const nameToAdd = searchInput.value.trim();
        if (!nameToAdd) return;

        // Buscar el UID por el nombre
        let foundUid = null;
        for(let uid in multiplayer.allUsers) {
            if (multiplayer.allUsers[uid].username === nameToAdd) {
                foundUid = uid;
                break;
            }
        }

        if (foundUid && foundUid !== multiplayer.userId) {
            if (!multiplayer.friends.includes(foundUid)) {
                multiplayer.friends.push(foundUid);
                saveFriendsToFirestore();
                searchInput.value = "";
            }
        } else {
            alert("No se encontró al usuario o eres tú mismo.");
        }
    };

    window.loadFriends = async (uid) => {
        try {
            const docSnap = await fb.getDoc(fb.doc(fs, "users", uid));
            if (docSnap.exists()) {
                multiplayer.friends = docSnap.data().friends || [];
                updateFriendsUI();
                
                // Si es la primera vez que entra (no tiene amigos en BD), le añadimos a TODOS
                if (!docSnap.data().friends || docSnap.data().friends.length === 0) {
                    console.log("Primer inicio: Agregando a todos los ciudadanos de Mytopia...");
                    const idsToAdd = Object.keys(multiplayer.allUsers).filter(id => id !== multiplayer.userId);
                    if (idsToAdd.length > 0) {
                        multiplayer.friends = idsToAdd;
                        saveFriendsToFirestore();
                    }
                }
            } else {
                // Si el documento ni siquiera existe, también lo tratamos como inicio limpio
                multiplayer.friends = [];
            }
        } catch (e) {
            console.error("Error cargando amigos:", e);
        }
    };

    updateFriendsUI();
}

async function saveFriendsToFirestore() {
    if (!multiplayer.userId) return;
    try {
        await fb.setDoc(fb.doc(fs, "users", multiplayer.userId), {
            friends: multiplayer.friends
        }, { merge: true });
        updateFriendsUI();
    } catch (e) {
        console.error("Error guardando amigos:", e);
    }
}

function updateFriendsUI() {
    const friendsListEl = document.getElementById('friends-list');
    if (!friendsListEl) return;

    friendsListEl.innerHTML = "";

    multiplayer.friends.forEach(fUid => {
        const userData = multiplayer.allUsers[fUid];
        if (!userData) return;

        const item = document.createElement('div');
        item.className = 'friend-item';

        const name = document.createElement('span');
        name.className = 'friend-name';
        name.innerText = userData.username || "Jugador";

        const status = document.createElement('span');
        status.className = 'friend-status';
        status.innerText = "Actividad: " + (userData.status || "Explorando");

        const island = document.createElement('span');
        island.className = 'friend-island';
        island.innerText = "En: " + (userData.island || "home");

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-friend-btn';
        removeBtn.innerText = "Borrar";
        removeBtn.onclick = () => {
            multiplayer.friends = multiplayer.friends.filter(id => id !== fUid);
            saveFriendsToFirestore();
        };

        item.appendChild(name);
        item.appendChild(status);
        item.appendChild(island);
        item.appendChild(removeBtn);
        friendsListEl.appendChild(item);
    });
}

// Actualizar nuestro propio estado cada cierto tiempo o al cambiar de isla
function updateMySocialStatus(status = null) {
    if (status) multiplayer.status = status;
    // Esto se envía en sendMovement() en firebase.js
}
