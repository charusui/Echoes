/* ==========================================================================
   HARMONYDEX - INTERACTIVE OVERWORLD MAP & DIALOGUE CONTROLLER
   ========================================================================== */

class OverworldController {
    constructor() {
        this.currentNodeId = 'cadence_town';
        this.tokenEl = null;
    }

    init() {
        this.renderNodes();
        this.renderToken();
        this.selectNode('cadence_town');

        document.getElementById('btn-loc-action')?.addEventListener('click', () => {
            this.openDialogue(this.currentNodeId);
        });

        // Close dialogue modal on outside click or X button
        document.querySelector('[data-close="modal-dialogue"]')?.addEventListener('click', () => {
            document.getElementById('modal-dialogue').classList.add('hidden');
        });
    }

    renderNodes() {
        const layer = document.getElementById('map-nodes-layer');
        if (!layer) return;
        layer.innerHTML = '';

        Object.values(MAP_NODES).forEach(node => {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('class', `map-node ${node.unlocked ? 'unlocked' : 'locked'}`);
            g.setAttribute('transform', `translate(${node.x}, ${node.y})`);
            g.style.opacity = node.unlocked ? '1' : '0.4';

            // Outer ring
            const circleOuter = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circleOuter.setAttribute('class', 'node-outer');
            circleOuter.setAttribute('r', '26');
            circleOuter.setAttribute('fill', 'rgba(0, 0, 0, 0.6)');
            circleOuter.setAttribute('stroke', node.type === 'boss' ? '#ff0055' : (node.type === 'shrine' ? '#ffd700' : '#00f0ff'));
            circleOuter.setAttribute('stroke-width', '2.5');

            // Icon background
            const circleInner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circleInner.setAttribute('r', '18');
            circleInner.setAttribute('fill', 'rgba(255, 255, 255, 0.1)');

            // Emoji icon (using SVG text)
            const iconText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            iconText.setAttribute('y', '6');
            iconText.setAttribute('font-size', '18');
            iconText.textContent = node.icon;

            // Node Name Label below
            const nameLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            nameLabel.setAttribute('y', '44');
            nameLabel.textContent = node.unlocked ? node.name : '??? (Locked)';

            g.appendChild(circleOuter);
            g.appendChild(circleInner);
            g.appendChild(iconText);
            g.appendChild(nameLabel);

            if (node.unlocked) {
                g.addEventListener('click', () => {
                    audioEngine.playHitSFX('good');
                    this.moveToNode(node.id);
                });
            }

            layer.appendChild(g);
        });
    }

    renderToken() {
        const layer = document.getElementById('map-token-layer');
        if (!layer) return;
        layer.innerHTML = '';

        const startNode = MAP_NODES[this.currentNodeId] || MAP_NODES.cadence_town;

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'map-token');
        g.setAttribute('id', 'party-token');
        g.setAttribute('transform', `translate(${startNode.x}, ${startNode.y - 35})`);

        // Glowing party indicator circle
        const tokenCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        tokenCircle.setAttribute('r', '16');
        tokenCircle.setAttribute('fill', '#ffd700');
        tokenCircle.setAttribute('stroke', '#ffffff');
        tokenCircle.setAttribute('stroke-width', '2');

        const tokenText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        tokenText.setAttribute('y', '5');
        tokenText.setAttribute('font-size', '14');
        tokenText.textContent = '🕺';

        g.appendChild(tokenCircle);
        g.appendChild(tokenText);
        layer.appendChild(g);

        this.tokenEl = g;
    }

    moveToNode(nodeId) {
        const node = MAP_NODES[nodeId];
        if (!node || !node.unlocked) return;

        this.currentNodeId = nodeId;
        if (this.tokenEl) {
            this.tokenEl.setAttribute('transform', `translate(${node.x}, ${node.y - 35})`);
        }

        this.selectNode(nodeId);
    }

    selectNode(nodeId) {
        const node = MAP_NODES[nodeId];
        if (!node) return;

        document.getElementById('loc-title').textContent = node.name;
        document.getElementById('loc-desc').textContent = node.desc;
        document.getElementById('loc-badge').textContent = `${node.type.toUpperCase()} NODE`;

        const detailsEl = document.getElementById('loc-details');
        if (node.type === 'town') {
            detailsEl.innerHTML = `<strong>NPC:</strong> Elder Cadence<br><strong>Status:</strong> Safe Village Sanctuary`;
        } else if (node.type === 'wild') {
            detailsEl.innerHTML = `<strong>Wild Encounters:</strong> Corrupted Violin, Thunder 808<br><strong>Status:</strong> Active Dissonance`;
        } else if (node.type === 'shrine') {
            detailsEl.innerHTML = `<strong>Anomalies:</strong> Titan Brass (Rare)<br><strong>Action:</strong> Capture via Attunement`;
        } else {
            detailsEl.innerHTML = `<strong>BOSS:</strong> Lord Cacophony Organ<br><strong>Warning:</strong> Extreme Multi-Phase Dissonance!`;
        }

        const actionBtn = document.getElementById('btn-loc-action');
        actionBtn.textContent = `Interact with ${node.name}`;
    }

    openDialogue(nodeId) {
        const node = MAP_NODES[nodeId];
        if (!node || !node.dialogue) return;

        const dialogue = node.dialogue;
        document.getElementById('dialogue-avatar').textContent = dialogue.avatar || '👴';
        document.getElementById('dialogue-speaker').textContent = dialogue.speaker || 'Mysterious NPC';
        document.getElementById('dialogue-text').textContent = dialogue.text;

        const choicesBox = document.getElementById('dialogue-choices');
        choicesBox.innerHTML = '';

        dialogue.choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'btn-choice';
            btn.textContent = choice.text;
            btn.addEventListener('click', () => {
                this.handleDialogueAction(choice.action);
            });
            choicesBox.appendChild(btn);
        });

        document.getElementById('modal-dialogue').classList.remove('hidden');
    }

    handleDialogueAction(action) {
        document.getElementById('modal-dialogue').classList.add('hidden');
        audioEngine.playHitSFX('sick');

        if (action === 'explain_types') {
            alert("TYPE SYSTEM:\nString beats Percussion\nPercussion beats Brass\nBrass beats Synth\nSynth beats Woodwind\nWoodwind beats String\n\nStriking a weakness deals 2x Damage and double Stagger bar build!");
            return;
        }

        let targetEnemy = 'corrupted_violin';
        if (action === 'trigger_combat_violin') targetEnemy = 'corrupted_violin';
        if (action === 'trigger_combat_808') targetEnemy = 'thunder_808';
        if (action === 'trigger_combat_titan') targetEnemy = 'titan_brass';
        if (action === 'trigger_combat_boss') targetEnemy = 'lord_cacophony';

        // Launch combat
        combatController.startBattle({
            enemyId: targetEnemy,
            onVictory: (defeatedId) => {
                // Progression logic
                if (defeatedId === 'corrupted_violin' && QUESTS.q1.status === 'active') {
                    QUESTS.q1.status = 'completed';
                    QUESTS.q2.status = 'active';
                    MAP_NODES.harmonic_shrine.unlocked = true;
                    this.renderNodes();
                    uiManager?.updateQuestHUD();
                } else if (defeatedId === 'lord_cacophony') {
                    QUESTS.q3.status = 'completed';
                    alert("🎉 CONGRATULATIONS! You have defeated Lord Cacophony and restored complete harmony to the valley! You are the true Master Conductor!");
                    uiManager?.updateQuestHUD();
                }
            },
            onCapture: (capturedId) => {
                if (capturedId === 'titan_brass' && QUESTS.q2.status === 'active') {
                    QUESTS.q2.status = 'completed';
                    QUESTS.q3.status = 'active';
                    MAP_NODES.dissonance_citadel.unlocked = true;
                    this.renderNodes();
                    uiManager?.updateQuestHUD();
                }
            }
        });
    }
}

// Global instance
const overworldController = new OverworldController();
window.overworldController = overworldController;
