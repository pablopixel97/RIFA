// Winner / Al Agua draw component
window.DrawModal = {
    render(container, raffle, onDrawSuccess) {
        const boughtNumbers = (raffle.type === 'list' ? (raffle.tickets || []) : Object.values(raffle.numbers || {})).filter(n => n.name !== '' || n.phone !== '');
        
        container.innerHTML = `
            <div class="modal-overlay" id="draw-modal">
                <div class="modal-content" style="max-width: 500px; position:relative; overflow-y:auto;">
                    <div class="modal-header">
                        <h3 class="modal-title">Sorteador Digital</h3>
                        <button class="modal-close" id="draw-modal-close">
                            <i data-lucide="x" style="width: 20px; height: 20px;"></i>
                        </button>
                    </div>
                    <div class="modal-body" id="draw-modal-body">
                        <!-- Step 1: Buttons Selector -->
                        <div id="draw-setup-view" style="text-align: center; padding: 1.5rem 0;">
                            <i data-lucide="help-circle" style="width: 3.5rem; height: 3.5rem; color: var(--color-primary); margin-bottom: 1.5rem;"></i>
                            <h4 style="font-size: 1.25rem; margin-bottom: 0.5rem;">¿Qué tipo de sorteo deseas realizar?</h4>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 2rem;">
                                Tienes <strong style="color:var(--text-primary);">${boughtNumbers.length}</strong> números vendidos listos para entrar al sorteo.
                            </p>
                            
                            <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 300px; margin: 0 auto; margin-bottom: 1.5rem;">
                                <button class="btn btn-primary" id="btn-draw-winner" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border:none; padding: 0.85rem 1.5rem; font-size: 1.05rem;">
                                    <i data-lucide="trophy"></i>
                                    <span>Escoger Ganador 🏆</span>
                                </button>
                                <button class="btn btn-secondary" id="btn-draw-alagua" style="border: 1px solid rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.1); color: #fca5a5; padding: 0.85rem 1.5rem; font-size: 1.05rem;">
                                    <i data-lucide="droplet"></i>
                                    <span>Lanzar al Agua 🌊</span>
                                </button>
                            </div>

                            ${raffle.draws && raffle.draws.length > 0 ? `
                                <div style="margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1.2rem; text-align: left;">
                                    <h4 style="font-size: 0.9rem; margin-bottom: 0.75rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
                                        <i data-lucide="history" style="width: 15px; height: 15px; color: var(--color-primary);"></i>
                                        <span>Historial de Sorteos</span>
                                    </h4>
                                    <div style="max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.4rem; padding-right: 4px;">
                                        ${raffle.draws.map((d, index) => {
                                            const isWinner = d.type === 'winner';
                                            return `
                                                <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-panel-inner); padding:0.5rem 0.6rem; border-radius:6px; font-size:0.75rem; border: 1px solid var(--border-color);">
                                                    <div style="display:flex; align-items:center; gap:0.5rem;">
                                                        <span style="font-size:0.65rem; font-weight:600; padding:0.15rem 0.3rem; border-radius:4px; background: ${isWinner ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.1)'}; color: ${isWinner ? '#fbbf24' : '#fca5a5'}; border: 1px solid ${isWinner ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.2)'};">
                                                            ${isWinner ? 'Ganador' : 'Al Agua'}
                                                        </span>
                                                        <div style="color:var(--text-secondary);">
                                                            <strong style="color:var(--text-primary);">N° ${d.number}</strong> - <span>${d.buyer.name || 'Sin nombre'}</span>
                                                        </div>
                                                    </div>
                                                    <span style="color:var(--text-muted); font-size:0.65rem;">
                                                        ${new Date(d.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            `;
                                        }).reverse().join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>

                        <!-- Step 2: Animation View (Hidden Initially) -->
                        <div id="draw-anim-view" style="display: none; text-align: center; padding: 2rem 0;">
                            <div class="draw-type-banner" id="anim-type-banner">TIPO DE SORTEO</div>
                            <div class="digital-roll" id="anim-digital-roll">000</div>
                            <h3 style="font-weight:600; font-size:1.1rem; color:var(--text-secondary);" id="anim-status-text">Mezclando tómbola digital...</h3>
                        </div>

                        <!-- Step 3: Result View (Hidden Initially) -->
                        <div id="draw-result-view" style="display: none;">
                            <!-- Dynamic Splash HTML -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) {
            window.lucide.createIcons();
        }

        const modal = container.querySelector('#draw-modal');
        const closeBtn = container.querySelector('#draw-modal-close');
        
        const setupView = container.querySelector('#draw-setup-view');
        const animView = container.querySelector('#draw-anim-view');
        const resultView = container.querySelector('#draw-result-view');
        
        const btnWinner = container.querySelector('#btn-draw-winner');
        const btnAlagua = container.querySelector('#btn-draw-alagua');
        
        const rollDisplay = container.querySelector('#anim-digital-roll');
        const banner = container.querySelector('#anim-type-banner');
        
        const closeModal = () => {
            modal.style.display = 'none';
            container.innerHTML = '';
        };

        closeBtn.addEventListener('click', closeModal);

        const startDraw = (type) => {
            if (boughtNumbers.length === 0) {
                window.showToast("No hay números vendidos para sortear.", "warning");
                return;
            }

            setupView.style.display = 'none';
            animView.style.display = 'block';
            
            if (type === 'winner') {
                banner.textContent = 'Buscando Ganador';
                banner.className = 'draw-type-banner draw-type-winner';
            } else {
                banner.textContent = 'Al Agua (Descarte)';
                banner.className = 'draw-type-banner draw-type-alagua';
            }

            const winnerIndex = Math.floor(Math.random() * boughtNumbers.length);
            const winnerNumber = boughtNumbers[winnerIndex];

            let counter = 0;
            const duration = 2500;
            const intervalTime = 60;
            rollDisplay.classList.add('rolling');
            
            const timer = setInterval(() => {
                const randNum = boughtNumbers[Math.floor(Math.random() * boughtNumbers.length)].number;
                rollDisplay.textContent = String(randNum).padStart(3, '0');
            }, intervalTime);

            setTimeout(() => {
                clearInterval(timer);
                rollDisplay.classList.remove('rolling');
                
                rollDisplay.textContent = String(winnerNumber.number).padStart(3, '0');
                
                setTimeout(async () => {
                    await showResultSplash(type, winnerNumber);
                }, 800);
            }, duration);
        };

        btnWinner.addEventListener('click', () => startDraw('winner'));
        btnAlagua.addEventListener('click', () => startDraw('alagua'));

        const showResultSplash = async (type, numberObj) => {
            const newDraw = {
                type: type,
                number: numberObj.number,
                sellerId: numberObj.seller_id || null,
                buyer: {
                    name: numberObj.name,
                    phone: numberObj.phone,
                    paid: numberObj.paid
                },
                timestamp: new Date().toISOString()
            };
            
            try {
                await window.Storage.recordDraw(raffle.id, newDraw);
            } catch (err) {
                window.showToast("Error al registrar el sorteo en base de datos", "danger");
            }
            
            animView.style.display = 'none';
            resultView.style.display = 'block';

            const isWinner = type === 'winner';
            const price = raffle.ticketPrice || 5000;
            const formatMoney = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);

            resultView.innerHTML = `
                <div class="winner-splash">
                    <div class="winner-cup">${isWinner ? '🏆' : '🌊'}</div>
                    <h2 style="font-size:1.75rem; margin-bottom: 0.5rem; font-weight:800; color: ${isWinner ? '#fbbf24' : '#ef4444'};">
                        ${isWinner ? '¡NÚMERO GANADOR!' : '¡NÚMERO AL AGUA!'}
                    </h2>
                    <div class="winner-number" style="color: ${isWinner ? '#fbbf24' : '#fca5a5'};">${numberObj.number}</div>
                    
                    <div style="background: var(--bg-panel-inner); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.5rem; margin: 1.5rem 0; text-align: left;">
                        <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.25rem;">Comprador:</div>
                        <div class="winner-name">${numberObj.name ? window.escapeHTML(numberObj.name) : '<em style="color:var(--text-muted);">Sin Nombre</em>'}</div>
                        
                        ${numberObj.phone ? `
                            <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.75rem; margin-bottom:0.15rem;">Contacto:</div>
                            <div class="winner-phone">${window.escapeHTML(numberObj.phone)}</div>
                        ` : ''}

                        ${raffle.type === 'list' ? `
                            <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.75rem; margin-bottom:0.15rem;">Lista del Vendedor:</div>
                            <div style="font-weight:600; color:var(--text-primary); font-size: 0.95rem;">${window.escapeHTML(numberObj.seller_name || 'Organizador')}</div>
                        ` : ''}
                        
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1rem; border-top:1px solid var(--border-color); padding-top:0.75rem; font-size:0.85rem;">
                            <span>Estado de Pago:</span>
                            <span class="badge ${numberObj.paid ? 'badge-paid' : 'badge-unpaid'}">
                                ${numberObj.paid ? 'Pagado (Efectivo/Transf)' : 'Debe / Pendiente'}
                            </span>
                        </div>
                    </div>

                    <div style="display:flex; gap:1rem; justify-content:center;">
                        <button class="btn btn-secondary" id="btn-draw-again">Sortear Otro</button>
                        <button class="btn btn-primary" id="btn-draw-done">Listo</button>
                    </div>
                </div>
            `;

            if (isWinner) {
                triggerConfetti();
            }

            resultView.querySelector('#btn-draw-again').addEventListener('click', () => {
                resultView.style.display = 'none';
                setupView.style.display = 'block';
                onDrawSuccess();
            });

            resultView.querySelector('#btn-draw-done').addEventListener('click', () => {
                closeModal();
                onDrawSuccess();
            });
        };

        const triggerConfetti = () => {
            const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444'];
            const contentEl = modal;
            
            for (let i = 0; i < 60; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti-particle';
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
                confetti.style.width = (Math.random() * 6 + 6) + 'px';
                confetti.style.height = (Math.random() * 12 + 6) + 'px';
                confetti.style.animationDelay = Math.random() * 0.5 + 's';
                confetti.style.animationDuration = (Math.random() * 1.5 + 1.5) + 's';
                
                contentEl.appendChild(confetti);
                
                setTimeout(() => confetti.remove(), 3000);
            }
        };
    }
};
