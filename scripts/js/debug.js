// --- SISTEMA DE DEBUG ---

function toggleDebug() {
    debug.active = !debug.active;
    if (debug.active) {
        if (!debug.panel) createDebugPanel();
        debug.panel.style.display = 'block';
    } else if (debug.panel) {
        debug.panel.style.display = 'none';
    }
}

function createDebugPanel() {
    debug.panel = document.createElement('div');
    debug.panel.id = 'debug-panel';
    debug.panel.style.cssText = `
        position: absolute; top: 10px; right: 10px;
        background: rgba(0,0,0,0.8); color: #0f0;
        padding: 10px; font-family: monospace; font-size: 12px;
        border: 1px solid #0f0; border-radius: 5px; z-index: 1000;
        pointer-events: auto;
    `;

    const controls = [
        { label: 'Aceleración', key: 'speed', min: 0, max: 5000, step: 100 },
        { label: 'Vel Máx', key: 'maxSpeed', min: 0, max: 2000, step: 50 },
        { label: 'Fricción', key: 'friction', min: 0.1, max: 1, step: 0.01 },
        { label: 'Energía', key: 'energy', min: 0, max: 100, step: 1, obj: stats },
        { label: 'Hora (Avance min)', key: 'debugTimeOffsetMinutes', min: 0, max: 100, step: 1, obj: window }
    ];

    controls.forEach(c => {
        const div = document.createElement('div');
        div.style.marginBottom = '5px';

        let initialVal;
        if (c.key === 'debugTimeOffsetMinutes') initialVal = debugTimeOffsetMinutes;
        else initialVal = (c.obj || player)[c.key];

        div.innerHTML = `
            <label>${c.label}: <span id="val-${c.key}">${initialVal}</span></label><br>
            <input type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${initialVal}" 
                   oninput="window.updateDebugValue('${c.key}', this.value, '${c.label}')">
        `;
        debug.panel.appendChild(div);
    });

    document.body.appendChild(debug.panel);

    window.updateDebugValue = (key, val, label) => {
        const value = parseFloat(val);
        if (key === 'debugTimeOffsetMinutes') debugTimeOffsetMinutes = value;
        else if (label === 'Energía') stats[key] = value;
        else player[key] = value;
        document.getElementById(`val-${key}`).innerText = val;
    };
}

function updateDebugPanel() { }

function drawDebugInfo() {
    ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
    ctx.font = '12px monospace';
    ctx.fillText(`Cam X: ${camera.x.toFixed(0)} Y: ${camera.y.toFixed(0)}`, 10, canvas.height - 20);
    ctx.fillText(`Pos X: ${player.x.toFixed(0)} Y: ${player.y.toFixed(0)}`, 10, canvas.height - 40);
    ctx.fillText(`Vel X: ${player.vx.toFixed(0)} Y: ${player.vy.toFixed(0)}`, 10, canvas.height - 60);

    if (faker && faker.active) {
        const dist = Math.hypot(player.x - faker.x, player.y - faker.y);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.fillText(`FAKER: ACTIVE | Dist: ${dist.toFixed(0)} | Strength: ${(faker.strength * 100).toFixed(0)}%`, 10, canvas.height - 80);
    } else {
        ctx.fillStyle = 'rgba(100, 100, 100, 0.7)';
        ctx.fillText(`FAKER: INACTIVE | SpawnWait: ${faker.spawnWait.toFixed(1)}s`, 10, canvas.height - 80);
    }
}

