// ============================================
// MOBILE CONTROLS - Joystick & Action Buttons
// ============================================

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
    || ('ontouchstart' in window) 
    || (navigator.maxTouchPoints > 0);

// --- JOYSTICK STATE ---
const joystick = {
    active: false,
    touchId: null,
    baseX: 0,
    baseY: 0,
    stickX: 0,
    stickY: 0,
    dx: 0, // Normalized -1 to 1
    dy: 0, // Normalized -1 to 1
    radius: 55, // Max stick distance from center
    deadzone: 0.15
};

// --- MOBILE INPUT STATE ---
const mobileInput = {
    up: false,
    down: false,
    left: false,
    right: false,
    action: false,  // Enter/X equivalent
    sprint: false,   // Ctrl equivalent
    emote1: false,
    emote2: false
};

// Track button touches separately from joystick
const buttonTouches = {};

function initMobileControls() {
    if (!isMobile) return;

    // Force landscape hint
    document.body.classList.add('mobile-mode');

    // Create mobile UI container
    const mobileUI = document.createElement('div');
    mobileUI.id = 'mobile-controls';
    mobileUI.innerHTML = `
        <div id="joystick-zone">
            <div id="joystick-base">
                <div id="joystick-stick"></div>
            </div>
        </div>
        <div id="mobile-buttons">
            <button id="btn-action" class="mobile-btn action-btn">
                <span class="btn-icon">✋</span>
                <span class="btn-label">Acción</span>
            </button>
            <button id="btn-sprint" class="mobile-btn sprint-btn">
                <span class="btn-icon">⚡</span>
                <span class="btn-label">Correr</span>
            </button>
            <div id="mobile-emote-row">
                <button id="btn-emote1" class="mobile-btn emote-btn">💃</button>
                <button id="btn-emote2" class="mobile-btn emote-btn">🎬</button>
            </div>
        </div>
        <div id="mobile-top-buttons">
            <button id="btn-chat-mobile" class="mobile-top-btn">💬</button>
            <button id="btn-social-mobile" class="mobile-top-btn">👥</button>
            <button id="btn-settings-mobile" class="mobile-top-btn">⚙️</button>
        </div>
    `;
    document.getElementById('game-container').appendChild(mobileUI);

    // --- JOYSTICK TOUCH HANDLING ---
    const joystickZone = document.getElementById('joystick-zone');
    const joystickBase = document.getElementById('joystick-base');
    const joystickStick = document.getElementById('joystick-stick');

    joystickZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (joystick.active) return; // Only one joystick finger
        
        const touch = e.changedTouches[0];
        joystick.active = true;
        joystick.touchId = touch.identifier;

        // Position the base where the finger touched
        const rect = joystickZone.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        joystick.baseX = x;
        joystick.baseY = y;
        joystick.stickX = x;
        joystick.stickY = y;

        joystickBase.style.left = x + 'px';
        joystickBase.style.top = y + 'px';
        joystickBase.style.opacity = '1';
        joystickBase.style.transform = 'translate(-50%, -50%) scale(1)';
        
        joystickStick.style.left = '50%';
        joystickStick.style.top = '50%';
    }, { passive: false });

    joystickZone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === joystick.touchId) {
                const rect = joystickZone.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;

                let dx = x - joystick.baseX;
                let dy = y - joystick.baseY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Clamp to radius
                if (dist > joystick.radius) {
                    dx = (dx / dist) * joystick.radius;
                    dy = (dy / dist) * joystick.radius;
                }

                joystick.stickX = joystick.baseX + dx;
                joystick.stickY = joystick.baseY + dy;

                // Normalized values (-1 to 1)
                joystick.dx = dx / joystick.radius;
                joystick.dy = dy / joystick.radius;

                // Apply deadzone
                const magnitude = Math.sqrt(joystick.dx * joystick.dx + joystick.dy * joystick.dy);
                if (magnitude < joystick.deadzone) {
                    joystick.dx = 0;
                    joystick.dy = 0;
                }

                // Update visuals
                const stickOffsetX = dx;
                const stickOffsetY = dy;
                joystickStick.style.left = `calc(50% + ${stickOffsetX}px)`;
                joystickStick.style.top = `calc(50% + ${stickOffsetY}px)`;

                // Update mobile input directions
                updateJoystickDirections();
                break;
            }
        }
    }, { passive: false });

    const endJoystick = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joystick.touchId) {
                joystick.active = false;
                joystick.touchId = null;
                joystick.dx = 0;
                joystick.dy = 0;

                joystickBase.style.opacity = '0.4';
                joystickBase.style.transform = 'translate(-50%, -50%) scale(0.8)';
                joystickStick.style.left = '50%';
                joystickStick.style.top = '50%';

                // Clear all directional inputs
                mobileInput.up = false;
                mobileInput.down = false;
                mobileInput.left = false;
                mobileInput.right = false;
                
                // Clear keyboard keys too
                keys['KeyW'] = false;
                keys['KeyS'] = false;
                keys['KeyA'] = false;
                keys['KeyD'] = false;
                break;
            }
        }
    };

    joystickZone.addEventListener('touchend', endJoystick, { passive: false });
    joystickZone.addEventListener('touchcancel', endJoystick, { passive: false });

    // --- ACTION BUTTONS ---
    setupButtonTouch('btn-action', () => {
        keys['Enter'] = true;
        mobileInput.action = true;
    }, () => {
        keys['Enter'] = false;
        mobileInput.action = false;
    });

    setupButtonTouch('btn-sprint', () => {
        keys['ControlLeft'] = true;
        mobileInput.sprint = true;
    }, () => {
        keys['ControlLeft'] = false;
        mobileInput.sprint = false;
    });

    setupButtonTouch('btn-emote1', () => {
        keys['Digit1'] = true;
        mobileInput.emote1 = true;
    }, () => {
        keys['Digit1'] = false;
        mobileInput.emote1 = false;
    });

    setupButtonTouch('btn-emote2', () => {
        keys['Digit2'] = true;
        mobileInput.emote2 = true;
    }, () => {
        keys['Digit2'] = false;
        mobileInput.emote2 = false;
    });

    // --- TOP BAR BUTTONS ---
    document.getElementById('btn-chat-mobile').addEventListener('touchstart', (e) => {
        e.preventDefault();
        const chatInput = document.getElementById('chat-input');
        if (chatInput) chatInput.focus();
    });

    document.getElementById('btn-social-mobile').addEventListener('touchstart', (e) => {
        e.preventDefault();
        const socialMenu = document.getElementById('social-menu');
        if (socialMenu) socialMenu.classList.toggle('hidden');
    });

    document.getElementById('btn-settings-mobile').addEventListener('touchstart', (e) => {
        e.preventDefault();
        const settingsMenu = document.getElementById('settings-menu');
        if (settingsMenu) settingsMenu.classList.toggle('hidden');
    });

    // --- PREVENT DEFAULT ON CANVAS TO AVOID SCROLLING ---
    canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    // --- CANVAS TOUCH FOR FURNITURE / PHOTO WALL ---
    canvas.addEventListener('touchstart', handleCanvasTouch, { passive: false });
    canvas.addEventListener('touchmove', handleCanvasMove, { passive: false });
    canvas.addEventListener('touchend', handleCanvasEnd, { passive: false });

    // Resize canvas for mobile
    resizeForMobile();
    window.addEventListener('resize', resizeForMobile);
    window.addEventListener('orientationchange', () => {
        setTimeout(resizeForMobile, 300);
    });

    // Hide desktop-only elements on mobile
    const inventoryHud = document.getElementById('inventory-hud');
    if (inventoryHud) inventoryHud.style.display = 'none'; // Mobile has top buttons instead

    console.log('[Mobile] Controls initialized');
}

function setupButtonTouch(btnId, onDown, onUp) {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.classList.add('pressed');
        onDown();
    }, { passive: false });

    btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.classList.remove('pressed');
        onUp();
    }, { passive: false });

    btn.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        btn.classList.remove('pressed');
        onUp();
    }, { passive: false });
}

function updateJoystickDirections() {
    const magnitude = Math.sqrt(joystick.dx * joystick.dx + joystick.dy * joystick.dy);

    if (magnitude < joystick.deadzone) {
        mobileInput.up = false;
        mobileInput.down = false;
        mobileInput.left = false;
        mobileInput.right = false;
        keys['KeyW'] = false;
        keys['KeyS'] = false;
        keys['KeyA'] = false;
        keys['KeyD'] = false;
        return;
    }

    // Use analog values - threshold at 0.3 for activation
    const threshold = 0.3;

    mobileInput.up = joystick.dy < -threshold;
    mobileInput.down = joystick.dy > threshold;
    mobileInput.left = joystick.dx < -threshold;
    mobileInput.right = joystick.dx > threshold;

    // Map to keyboard keys so existing update.js logic works
    keys['KeyW'] = mobileInput.up;
    keys['KeyS'] = mobileInput.down;
    keys['KeyA'] = mobileInput.left;
    keys['KeyD'] = mobileInput.right;
}

// --- CANVAS TOUCH FOR FURNITURE DRAGGING & PHOTO WALL ---
let canvasTouchId = null;

function handleCanvasTouch(e) {
    if (canvasTouchId !== null) return;
    const touch = e.changedTouches[0];
    canvasTouchId = touch.identifier;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (touch.clientX - rect.left) * scaleX;
    mouseY = (touch.clientY - rect.top) * scaleY;

    // Trigger mousedown equivalent for furniture
    const worldX = mouseX + camera.x;
    const worldY = mouseY + camera.y;

    // Photo wall interaction
    if (currentIsland.includes('_inside')) {
        const photoX = (mapSize/2)*64;
        const photoY = (mapSize/2 - 5)*64;
        if (worldX >= photoX - 352 && worldX <= photoX + 352 && worldY >= photoY - 320 && worldY <= photoY + 64) {
            document.getElementById('photo-upload-input').click();
            return;
        }
    }

    // Furniture interaction
    if (!document.getElementById('furniture-editor').classList.contains('hidden')) {
        homeFurniture.forEach(f => {
            let hit = false;
            if (f.type === 'sofa') {
                hit = worldX >= f.x - 96 && worldX <= f.x + 96 && worldY >= f.y - 32 && worldY <= f.y + 32;
            } else {
                const dist = Math.hypot(worldX - f.x, worldY - f.y);
                hit = dist < 40;
            }
            if (hit) {
                selectedFurniture = f;
                editingFurniture = f;
                document.getElementById('furniture-color-menu').classList.remove('hidden');
            }
        });
    }
}

function handleCanvasMove(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === canvasTouchId) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            mouseX = (touch.clientX - rect.left) * scaleX;
            mouseY = (touch.clientY - rect.top) * scaleY;

            if (selectedFurniture) {
                selectedFurniture.x = Math.floor((mouseX + camera.x) / 64) * 64 + 32;
                selectedFurniture.y = Math.floor((mouseY + camera.y) / 64) * 64 + 32;
            }
            break;
        }
    }
}

function handleCanvasEnd(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === canvasTouchId) {
            if (selectedFurniture) {
                saveFurniture();
            }
            selectedFurniture = null;
            canvasTouchId = null;
            break;
        }
    }
}

// --- RESPONSIVE CANVAS RESIZE ---
function resizeForMobile() {
    if (!isMobile) return;

    const container = document.getElementById('game-container');
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    container.style.width = vw + 'px';
    container.style.height = vh + 'px';
    container.style.border = 'none';
    container.style.borderRadius = '0';

    canvas.width = vw;
    canvas.height = vh;

    camera.width = vw;
    camera.height = vh;

    // Update game-container transform
    container.style.transform = 'none';
    container.classList.add('zoomed');
}

// --- FULLSCREEN ON MOBILE ---
function requestMobileFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
}

// Initialize on load
if (isMobile) {
    // Might need to wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileControls);
    } else {
        initMobileControls();
    }
}
