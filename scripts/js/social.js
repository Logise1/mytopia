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

    // Cargar amigos de Firestore al iniciar (esto se llama desde firebase.js)
    window.loadFriends = async (uid) => {
        try {
            const docSnap = await fb.getDoc(fb.doc(fs, "users", uid));
            if (docSnap.exists() && docSnap.data().friends) {
                multiplayer.friends = docSnap.data().friends;
                updateFriendsUI();
            }
        } catch (e) {
            console.error("Error cargando amigos:", e);
        }
    };

    socialMenu.classList.remove('hidden');
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
