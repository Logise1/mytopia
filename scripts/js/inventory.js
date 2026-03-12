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
    if (!previewCanvas) return;
    const pCtx = previewCanvas.getContext('2d');
    pCtx.imageSmoothingEnabled = false;
    pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    // Get animations for current skin
    const animSet = getSkinAnimations(skinColor);
    const anim = animSet['forward']; // Always show forward in preview
    const frameData = anim ? anim[0] : null;

    if (frameData && (frameData.processed || frameData.original)) {
        const img = frameData.processed || frameData.original;
        
        // Center and scale up in preview
        const scale = 2;
        const dw = 64 * scale;
        const dh = 64 * scale;
        const dx = (previewCanvas.width - dw) / 2;
        const dy = (previewCanvas.height - dh) / 2;
        
        pCtx.drawImage(img, dx, dy, dw, dh);
    } else {
        // Fallback robusto: círculo con el color de piel
        pCtx.fillStyle = skinColor || '#ffdbac';
        pCtx.beginPath();
        pCtx.arc(previewCanvas.width/2, previewCanvas.height/2, 44, 0, Math.PI * 2);
        pCtx.fill();
        
        // Ojos
        pCtx.fillStyle = '#000000';
        pCtx.fillRect(previewCanvas.width/2 - 15, previewCanvas.height/2 - 10, 8, 8);
        pCtx.fillRect(previewCanvas.width/2 + 7, previewCanvas.height/2 - 10, 8, 8);
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
