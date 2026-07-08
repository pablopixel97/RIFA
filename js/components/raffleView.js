// RaffleView Component
window.RaffleView = {
    async render(container, state, raffleId, callbacks) {
        let raffle = await window.Storage.getRaffle(raffleId);
        if (!raffle) {
            window.showToast("Rifa no encontrada", "danger");
            callbacks.onGoBack();
            return;
        }

        let activeView = 'grid'; // grid, list, details, settings
        let searchQuery = '';

        const drawRaffleUI = async () => {
            raffle = await window.Storage.getRaffle(raffleId);
            
            const numbersArr = Object.values(raffle.numbers);
            const size = raffle.size;
            
            const soldCount = numbersArr.filter(n => n.name !== '' || n.phone !== '').length;
            const availableCount = size - soldCount;
            const paidCount = numbersArr.filter(n => n.paid).length;
            const unpaidCount = soldCount - paidCount;
            
            const ticketPrice = raffle.ticketPrice || 5000;
            const totalCollected = paidCount * ticketPrice;
            const pendingCollection = unpaidCount * ticketPrice;
            
            const formattedCollected = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(totalCollected);
            const formattedPending = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(pendingCollection);

            container.innerHTML = `
                <div class="raffle-view-header">
                    <div class="raffle-info-left">
                        <button class="back-btn" id="btn-back-dashboard" title="Volver a mis sorteos">
                            <i data-lucide="arrow-left" style="width: 20px; height: 20px;"></i>
                        </button>
                        <div class="raffle-view-title">
                            <h2>${raffle.name}</h2>
                            <div class="raffle-view-meta">
                                <span><i data-lucide="calendar" style="width: 14px; height: 14px; display:inline; vertical-align:middle;"></i> Sorteo: ${raffle.date || 'Sin fecha'}</span>
                                <span><i data-lucide="hash" style="width: 14px; height: 14px; display:inline; vertical-align:middle;"></i> Total: ${size} números</span>
                            </div>
                        </div>
                    </div>
                    <div class="raffle-actions-right" style="display: flex; gap: 0.75rem;">
                        <button class="btn btn-secondary" id="btn-view-settings">
                            <i data-lucide="settings" style="width: 18px; height: 18px;"></i>
                            <span>Ajustes</span>
                        </button>
                        <button class="btn btn-primary" id="btn-trigger-draw" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border:none; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3);">
                            <i data-lucide="award" style="width: 18px; height: 18px;"></i>
                            <span>Sorteo</span>
                        </button>
                    </div>
                </div>
                 <!-- Raffle Toolbar -->
                <div class="raffle-toolbar">
                    <div class="toolbar-left">
                        <button class="view-btn ${activeView === 'grid' ? 'active' : ''}" data-view="grid">
                            <i data-lucide="layout-grid" style="width: 16px; height: 16px;"></i>
                            <span>Visor General</span>
                        </button>
                        <button class="view-btn ${activeView === 'list' ? 'active' : ''}" data-view="list">
                            <i data-lucide="list" style="width: 16px; height: 16px;"></i>
                            <span>Lista</span>
                        </button>
                    </div>
                    <div class="toolbar-right">
                        ${activeView === 'list' ? `
                            <input type="text" id="search-numbers-input" class="input-control search-bar" placeholder="Buscar por número, nombre o fono..." value="${searchQuery}">
                        ` : `
                            <div style="display: flex; gap: 1rem; font-size: 0.85rem; color: var(--text-secondary);">
                                <span>Vendidos: <strong style="color:var(--text-primary);">${soldCount}</strong></span>
                                <span>Disponibles: <strong style="color:var(--text-primary);">${availableCount}</strong></span>
                                <span>Pagados: <strong style="color:var(--color-success);">${paidCount}</strong></span>
                            </div>
                        `}
                    </div>
                </div>

                <div id="active-view-container"></div>
                <div id="edit-modal-root"></div>
                <div id="draw-modal-root"></div>
            `;

            if (window.lucide) {
                window.lucide.createIcons();
            }

            container.querySelector('#btn-back-dashboard').addEventListener('click', callbacks.onGoBack);
            container.querySelector('#btn-view-settings').addEventListener('click', () => {
                switchView('settings');
            });

            container.querySelector('#btn-trigger-draw').addEventListener('click', () => {
                const root = container.querySelector('#draw-modal-root');
                window.DrawModal.render(root, raffle, () => {
                    drawRaffleUI();
                });
            });

            const viewBtns = container.querySelectorAll('.view-btn');
            viewBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetView = btn.getAttribute('data-view');
                    switchView(targetView);
                });
            });

            renderActiveViewContent();
        };

        const switchView = (viewName) => {
            activeView = viewName;
            drawRaffleUI();
        };

        const renderActiveViewContent = () => {
            const innerContainer = container.querySelector('#active-view-container');
            const numbersArr = Object.values(raffle.numbers);

            if (activeView === 'grid') {
                innerContainer.innerHTML = `
                    <div class="numbers-grid">
                        ${numbersArr.map(num => {
                            const isBought = num.name !== '' || num.phone !== '';
                            let stateClass = 'available';
                            let unpaidClass = '';
                            
                            if (isBought) {
                                stateClass = 'bought';
                                if (!num.paid) {
                                    unpaidClass = 'unpaid';
                                }
                            }
                            
                            return `
                                <div class="number-card ${stateClass} ${unpaidClass}" data-num="${num.number}" title="${isBought ? `${num.name} ${num.phone ? `(${num.phone})` : ''} - ${num.paid ? 'Pagado' : 'Pendiente'}` : 'Disponible'}">
                                    <span>${num.number}</span>
                                    ${isBought ? `<span class="number-card-buyer-preview">${num.name || num.phone}</span>` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;

                innerContainer.querySelectorAll('.number-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const numVal = parseInt(card.getAttribute('data-num'), 10);
                        openEditModalFor(numVal);
                    });
                });

            } else if (activeView === 'list') {
                const filtered = numbersArr.filter(num => {
                    if (searchQuery === '') return true;
                    const q = searchQuery.toLowerCase();
                    return String(num.number).includes(q) || 
                           num.name.toLowerCase().includes(q) || 
                           num.phone.toLowerCase().includes(q);
                });

                innerContainer.innerHTML = `
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 100px;">Número</th>
                                    <th>Comprador</th>
                                    <th>Teléfono</th>
                                    <th style="width: 150px;">Estado</th>
                                    <th style="width: 180px; text-align: right;">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filtered.map(num => {
                                    const isBought = num.name !== '' || num.phone !== '';
                                    let badgeHtml = `<span class="badge badge-available">Disponible</span>`;
                                    
                                    if (isBought) {
                                        if (num.paid) {
                                            badgeHtml = `<span class="badge badge-paid"><i data-lucide="check" style="width: 12px; height: 12px;"></i> Pagado</span>`;
                                        } else {
                                            badgeHtml = `<span class="badge badge-unpaid"><i data-lucide="alert-circle" style="width: 12px; height: 12px;"></i> Pendiente</span>`;
                                        }
                                    }
                                    
                                    return `
                                        <tr>
                                            <td><strong style="font-size: 1.1rem; color: var(--color-primary);">${num.number}</strong></td>
                                            <td>${num.name || '<span style="color:var(--text-muted); font-style:italic;">Disponible</span>'}</td>
                                            <td>${num.phone || '<span style="color:var(--text-muted); font-style:italic;">-</span>'}</td>
                                            <td>${badgeHtml}</td>
                                            <td style="text-align: right;">
                                                <button class="btn btn-secondary btn-icon edit-num-btn" data-num="${num.number}" title="Editar comprador" style="padding: 0.4rem; border-radius:6px; margin-right:5px;">
                                                    <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
                                                </button>
                                                ${isBought ? `
                                                    <button class="btn btn-danger btn-icon clear-num-btn" data-num="${num.number}" title="Eliminar comprador" style="padding: 0.4rem; border-radius:6px;">
                                                        <i data-lucide="trash" style="width: 16px; height: 16px;"></i>
                                                    </button>
                                                ` : `
                                                    <button class="btn btn-secondary btn-icon" style="padding: 0.4rem; border-radius:6px; opacity: 0.3; cursor: not-allowed;" disabled>
                                                        <i data-lucide="trash" style="width: 16px; height: 16px;"></i>
                                                    </button>
                                                `}
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                                
                                ${filtered.length === 0 ? `
                                    <tr>
                                        <td colspan="5" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                                            No se encontraron números que coincidan con la búsqueda.
                                        </td>
                                    </tr>
                                ` : ''}
                            </tbody>
                        </table>
                    </div>
                `;

                if (window.lucide) {
                    window.lucide.createIcons();
                }

                const searchInput = container.querySelector('#search-numbers-input');
                if (searchInput) {
                    searchInput.focus();
                    const val = searchInput.value;
                    searchInput.value = '';
                    searchInput.value = val;
                    
                    searchInput.addEventListener('input', (e) => {
                        searchQuery = e.target.value;
                        renderActiveViewContent();
                    });
                }

                innerContainer.querySelectorAll('.edit-num-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const numVal = parseInt(btn.getAttribute('data-num'), 10);
                        openEditModalFor(numVal);
                    });
                });

                innerContainer.querySelectorAll('.clear-num-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const numVal = parseInt(btn.getAttribute('data-num'), 10);
                        if (confirm(`¿Estás seguro de eliminar el comprador del número ${numVal}?`)) {
                            try {
                                await window.Storage.saveTicket(raffle.id, numVal, {
                                    name: '',
                                    phone: '',
                                    paid: false
                                });
                                window.showToast(`Se liberó el número ${numVal}`, "success");
                                await drawRaffleUI();
                            } catch (err) {
                                window.showToast("Error al liberar el número", "danger");
                            }
                        }
                    });
                });

            } else if (activeView === 'settings') {
                const root = container.querySelector('#active-view-container');
                window.SettingsTab.render(root, raffle, () => {
                    drawRaffleUI();
                });
            }
        };

        const openEditModalFor = (numVal) => {
            const root = container.querySelector('#edit-modal-root');
            const numberDetails = raffle.numbers[numVal];
            
            window.EditModal.render(root, numberDetails, async (updatedData) => {
                const finalData = updatedData === null ? { name: '', phone: '', paid: false } : updatedData;
                
                try {
                    await window.Storage.saveTicket(raffle.id, numVal, finalData);
                    window.showToast("Número actualizado correctamente", "success");
                    await drawRaffleUI();
                } catch (err) {
                    window.showToast("Error al guardar los datos", "danger");
                }
            });
        };

        drawRaffleUI();
    }
};
