// Public Visitor View Component
window.PublicView = {
    async render(container, raffleId) {
        // Show loading spinner
        container.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:center; height:70vh; flex-direction:column; gap:1rem; color:var(--text-secondary);">
                <i data-lucide="loader-circle" style="width:40px;height:40px;animation:spin 1s linear infinite;"></i>
                <span>Cargando visor público de la rifa...</span>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();

        const raffle = await window.Storage.getPublicRaffle(raffleId);
        
        if (!raffle) {
            container.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:center; height:70vh; flex-direction:column; gap:1.5rem; color:var(--text-secondary); text-align:center; padding: 2rem;">
                    <i data-lucide="alert-triangle" style="width:48px;height:48px; color:var(--color-danger);"></i>
                    <div>
                        <p style="font-size:1.2rem; font-weight:600; margin-bottom:0.5rem; color:var(--text-primary);">Rifa No Encontrada</p>
                        <p style="font-size:0.9rem; max-width: 400px;">El enlace es inválido, ha caducado o el organizador eliminó la rifa.</p>
                    </div>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        const tickets = raffle.tickets || [];
        
        // Extract unique sellers if in list mode
        const ticketsBySeller = {};
        if (raffle.type === 'list') {
            tickets.forEach(t => {
                if (!ticketsBySeller[t.seller_id]) {
                    ticketsBySeller[t.seller_id] = {
                        id: t.seller_id,
                        name: t.seller_name || 'Organizador',
                        tickets: []
                    };
                }
                ticketsBySeller[t.seller_id].tickets.push(t);
            });
        }
        const sellers = Object.values(ticketsBySeller);
        let selectedSellerId = sellers.length > 0 ? sellers[0].id : null;

        const drawPublicUI = () => {
            // Filter tickets for stats and grid
            const currentTickets = raffle.type === 'list'
                ? tickets.filter(t => t.seller_id === selectedSellerId)
                : tickets;
                
            const total = currentTickets.length;
            const paidCount = currentTickets.filter(t => t.paid).length;
            const takenCount = currentTickets.filter(t => t.taken && !t.paid).length;
            const availableCount = total - (paidCount + takenCount);

            const paidPercent = Math.round((paidCount / total) * 100) || 0;
            const takenPercent = Math.round((takenCount / total) * 100) || 0;
            const availablePercent = 100 - (paidPercent + takenPercent);

            const drawDateFormatted = raffle.draw_date ? new Date(raffle.draw_date + 'T00:00:00').toLocaleDateString('es-ES', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            }) : 'Por definir';

            container.innerHTML = `
                <div class="raffle-view-container">
                    <!-- Header Banner -->
                    <div class="raffle-detail-header">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; width: 100%;">
                            <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span class="badge badge-paid" style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.75rem;">
                                        <i data-lucide="eye" style="width:12px; height:12px;"></i> Visor Público
                                    </span>
                                </div>
                                <h1 style="font-size: 2.25rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.5px; margin: 0.25rem 0;">${raffle.title}</h1>
                                <div style="display: flex; gap: 2rem; flex-wrap: wrap; margin-top: 0.25rem; font-size: 0.95rem; color: var(--text-secondary);">
                                    <span style="display: flex; align-items: center; gap: 0.5rem;">
                                        <i data-lucide="calendar" style="width: 18px; height: 18px; color: var(--color-primary);"></i>
                                        <span>Sorteo: <strong style="color: var(--text-primary);">${drawDateFormatted}</strong></span>
                                    </span>
                                    <span style="display: flex; align-items: center; gap: 0.5rem;">
                                        <i data-lucide="dollar-sign" style="width: 18px; height: 18px; color: var(--color-success);"></i>
                                        <span>Valor del Número: <strong style="color: var(--color-success);">$${raffle.ticket_price.toLocaleString('es-CL')} CLP</strong></span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Winners Banner if any draws exist -->
                    ${raffle.draws && raffle.draws.length > 0 ? `
                        <div class="settings-group-panel" style="border: 1px solid rgba(234, 179, 8, 0.3); background: rgba(234, 179, 8, 0.03); margin-bottom: 1.5rem;">
                            <h3 style="color: var(--color-warning); display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                                <i data-lucide="trophy" style="width: 22px; height: 22px; color: var(--color-warning);"></i>
                                <span>Resultados del Sorteo</span>
                            </h3>
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
                                ${raffle.draws.map((d, index) => `
                                    <div style="display: flex; align-items: center; gap: 1rem; background: var(--bg-card); padding: 0.75rem 1rem; border-radius: 12px; border: 1px solid var(--border-color);">
                                        <div style="width: 40px; height: 40px; border-radius: 50%; background: ${d.type === 'winner' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; color: ${d.type === 'winner' ? 'var(--color-warning)' : 'var(--color-danger)'}; font-weight: bold;">
                                            ${d.type === 'winner' ? '🏆' : '💀'}
                                        </div>
                                        <div>
                                            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">
                                                ${d.type === 'winner' ? `Ganador #${index + 1}` : 'Al Agua'}
                                            </div>
                                            <div style="font-size: 0.85rem; color: var(--text-secondary);">
                                                Número: <strong style="color: var(--color-primary); font-size: 0.95rem;">${d.number}</strong> 
                                                ${d.buyer.name ? `(${d.buyer.name})` : '(No vendido)'}
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Stats Dashboard Grid -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                        <div class="stat-card">
                            <div class="stat-value" style="color: var(--text-primary);">${total}</div>
                            <div class="stat-label">Total de Números</div>
                        </div>
                        <div class="stat-card" style="border-left: 4px solid var(--color-success);">
                            <div class="stat-value" style="color: var(--color-success);">${availableCount}</div>
                            <div class="stat-label">Disponibles (${availablePercent}%)</div>
                        </div>
                        <div class="stat-card" style="border-left: 4px solid var(--color-warning);">
                            <div class="stat-value" style="color: var(--color-warning);">${takenCount}</div>
                            <div class="stat-label">Reservados (${takenPercent}%)</div>
                        </div>
                        <div class="stat-card" style="border-left: 4px solid var(--color-primary);">
                            <div class="stat-value" style="color: var(--color-primary);">${paidCount}</div>
                            <div class="stat-label">Pagados (${paidPercent}%)</div>
                        </div>
                    </div>

                    <!-- Grid and Filters -->
                    <div class="settings-group-panel">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem; border-bottom:1px solid var(--border-color); padding-bottom:1rem;">
                            <h3 style="margin: 0; font-size:1.15rem; display:flex; align-items:center; gap:0.5rem;">
                                <i data-lucide="grid" style="width: 18px; height: 18px; color: var(--color-primary);"></i>
                                <span>Tabla de Números</span>
                            </h3>
                            
                            <!-- Search and Filter -->
                            <div style="display: flex; gap: 0.5rem; flex: 1; max-width: 400px; justify-content: flex-end;">
                                <input type="text" id="public-search-input" class="input-control" placeholder="Buscar por número..." style="padding: 0.5rem 0.75rem; font-size: 0.85rem;">
                                <select id="public-filter-select" class="input-control" style="width: 130px; padding: 0.5rem; font-size: 0.85rem;">
                                    <option value="all">Todos</option>
                                    <option value="available">Disponibles</option>
                                    <option value="taken">Reservados</option>
                                    <option value="paid">Pagados</option>
                                </select>
                            </div>
                        </div>

                        ${raffle.type === 'list' ? `
                            <div class="form-group" style="max-width: 350px; margin-bottom: 1.5rem;">
                                <label for="public-seller-select" style="font-weight:600; font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.4rem; display:block;">Selecciona una Lista de Vendedor:</label>
                                <select id="public-seller-select" class="input-control" style="background:rgba(255,255,255,0.03); cursor:pointer; font-size:0.85rem;">
                                    ${sellers.map(s => `
                                        <option value="${s.id}" ${s.id === selectedSellerId ? 'selected' : ''}>
                                            ${s.name} (${s.tickets.filter(t => t.taken).length}/${s.tickets.length} vendidos)
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        ` : ''}

                        <!-- Main Numbers Grid -->
                        <div class="numbers-grid" id="public-numbers-grid">
                            <!-- JS renders numbers here -->
                        </div>
                    </div>
                </div>
            `;

            if (window.lucide) {
                window.lucide.createIcons();
            }

            const gridContainer = container.querySelector('#public-numbers-grid');
            const searchInput = container.querySelector('#public-search-input');
            const filterSelect = container.querySelector('#public-filter-select');
            const sellerSelect = container.querySelector('#public-seller-select');

            // Render Numbers Grid helper
            const renderGrid = (searchVal = '', filterVal = 'all') => {
                gridContainer.innerHTML = '';
                
                currentTickets.forEach(t => {
                    // Filters
                    const numStr = t.number.toString();
                    const nameStr = t.name.toLowerCase();
                    const matchesSearch = numStr.includes(searchVal) || nameStr.includes(searchVal.toLowerCase());
                    
                    let matchesFilter = true;
                    if (filterVal === 'available') matchesFilter = !t.taken;
                    if (filterVal === 'taken') matchesFilter = t.taken && !t.paid;
                    if (filterVal === 'paid') matchesFilter = t.paid;

                    if (!matchesSearch || !matchesFilter) return;

                    // Determine Class based on status
                    let stateClass = 'available';
                    let isUnpaid = false;
                    if (t.taken && !t.paid) {
                        stateClass = 'bought';
                        isUnpaid = true;
                    } else if (t.paid) {
                        stateClass = 'bought';
                    }

                    const item = document.createElement('div');
                    item.className = `number-card ${stateClass} ${isUnpaid ? 'unpaid' : ''}`;
                    item.style.cursor = 'default';
                    item.innerHTML = `
                        <div class="number-num">${t.number}</div>
                        ${t.taken ? `<span class="number-card-buyer-preview">${t.name}</span>` : ''}
                    `;
                    
                    gridContainer.appendChild(item);
                });
            };

            // Events
            searchInput.addEventListener('input', (e) => renderGrid(e.target.value, filterSelect.value));
            filterSelect.addEventListener('change', (e) => renderGrid(searchInput.value, e.target.value));
            
            if (sellerSelect) {
                sellerSelect.addEventListener('change', (e) => {
                    selectedSellerId = parseInt(e.target.value, 10);
                    drawPublicUI();
                });
            }

            // Initial Render
            renderGrid();
        };

        drawPublicUI();
    }
};
