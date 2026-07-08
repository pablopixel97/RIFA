// Dashboard Component
window.Dashboard = {
    async render(container, state, callbacks) {
        // Show loading state first
        container.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:center; height:60vh; flex-direction:column; gap:1rem; color:var(--text-secondary);">
                <i data-lucide="loader-circle" style="width:40px;height:40px;animation:spin 1s linear infinite;"></i>
                <span>Cargando sorteos...</span>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();

        let raffles;
        try {
            raffles = await window.Storage.getRaffles();
        } catch (err) {
            console.error('Dashboard load error:', err);
            if (err.message === 'SESSION_EXPIRED') {
                // Redirect to login automatically
                state.user = null;
                state.currentView = 'login';
                if (window.App) { window.App.renderHeader(); window.App.navigate(); }
                return;
            }
            // Show error with retry button
            container.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:center; height:60vh; flex-direction:column; gap:1.5rem; color:var(--text-secondary); text-align:center;">
                    <i data-lucide="wifi-off" style="width:48px;height:48px; color:var(--color-danger);"></i>
                    <div>
                        <p style="font-size:1.1rem; font-weight:600; margin-bottom:0.5rem;">Error al cargar los sorteos</p>
                        <p style="font-size:0.85rem;">${err.message}</p>
                    </div>
                    <button class="btn btn-primary" id="retry-btn">
                        <i data-lucide="refresh-cw" style="width:16px;height:16px;"></i>
                        <span>Reintentar</span>
                    </button>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            document.getElementById('retry-btn').addEventListener('click', () => {
                window.Dashboard.render(container, state, callbacks);
            });
            return;
        }

        container.innerHTML = `
            <div class="dashboard-header">
                <div class="dashboard-title">
                    <h1>Mis Sorteos</h1>
                    <p>Gestiona, edita y realiza sorteos de tus rifas activas</p>
                </div>
                <div class="dashboard-actions" style="display: flex; gap: 1rem;">
                    <button class="btn btn-primary" id="btn-new-raffle">
                        <i data-lucide="plus-circle" style="width: 18px; height: 18px;"></i>
                        <span>Nueva Rifa</span>
                    </button>
                </div>
            </div>

            <div class="raffle-grid" id="raffle-grid-container">
                ${raffles.map(r => {
                    const soldCount = r.sold_count || 0;
                    const paidCount = r.paid_count || 0;
                    const soldPercent = Math.round((soldCount / r.size) * 100);
                    
                    return `
                        <div class="raffle-card" data-id="${r.id}" data-collab="${!!r.is_collaborator}">
                            <div class="raffle-card-top">
                                <div class="raffle-name" style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                                    <span>${r.title}</span>
                                    ${r.is_collaborator ? `<span class="badge" style="background:rgba(168,85,247,0.12); color:#c084fc; border:1px solid rgba(168,85,247,0.25); font-size:0.7rem; padding:0.15rem 0.45rem; border-radius:12px;">Colaborador</span>` : ''}
                                </div>
                                <span class="badge ${r.size <= 200 ? 'badge-available' : 'badge-paid'}">${r.size} Núm.</span>
                            </div>
                            <div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                                    <span>Progreso de Ventas</span>
                                    <span>${soldCount}/${r.size} (${soldPercent}%)</span>
                                </div>
                                <div class="progress-container">
                                    <div class="progress-bar" style="width: ${soldPercent}%;"></div>
                                </div>
                            </div>
                            <div class="raffle-card-stats">
                                <span>Fecha: ${r.draw_date || 'Sin fecha'}</span>
                                <span style="color: var(--color-success); font-weight: 600;">Pagados: ${paidCount}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
                
                ${raffles.length === 0 ? `
                    <div class="no-raffles">
                        <i data-lucide="ticket" style="width: 3.5rem; height: 3.5rem; color: var(--text-muted);"></i>
                        <h3>Aún no tienes rifas registradas</h3>
                        <p>Haz clic en "Nueva Rifa" para crear tu primer sorteo manualmente o importando datos.</p>
                        <button class="btn btn-primary" id="btn-no-raffles-create" style="margin-top: 0.5rem;">Crear Rifa</button>
                    </div>
                ` : ''}
            </div>
            
            <!-- Create Raffle Modal (hidden by default) -->
            <div class="modal-overlay" id="create-modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">Nueva Rifa</h3>
                        <button class="modal-close" id="modal-close-btn">
                            <i data-lucide="x" style="width: 20px; height: 20px;"></i>
                        </button>
                    </div>
                    <form id="create-raffle-form">
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="raffle-name-input">Nombre de la Rifa</label>
                                <input type="text" id="raffle-name-input" class="input-control" placeholder="Ej. Rifa Gran Sorteo Anual" required>
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 1.25rem;">
                                <label style="display:block; margin-bottom:0.5rem; font-weight:600; font-size:0.9rem; color:var(--text-secondary);">Modalidad de Venta</label>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                    <label class="input-control" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.6rem 0.8rem; background: rgba(255,255,255,0.02); border-radius: 8px;">
                                        <input type="radio" name="raffle-type" value="single" checked style="accent-color: var(--color-primary); width:16px; height:16px;">
                                        <div>
                                            <div style="font-weight:700; font-size:0.85rem; color:var(--text-primary);">Rifa Única</div>
                                            <div style="font-size:0.7rem; color:var(--text-secondary);">Pozo de números único</div>
                                        </div>
                                    </label>
                                    <label class="input-control" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.6rem 0.8rem; background: rgba(255,255,255,0.02); border-radius: 8px;">
                                        <input type="radio" name="raffle-type" value="list" style="accent-color: var(--color-primary); width:16px; height:16px;">
                                        <div>
                                            <div style="font-weight:700; font-size:0.85rem; color:var(--text-primary);">Por Listas</div>
                                            <div style="font-size:0.7rem; color:var(--text-secondary);">Una lista por vendedor</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                <div class="form-group">
                                    <label id="size-input-label" for="raffle-size-input">Cantidad de Números</label>
                                    <input type="number" id="raffle-size-input" class="input-control" value="500" min="1" max="10000" placeholder="Ej. 500" required>
                                </div>
                                <div class="form-group">
                                    <label for="raffle-date-input">Fecha del Sorteo</label>
                                    <input type="date" id="raffle-date-input" class="input-control">
                                </div>
                            </div>
                            
                            <div id="create-import-container" style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                                <label style="display: block; font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-secondary);">
                                    Importar desde archivo (Opcional)
                                </label>
                                <div class="import-section" id="import-drop-area">
                                    <input type="file" id="import-file-input" class="file-input" accept=".xlsx, .xls, .docx">
                                    <i data-lucide="file-spreadsheet" class="import-icon" id="import-icon"></i>
                                    <div class="import-label" id="import-status-text">Arrastra o haz clic para subir Excel o Word</div>
                                    <div class="import-hint" id="import-hint-text">Carga datos de compradores de forma masiva (.xlsx, .docx)</div>
                                </div>
                                <div id="selected-file-badge-container" style="display: none; text-align: center;">
                                    <div class="file-selected-badge" id="file-badge">
                                        <i data-lucide="check"></i>
                                        <span id="file-name-text">nombre_archivo.xlsx</span>
                                        <button type="button" id="remove-file-btn" style="background:none; border:none; color:inherit; cursor:pointer; margin-left:5px;">
                                            <i data-lucide="trash" style="width: 14px; height: 14px;"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" id="modal-cancel-btn">Cancelar</button>
                            <button type="submit" class="btn btn-primary" id="modal-submit-btn">Crear Rifa</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        if (window.lucide) {
            window.lucide.createIcons();
        }

        const cards = container.querySelectorAll('.raffle-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-id');
                const isCollab = card.getAttribute('data-collab') === 'true';
                callbacks.onRaffleSelect(id, isCollab);
            });
        });

        const modal = container.querySelector('#create-modal');
        const openModalBtn = container.querySelector('#btn-new-raffle');
        const noRafflesBtn = container.querySelector('#btn-no-raffles-create');
        const closeModalBtn = container.querySelector('#modal-close-btn');
        const cancelBtn = container.querySelector('#modal-cancel-btn');
        
        const openModal = () => {
            modal.style.display = 'flex';
            form.reset();
            resetFileState();
        };

        if (openModalBtn) openModalBtn.addEventListener('click', openModal);
        if (noRafflesBtn) noRafflesBtn.addEventListener('click', openModal);

        const closeModal = () => {
            modal.style.display = 'none';
        };
        closeModalBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        const fileInput = container.querySelector('#import-file-input');
        const importArea = container.querySelector('#import-drop-area');
        const fileBadgeContainer = container.querySelector('#selected-file-badge-container');
        const fileNameText = container.querySelector('#file-name-text');
        const removeFileBtn = container.querySelector('#remove-file-btn');
        const raffleSizeSelect = container.querySelector('#raffle-size-input');

        let selectedFile = null;

        const updateFileUI = (file) => {
            if (file) {
                selectedFile = file;
                importArea.style.display = 'none';
                fileBadgeContainer.style.display = 'block';
                fileNameText.textContent = file.name;
                
                const badge = container.querySelector('#file-badge');
                if (file.name.endsWith('.docx')) {
                    badge.style.borderColor = '#3b82f6';
                    badge.style.color = '#60a5fa';
                } else {
                    badge.style.borderColor = '#10b981';
                    badge.style.color = '#34d399';
                }
                
                const nameInput = container.querySelector('#raffle-name-input');
                if (nameInput.value === '') {
                    nameInput.value = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                }
                
                raffleSizeSelect.disabled = true;
                raffleSizeSelect.placeholder = 'Se auto-detectará';
                raffleSizeSelect.value = '';
            }
        };

        const resetFileState = () => {
            selectedFile = null;
            fileInput.value = '';
            importArea.style.display = 'block';
            fileBadgeContainer.style.display = 'none';
            raffleSizeSelect.disabled = false;
            raffleSizeSelect.placeholder = 'Ej. 500';
            raffleSizeSelect.value = '500';
        };

        const typeInputs = container.querySelectorAll('input[name="raffle-type"]');
        const sizeInputLabel = container.querySelector('#size-input-label');
        const createImportContainer = container.querySelector('#create-import-container');

        typeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const isList = e.target.value === 'list';
                if (isList) {
                    sizeInputLabel.textContent = 'Números por Lista';
                    container.querySelector('#raffle-size-input').value = '100';
                    createImportContainer.style.display = 'none';
                    resetFileState();
                } else {
                    sizeInputLabel.textContent = 'Cantidad de Números';
                    container.querySelector('#raffle-size-input').value = '500';
                    createImportContainer.style.display = 'block';
                }
            });
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                updateFileUI(e.target.files[0]);
            }
        });

        removeFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resetFileState();
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            importArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                importArea.style.borderColor = 'var(--color-primary)';
                importArea.style.background = 'rgba(99, 102, 241, 0.08)';
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            importArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                importArea.style.borderColor = 'var(--border-color)';
                importArea.style.background = 'rgba(0, 0, 0, 0.15)';
            }, false);
        });

        importArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files && files[0]) {
                updateFileUI(files[0]);
            }
        });

        const form = container.querySelector('#create-raffle-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = container.querySelector('#modal-submit-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creando...';
            
            const name = form.querySelector('#raffle-name-input').value.trim();
            const defaultSize = parseInt(form.querySelector('#raffle-size-input').value, 10);
            const date = form.querySelector('#raffle-date-input').value;
            const type = form.querySelector('input[name="raffle-type"]:checked').value;
            
            try {
                if (selectedFile) {
                    let parsedData;
                    if (selectedFile.name.endsWith('.docx')) {
                        parsedData = await window.Parser.parseWord(selectedFile);
                    } else if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
                        parsedData = await window.Parser.parseExcel(selectedFile);
                    } else {
                        throw new Error("Formato de archivo no soportado. Sube un archivo Excel (.xlsx) o Word (.docx)");
                    }
                    
                    const newRaffle = await window.Storage.createRaffle(name, parsedData.size, date, 5000, 'single', 0);
                    const ticketsList = Object.values(parsedData.numbers).filter(t => t.name !== '' || t.phone !== '');
                    if (ticketsList.length > 0) {
                        const BATCH_SIZE = 50;
                        for (let i = 0; i < ticketsList.length; i += BATCH_SIZE) {
                            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
                            const totalBatches = Math.ceil(ticketsList.length / BATCH_SIZE);
                            submitBtn.textContent = `Importando... (${batchNum}/${totalBatches})`;
                        }
                        await window.Storage.importTickets(newRaffle.id, ticketsList);
                    }

                    
                    window.showToast(`Rifa creada exitosamente con ${parsedData.size} números importados!`, 'success');
                    closeModal();
                    callbacks.onRaffleSelect(newRaffle.id);
                } else {
                    const newRaffle = await window.Storage.createRaffle(name, defaultSize, date, 5000, type, type === 'list' ? defaultSize : 0);
                    window.showToast("Rifa creada de manera manual!", 'success');
                    closeModal();
                    callbacks.onRaffleSelect(newRaffle.id);
                }
            } catch (err) {
                console.error(err);
                window.showToast("Error al importar el archivo: " + err.message, 'danger');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Crear Rifa';
            }
        });
    }
};
