window.toggleInventory = toggleInventory;
window.updateCharacterPreview = updateCharacterPreview;
window.renderInventory = renderInventory;

const itemData = {
    rod: { name: "Caña de Pescar", icon: "sprites/textures/fishing_rod_icon.png", description: "Úsala cerca del agua para pescar.", sellPrice: 0 },
    fish: { name: "Pez", icon: "sprites/textures/fish_icon.png", description: "Un pez fresco. Se puede vender.", sellPrice: 50 }
};

function toggleInventory() {
    const invMenu = document.getElementById('inventory-menu');
    if (!invMenu) return;

    invMenu.classList.toggle('hidden');
    
    if (!invMenu.classList.contains('hidden')) {
        updateCharacterPreview();
        renderInventory();
        document.getElementById('player-name-inv').innerText = (multiplayer.username || "Mytopiano").toUpperCase();
        document.getElementById('coin-count-inv').innerText = coinCount;
    }
}

function renderInventory() {
    const grid = document.getElementById('main-inventory-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // 27 slots (9x3) al estilo Minecraft
    for (let i = 0; i < 27; i++) {
        const slot = document.createElement('div');
        slot.className = 'inv-slot';
        
        const item = inventory[i];
        if (item) {
            const data = itemData[item.type];
            if (data) {
                const img = document.createElement('img');
                img.src = data.icon;
                slot.appendChild(img);
                
                if (item.type === 'rod' && fishing.rodEquipped) {
                    slot.classList.add('equipped');
                }

                slot.onclick = () => showItemDetails(item, i);
            }
        }
        grid.appendChild(slot);
    }
}

function showItemDetails(item, index) {
    const detailsBox = document.getElementById('item-details');
    const data = itemData[item.type];
    
    detailsBox.innerHTML = `
        <h3>${data.name}</h3>
        <p>${data.description}</p>
    `;

    if (item.type === 'rod') {
        const equipBtn = document.createElement('button');
        equipBtn.className = 'sell-btn'; // Reutilizamos estilo
        equipBtn.innerText = fishing.rodEquipped ? 'Desequipar' : 'Equipar';
        equipBtn.onclick = () => {
            fishing.rodEquipped = !fishing.rodEquipped;
            renderInventory();
            showItemDetails(item, index);
        };
        detailsBox.appendChild(equipBtn);
    } else if (data.sellPrice > 0) {
        const sellBtn = document.createElement('button');
        sellBtn.className = 'sell-btn';
        sellBtn.innerText = `Vender por ${data.sellPrice} 🪙`;
        sellBtn.onclick = () => {
            coinCount += data.sellPrice;
            inventory.splice(index, 1);
            document.getElementById('coin-count').innerText = coinCount;
            document.getElementById('coin-count-inv').innerText = coinCount;
            renderInventory();
            detailsBox.innerHTML = '<p class="empty-msg">Selecciona un objeto</p>';
            saveFurniture(); // Guardar cambios en la nube
        };
        detailsBox.appendChild(sellBtn);
    }
}

function updateCharacterPreview() {
    const previewCanvas = document.getElementById('character-preview-canvas');
    if (!previewCanvas || document.getElementById('inventory-menu').classList.contains('hidden')) return;
    
    const pCtx = previewCanvas.getContext('2d');
    pCtx.imageSmoothingEnabled = false;
    pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    const animSet = getSkinAnimations(skinColor);
    const anim = animSet['forward']; 
    const currentFrame = Math.floor(player.frame) % 6;
    const frameData = anim ? anim[currentFrame] : null;

    if (frameData && (frameData.processed || frameData.original)) {
        const img = frameData.processed || frameData.original;
        const scale = 2.2;
        const dw = 64 * scale;
        const dh = 64 * scale;
        const bounce = Math.sin(performance.now() * 0.005) * 5;
        const dx = (previewCanvas.width - dw) / 2;
        const dy = (previewCanvas.height - dh) / 2 + bounce;
        pCtx.drawImage(img, dx, dy, dw, dh);
    }
}

window.addEventListener('keydown', e => {
    if (e.code === 'KeyL') {
        const isTyping = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';
        if (!isTyping) toggleInventory();
    }
});
