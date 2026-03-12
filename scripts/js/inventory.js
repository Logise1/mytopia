window.toggleInventory = toggleInventory;
window.updateCharacterPreview = updateCharacterPreview;

function toggleInventory() {
    const invMenu = document.getElementById('inventory-menu');
    if (!invMenu) return;

    invMenu.classList.toggle('hidden');
    
    if (!invMenu.classList.contains('hidden')) {
        updateCharacterPreview();
        // Set username in preview
        const nameTag = invMenu.querySelector('.char-name-tag');
        if (nameTag) nameTag.innerText = multiplayer.username || "Mytopiano";
    }
}

function updateCharacterPreview() {
    const previewCanvas = document.getElementById('character-preview-canvas');
    if (!previewCanvas || document.getElementById('inventory-menu').classList.contains('hidden')) return;
    
    const pCtx = previewCanvas.getContext('2d');
    pCtx.imageSmoothingEnabled = false;
    pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    // Get animations for current skin
    const animSet = getSkinAnimations(skinColor);
    const anim = animSet['forward']; 
    
    // Usar el frame actual del jugador para que esté animado
    const currentFrame = Math.floor(player.frame) % 6;
    const frameData = anim ? anim[currentFrame] : null;

    if (frameData && (frameData.processed || frameData.original)) {
        const img = frameData.processed || frameData.original;
        
        // Mantener relación de aspecto correcta (no aplastar)
        let baseHeight = 64;
        let baseWidth = 64;
        
        if (frameData.original) {
            const aspect = frameData.original.width / frameData.original.height;
            baseWidth = baseHeight * aspect;
        }

        // Escalar para el preview
        const scale = 2.2;
        const dw = baseWidth * scale;
        const dh = baseHeight * scale;
        
        // Efecto de bounce ligero (opcional, para que se vea "vivo")
        const bounce = Math.sin(performance.now() * 0.005) * 5;
        
        const dx = (previewCanvas.width - dw) / 2;
        const dy = (previewCanvas.height - dh) / 2 + bounce;
        
        pCtx.drawImage(img, dx, dy, dw, dh);
    } else {
        // Fallback: Piel
        pCtx.fillStyle = skinColor || '#ffdbac';
        pCtx.beginPath();
        pCtx.arc(previewCanvas.width/2, previewCanvas.height/2, 44, 0, Math.PI * 2);
        pCtx.fill();
    }
}

// Add hotkey listener
window.addEventListener('keydown', e => {
    if (e.code === 'KeyL') {
        // Don't open if in menus that block gameplay where typing might happen
        const isTyping = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';
        if (!isTyping) {
            toggleInventory();
        }
    }
});
