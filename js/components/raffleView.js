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
        let selectedSellerId = null;
        let selectedSellerName = '';

        const isCollab = !!(callbacks && callbacks.isCollaborator);
        const drawRaffleUI = async () => {
            raffle = await window.Storage.getRaffle(raffleId);
            
            const ticketsArr = raffle.tickets || [];
            const size = raffle.type === 'list' ? ticketsArr.length : raffle.size;
            
            const soldCount = ticketsArr.filter(n => n.name !== '' || n.phone !== '').length;
            const availableCount = size - soldCount;
            const paidCount = ticketsArr.filter(n => n.paid).length;
            const unpaidCount = soldCount - paidCount;
            
            const ticketPrice = raffle.ticketPrice || 5000;
            const totalCollected = paidCount * ticketPrice;
            const pendingCollection = unpaidCount * ticketPrice;
            
            const formattedCollected = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(totalCollected);
            const formattedPending = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(pendingCollection);

            container.innerHTML = `
                <div class="raffle-view-header">
                    <div class="raffle-info-left">
                        <button class="back-btn" id="btn-back-dashboard" title="${isCollab ? 'Salir del modo colaborador' : 'Volver a mis sorteos'}">
                            <i data-lucide="${isCollab ? 'log-out' : 'arrow-left'}" style="width: 20px; height: 20px;"></i>
                        </button>
                        <div class="raffle-view-title">
                            <h2>${raffle.name}</h2>
                            <div class="raffle-view-meta">
                                <span><i data-lucide="calendar" style="width: 14px; height: 14px; display:inline; vertical-align:middle;"></i> Sorteo: ${raffle.date || 'Sin fecha'}</span>
                                <span><i data-lucide="hash" style="width: 14px; height: 14px; display:inline; vertical-align:middle;"></i> Total: ${size} números ${raffle.type === 'list' ? ` (${raffle.listSize} por lista)` : ''}</span>
                            </div>
                        </div>
                    </div>
                    <div class="raffle-actions-right" style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
                        ${isCollab ? '' : `
                            <button class="btn btn-secondary" id="btn-quick-add-collab-top" style="font-size:0.85rem; font-weight:600; display:flex; align-items:center; gap:0.35rem; padding: 0.55rem 0.95rem;">
                                <i data-lucide="user-plus" style="width: 16px; height: 16px;"></i>
                                <span>+ Vendedor</span>
                            </button>
                            <button class="btn btn-secondary" id="btn-quick-share" style="background:rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); color: var(--color-primary); font-weight:600; font-size:0.85rem; display:flex; align-items:center; gap:0.35rem; padding: 0.55rem 0.95rem;">
                                <i data-lucide="share-2" style="width: 16px; height: 16px;"></i>
                                <span>Compartir</span>
                            </button>
                            <button class="btn btn-secondary" id="btn-view-settings" style="font-size:0.85rem; display:flex; align-items:center; gap:0.35rem; padding: 0.55rem 0.95rem;">
                                <i data-lucide="settings" style="width: 18px; height: 18px;"></i>
                                <span>Ajustes</span>
                            </button>
                            <button class="btn btn-primary" id="btn-trigger-draw" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border:none; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3); font-size:0.85rem; display:flex; align-items:center; gap:0.35rem; padding: 0.55rem 0.95rem;">
                                <i data-lucide="award" style="width: 18px; height: 18px;"></i>
                                <span>Sorteo</span>
                            </button>
                        `}
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
                            <div style="display: flex; gap: 1rem; align-items: center; font-size: 0.85rem; color: var(--text-secondary); flex-wrap: wrap;">
                                <span>Vendidos: <strong style="color:var(--text-primary);">${soldCount}</strong></span>
                                <span>Disponibles: <strong style="color:var(--text-primary);">${availableCount}</strong></span>
                                <span>Pagados: <strong style="color:var(--color-success);">${paidCount}</strong></span>
                                <span>Recaudado: <strong style="color:var(--color-success);">${formattedCollected}</strong></span>
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
            
            if (!isCollab) {
                container.querySelector('#btn-view-settings').addEventListener('click', () => {
                    switchView('settings');
                });

                container.querySelector('#btn-trigger-draw').addEventListener('click', () => {
                    const root = container.querySelector('#draw-modal-root');
                    window.DrawModal.render(root, raffle, () => {
                        drawRaffleUI();
                    });
                });

                // Quick Share handler
                container.querySelector('#btn-quick-share').addEventListener('click', () => {
                    const shareUrl = `${window.location.origin}/?raffle=${raffle.id}`;
                    navigator.clipboard.writeText(shareUrl).then(() => {
                        window.showToast("¡Enlace copiado al portapapeles!", "success");
                    }).catch(err => {
                        window.showToast("No se pudo copiar el enlace", "danger");
                    });
                });

                // Quick Add Collaborator handler (top right)
                container.querySelector('#btn-quick-add-collab-top').addEventListener('click', async () => {
                    const btn = container.querySelector('#btn-quick-add-collab-top');
                    const email = prompt("Ingresa el correo electrónico del vendedor registrado en RifaApp:");
                    if (email && email.trim() !== '') {
                        try {
                            btn.disabled = true;
                            btn.textContent = 'Agregando...';
                            await window.Storage.addCollaborator(raffle.id, email.toLowerCase().trim());
                            window.showToast("¡Vendedor agregado correctamente!", "success");
                            await drawRaffleUI();
                        } catch (err) {
                            window.showToast(err.message, "danger");
                        } finally {
                            btn.disabled = false;
                            btn.innerHTML = `<i data-lucide="user-plus" style="width: 16px; height: 16px;"></i><span>+ Vendedor</span>`;
                            if (window.lucide) window.lucide.createIcons();
                        }
                    }
                });
            }

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
            const ticketsArr = raffle.tickets || [];

            if (activeView === 'grid') {
                if (raffle.type === 'list' && !isCollab && selectedSellerId === null) {
                    // Render Sellers Progress Dashboard for Admin
                    const ticketsBySeller = {};
                    ticketsArr.forEach(t => {
                        if (!ticketsBySeller[t.seller_id]) {
                            ticketsBySeller[t.seller_id] = {
                                sellerId: t.seller_id,
                                sellerName: t.seller_name || 'Organizador',
                                tickets: []
                            };
                        }
                        ticketsBySeller[t.seller_id].tickets.push(t);
                    });
                    
                    const sellersList = Object.values(ticketsBySeller);
                    
                    innerContainer.innerHTML = `
                        <div style="background:var(--bg-card); padding:1.5rem; border-radius:12px; border:1px solid var(--border-color); display:flex; flex-direction:column; gap:1.25rem; margin-top:0.5rem;">
                            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:0.75rem;">
                                <h3 style="margin:0; font-size:1.1rem; font-weight:700; display:flex; align-items:center; gap:0.5rem; color:var(--text-primary);">
                                    <i data-lucide="users" style="width: 20px; height: 20px; color: var(--color-primary);"></i>
                                    <span>Talonarios por Vendedor</span>
                                </h3>
                                <button class="btn btn-primary" id="btn-quick-add-collab" style="font-size:0.8rem; padding:0.45rem 0.9rem; display:flex; align-items:center; gap:0.35rem; font-weight:600;">
                                    <i data-lucide="user-plus" style="width: 14px; height: 14px;"></i>
                                    <span>Agregar Vendedor</span>
                                </button>
                            </div>
                            <div style="display:flex; flex-direction:column; gap:0.75rem;">
                                ${sellersList.map(s => {
                                    const sTickets = s.tickets;
                                    const sSize = sTickets.length;
                                    const sSold = sTickets.filter(t => t.name !== '' || t.phone !== '').length;
                                    const sPaid = sTickets.filter(t => t.paid).length;
                                    const sPercent = Math.round((sSold / sSize) * 100) || 0;
                                    const sCollected = sPaid * (raffle.ticketPrice || 5000);
                                    const sFormattedCollected = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(sCollected);
                                    
                                    return `
                                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; background:rgba(255,255,255,0.02); padding:1rem; border-radius:10px; border:1px solid var(--border-color); gap:1rem;">
                                            <div style="flex:1; min-width: 200px;">
                                                <div style="font-weight:700; font-size:0.95rem; color:var(--text-primary); margin-bottom:0.25rem; display:flex; align-items:center; gap:0.5rem;">
                                                    <i data-lucide="user" style="width:16px;height:16px;color:var(--text-secondary);"></i>
                                                    <span>${s.sellerName}</span>
                                                    ${s.sellerId === raffle.ownerId ? `<span class="badge" style="background:rgba(59,130,246,0.12); color:#60a5fa; border:1px solid rgba(59,130,246,0.25); font-size:0.7rem; padding:0.15rem 0.4rem; border-radius:10px; font-weight:normal;">Organizador</span>` : ''}
                                                </div>
                                                <div style="font-size:0.8rem; color:var(--text-secondary); display:flex; gap:1.5rem; margin-bottom:0.4rem;">
                                                    <span>Vendido: <strong>${sSold}/${sSize} (${sPercent}%)</strong></span>
                                                    <span>Recaudado: <strong style="color:var(--color-success);">${sFormattedCollected}</strong></span>
                                                </div>
                                                <div class="progress-container" style="max-width:320px; height:6px;">
                                                    <div class="progress-bar" style="width: ${sPercent}%;"></div>
                                                </div>
                                            </div>
                                            <button class="btn btn-secondary btn-view-seller-list" data-seller-id="${s.sellerId}" data-seller-name="${s.sellerName}" style="font-size:0.8rem; padding:0.5rem 1rem;">
                                                <i data-lucide="eye" style="width:16px;height:16px;margin-right:0.35rem;"></i>
                                                <span>Ver Talonario</span>
                                            </button>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                    
                    if (window.lucide) window.lucide.createIcons();
                    
                    const quickAddBtn = innerContainer.querySelector('#btn-quick-add-collab');
                    if (quickAddBtn) {
                        quickAddBtn.addEventListener('click', async () => {
                            const email = prompt("Ingresa el correo electrónico del vendedor registrado en RifaApp:");
                            if (email && email.trim() !== '') {
                                try {
                                    quickAddBtn.disabled = true;
                                    quickAddBtn.textContent = 'Agregando...';
                                    await window.Storage.addCollaborator(raffle.id, email.toLowerCase().trim());
                                    window.showToast("¡Vendedor agregado correctamente!", "success");
                                    await drawRaffleUI();
                                } catch (err) {
                                    window.showToast(err.message, "danger");
                                } finally {
                                    quickAddBtn.disabled = false;
                                    quickAddBtn.innerHTML = `<i data-lucide="user-plus" style="width: 14px; height: 14px;"></i><span>Agregar Vendedor</span>`;
                                    if (window.lucide) window.lucide.createIcons();
                                }
                            }
                        });
                    }
                    
                    innerContainer.querySelectorAll('.btn-view-seller-list').forEach(btn => {
                        btn.addEventListener('click', () => {
                            selectedSellerId = parseInt(btn.getAttribute('data-seller-id'), 10);
                            selectedSellerName = btn.getAttribute('data-seller-name');
                            drawRaffleUI();
                        });
                    });
                    
                } else {
                    const gridTickets = (raffle.type === 'list' && selectedSellerId !== null)
                        ? ticketsArr.filter(t => t.seller_id === selectedSellerId)
                        : (raffle.type === 'list' && isCollab ? ticketsArr.filter(t => t.seller_id === state.user.id) : Object.values(raffle.numbers || {}));
                        
                    innerContainer.innerHTML = `
                        ${(raffle.type === 'list' && selectedSellerId !== null) ? `
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem; margin-top:0.5rem;">
                                <div style="display:flex; align-items:center; gap:0.5rem;">
                                    <button class="btn btn-secondary" id="btn-back-sellers-list" style="padding:0.4rem 0.6rem; font-size:0.8rem;">
                                        <i data-lucide="chevron-left" style="width:16px;height:16px;margin-right:0.15rem;"></i>
                                        <span>Atrás</span>
                                    </button>
                                    <h3 style="margin:0; font-size:1.05rem; font-weight:700; color:var(--text-primary);">Lista de: <span style="color:var(--color-primary);">${selectedSellerName}</span></h3>
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="numbers-grid">
                            ${gridTickets.map(num => {
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

                    if (window.lucide) window.lucide.createIcons();

                    if (container.querySelector('#btn-back-sellers-list')) {
                        container.querySelector('#btn-back-sellers-list').addEventListener('click', () => {
                            selectedSellerId = null;
                            selectedSellerName = '';
                            drawRaffleUI();
                        });
                    }

                    innerContainer.querySelectorAll('.number-card').forEach(card => {
                        card.addEventListener('click', () => {
                            const numVal = parseInt(card.getAttribute('data-num'), 10);
                            openEditModalFor(numVal, selectedSellerId);
                        });
                    });
                }

            } else if (activeView === 'list') {
                const filtered = ticketsArr.filter(num => {
                    if (searchQuery === '') return true;
                    const q = searchQuery.toLowerCase();
                    return String(num.number).includes(q) || 
                           num.name.toLowerCase().includes(q) || 
                           num.phone.toLowerCase().includes(q) ||
                           (num.seller_name && num.seller_name.toLowerCase().includes(q));
                });

                innerContainer.innerHTML = `
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 50px; text-align: center;">N°</th>
                                    ${raffle.type === 'list' ? '<th>Vendedor</th>' : ''}
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
                                            <td style="text-align: center;"><strong style="font-size: 1.1rem; color: var(--color-primary);">${num.number}</strong></td>
                                            ${raffle.type === 'list' ? `<td><strong>${num.seller_name}</strong></td>` : ''}
                                            <td>${num.name || '<span style="color:var(--text-muted); font-style:italic;">Disponible</span>'}</td>
                                            <td style="white-space: nowrap;">${num.phone || '<span style="color:var(--text-muted); font-style:italic;">-</span>'}</td>
                                            <td>${badgeHtml}</td>
                                            <td style="text-align: right;">
                                                <button class="btn btn-secondary btn-icon edit-num-btn" data-num="${num.number}" data-seller-id="${num.seller_id}" title="Editar comprador" style="padding: 0.4rem; border-radius:6px; margin-right:5px;">
                                                    <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
                                                </button>
                                                ${isBought ? `
                                                    <button class="btn btn-danger btn-icon clear-num-btn" data-num="${num.number}" data-seller-id="${num.seller_id}" title="Eliminar comprador" style="padding: 0.4rem; border-radius:6px;">
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
                                        <td colspan="${raffle.type === 'list' ? 6 : 5}" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
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
                        const sId = parseInt(btn.getAttribute('data-seller-id'), 10);
                        openEditModalFor(numVal, sId);
                    });
                });

                innerContainer.querySelectorAll('.clear-num-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const numVal = parseInt(btn.getAttribute('data-num'), 10);
                        const sId = parseInt(btn.getAttribute('data-seller-id'), 10);
                        if (confirm(`¿Estás seguro de eliminar el comprador del número ${numVal}?`)) {
                            try {
                                await window.Storage.saveTicket(raffle.id, numVal, {
                                    name: '',
                                    phone: '',
                                    paid: false,
                                    sellerId: sId
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

        const openEditModalFor = (numVal, sellerIdOverride = null) => {
            const root = container.querySelector('#edit-modal-root');
            const finalSellerId = sellerIdOverride !== null ? sellerIdOverride : (isCollab ? state.user.id : raffle.ownerId);
            const ticketsArr = raffle.tickets || [];
            
            let numberDetails = ticketsArr.find(t => t.number === numVal && t.seller_id === finalSellerId);
            if (!numberDetails) {
                numberDetails = raffle.numbers[numVal] || { number: numVal, name: '', phone: '', paid: false };
            }
            
            window.EditModal.render(root, numberDetails, async (updatedData) => {
                const finalData = updatedData === null ? { name: '', phone: '', paid: false } : updatedData;
                finalData.sellerId = finalSellerId;
                
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
