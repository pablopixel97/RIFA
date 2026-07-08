// Raffle Settings tab component
window.SettingsTab = {
    render(container, raffle, onSettingsChanged) {
        const ticketPrice = raffle.ticketPrice || 5000;
        
        container.innerHTML = `
            <div class="settings-grid">
                <!-- Card 1: General Details -->
                <div class="settings-group-panel" style="display:flex; flex-direction:column; gap: 1rem; background: var(--bg-card);">
                    <h3 style="margin-top: 0; display:flex; align-items:center; gap:0.5rem;">
                        <i data-lucide="sliders" style="width: 18px; height: 18px; color: var(--color-primary);"></i>
                        <span>Datos del Sorteo</span>
                    </h3>
                    <form id="settings-details-form" style="display:flex; flex-direction:column; gap: 1rem;">
                        <div class="form-group" style="margin-bottom:0;">
                            <label for="settings-name-input">Nombre de la Rifa</label>
                            <input type="text" id="settings-name-input" class="input-control" value="${raffle.name}" required>
                        </div>
                        <div class="form-group" style="margin-bottom:0;">
                            <label for="settings-date-input">Fecha del Sorteo</label>
                            <input type="date" id="settings-date-input" class="input-control" value="${raffle.date || ''}">
                        </div>
                        <div class="form-group" style="margin-bottom:0;">
                            <label for="settings-price-input">Valor del Número ($)</label>
                            <input type="number" id="settings-price-input" class="input-control" value="${ticketPrice}" min="0" step="500">
                        </div>
                        <button type="submit" class="btn btn-primary" style="margin-top: 0.5rem; width: 100%; display:flex; align-items:center; justify-content:center; gap:0.5rem;">
                            <i data-lucide="save" style="width: 16px; height: 16px;"></i>
                            <span>Guardar Configuración</span>
                        </button>
                    </form>
                </div>

                <!-- Card 2: Administrar Números -->
                <div class="settings-group-panel" style="display:flex; flex-direction:column; gap: 1rem; background: var(--bg-card);">
                    <h3 style="margin-top: 0; display:flex; align-items:center; gap:0.5rem;">
                        <i data-lucide="settings-2" style="width: 18px; height: 18px; color: var(--color-primary);"></i>
                        <span>Administrar Números</span>
                    </h3>
                    <form id="settings-size-form" style="display:flex; flex-direction:column; gap: 1rem;">
                        <div class="form-group" style="margin-bottom:0;">
                            <label for="settings-size-input">Total de Números Disponibles</label>
                            <div style="display: flex; gap: 0.5rem;">
                                <input type="number" id="settings-size-input" class="input-control" value="${raffle.size}" min="1" max="10000" placeholder="Ej. 500" required style="flex:1;">
                                <button type="submit" class="btn btn-secondary" style="white-space:nowrap;">Actualizar</button>
                            </div>
                            <p style="font-size:0.75rem; color:var(--text-muted); margin-top: 0.35rem; line-height:1.3;">
                                Nota: Si reduces el tamaño, los números mayores con información de compradores podrían truncarse.
                            </p>
                        </div>
                    </form>
                </div>

                <!-- Card 3: Compartir Rifa -->
                <div class="settings-group-panel" style="display:flex; flex-direction:column; gap: 1rem; background: var(--bg-card);">
                    <h3 style="margin-top: 0; display:flex; align-items:center; gap:0.5rem;">
                        <i data-lucide="share-2" style="width: 18px; height: 18px; color: var(--color-primary);"></i>
                        <span>Compartir Rifa</span>
                    </h3>
                    <div class="form-group" style="margin-bottom:0;">
                        <label>Enlace del Visor Público</label>
                        <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom: 0.5rem; line-height:1.3;">
                            Comparte este enlace con tus clientes para que vean qué números siguen disponibles en tiempo real.
                        </p>
                        <div class="share-url-box">
                            <input type="text" id="share-link-input" class="input-control" value="${window.location.origin}/?raffle=${raffle.id}" readonly style="background: rgba(0,0,0,0.3); font-size:0.85rem;">
                            <button type="button" class="btn btn-secondary" id="btn-copy-link" style="padding:0.75rem; display:flex; align-items:center; justify-content:center;">
                                <i data-lucide="copy" style="width: 16px; height: 16px;"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Card 4: Colaboradores -->
                <div class="settings-group-panel" style="display:flex; flex-direction:column; gap: 1rem; background: var(--bg-card);">
                    <h3 style="margin-top: 0; display:flex; align-items:center; gap:0.5rem;">
                        <i data-lucide="users" style="width: 18px; height: 18px; color: var(--color-primary);"></i>
                        <span>Colaboradores (Vendedores)</span>
                    </h3>
                    <div class="form-group" style="margin-bottom:0; display:flex; flex-direction:column; gap:0.75rem;">
                        <p style="font-size:0.8rem; color:var(--text-secondary); line-height:1.3; margin:0;">
                            Agrega a tu equipo ingresando el correo de su cuenta de RifaApp. Podrán entrar desde su propio dashboard para vender números.
                        </p>
                        <form id="add-collab-form" style="display: flex; gap: 0.5rem; margin-bottom: 0;">
                            <input type="email" id="collab-email-input" class="input-control" placeholder="correo@vendedor.com" required style="font-size: 0.85rem;">
                            <button type="submit" class="btn btn-primary" style="white-space: nowrap; font-size: 0.85rem;">
                                Agregar
                            </button>
                        </form>
                        
                        <div id="collabs-list" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 180px; overflow-y: auto; padding-right: 2px;">
                            <!-- Collaborators list rendered dynamically -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Danger Zone (Standalone bottom panel) -->
            <div class="settings-group-panel" style="margin-top: 1.5rem; background: rgba(239, 68, 68, 0.02); border: 1px solid rgba(239, 68, 68, 0.2); display:flex; flex-direction:column; gap:0.75rem;">
                <h4 style="color:#fca5a5; font-size:0.95rem; margin:0; font-weight:600; display:flex; align-items:center; gap:0.5rem;">
                    <i data-lucide="alert-triangle" style="width:16px; height:16px; color:#fca5a5;"></i>
                    <span>Zona de Peligro</span>
                </h4>
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
                    <p style="font-size:0.8rem; color:var(--text-secondary); margin:0;">
                        Una vez eliminada la rifa, todos los números vendidos, recaudaciones y colaboradores serán borrados permanentemente. Esta acción no se puede deshacer.
                    </p>
                    <button type="button" class="btn btn-danger" id="btn-delete-raffle" style="white-space:nowrap; padding: 0.6rem 1.25rem;">
                        <i data-lucide="trash-2" style="width: 16px; height: 16px; margin-right:0.25rem; display:inline-block; vertical-align:middle;"></i>
                        <span>Eliminar Rifa Permanentemente</span>
                    </button>
                </div>
            </div>
        `;

        if (window.lucide) {
            window.lucide.createIcons();
        }

        const detailsForm = container.querySelector('#settings-details-form');
        const sizeForm = container.querySelector('#settings-size-form');
        const copyBtn = container.querySelector('#btn-copy-link');
        const shareInput = container.querySelector('#share-link-input');
        const deleteRaffleBtn = container.querySelector('#btn-delete-raffle');
        
        const addCollabForm = container.querySelector('#add-collab-form');
        const collabEmailInput = container.querySelector('#collab-email-input');
        const collabsListContainer = container.querySelector('#collabs-list');

        // Collaborators fetch & render loop
        const loadAndRenderCollabs = async () => {
            collabsListContainer.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:center; padding:1.5rem; color:var(--text-muted);">
                    <i data-lucide="loader-circle" style="width:20px;height:20px;animation:spin 1s linear infinite; margin-right: 0.5rem;"></i>
                    <span style="font-size:0.8rem;">Cargando...</span>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();

            const collabs = await window.Storage.getCollaborators(raffle.id);
            
            collabsListContainer.innerHTML = '';
            
            if (collabs.length === 0) {
                collabsListContainer.innerHTML = `<p style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding: 1rem 0;">Aún no has agregado colaboradores a esta rifa.</p>`;
                return;
            }

            collabs.forEach(c => {
                const item = document.createElement('div');
                item.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:0.5rem 0.75rem; border-radius:8px; border:1px solid var(--border-color); font-size:0.85rem;';
                item.innerHTML = `
                    <div style="min-width: 0; flex: 1; padding-right: 0.5rem;">
                        <div style="font-weight:600; color:var(--text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${c.name || 'Sin nombre'}</div>
                        <div style="font-size:0.75rem; color:var(--text-secondary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${c.email}</div>
                    </div>
                    <button class="btn btn-danger btn-icon btn-remove-collab" data-id="${c.id}" style="padding:0.4rem; border-radius:6px; flex-shrink: 0;" title="Remover colaborador">
                        <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                    </button>
                `;
                
                item.querySelector('.btn-remove-collab').addEventListener('click', async () => {
                    if (confirm(`¿Estás seguro de remover a ${c.name || c.email} como colaborador? Perderá acceso a esta rifa.`)) {
                        try {
                            await window.Storage.deleteCollaborator(raffle.id, c.id);
                            window.showToast("Colaborador removido exitosamente", "success");
                            loadAndRenderCollabs();
                        } catch (err) {
                            window.showToast("Error al remover colaborador", "danger");
                        }
                    }
                });

                collabsListContainer.appendChild(item);
            });

            if (window.lucide) window.lucide.createIcons();
        };

        // Add collaborator submit listener
        addCollabForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = collabEmailInput.value.trim();
            if (!email) return;

            const submitBtn = addCollabForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Agregando...';

            try {
                await window.Storage.addCollaborator(raffle.id, email);
                window.showToast("¡Colaborador agregado con éxito!", "success");
                collabEmailInput.value = '';
                loadAndRenderCollabs();
            } catch (err) {
                window.showToast(err.message, "danger");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Agregar';
            }
        });

        // Form 1: Details Update
        detailsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = detailsForm.querySelector('#settings-name-input').value.trim();
            const date = detailsForm.querySelector('#settings-date-input').value;
            const price = parseInt(detailsForm.querySelector('#settings-price-input').value, 10);

            try {
                await window.Storage.saveRaffleSettings(raffle.id, { name, date, ticketPrice: price });
                window.showToast("Datos actualizados correctamente", "success");
                onSettingsChanged();
            } catch (err) {
                window.showToast("Error al actualizar la rifa", "danger");
            }
        });

        // Form 2: Size Update
        sizeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newSize = parseInt(sizeForm.querySelector('#settings-size-input').value, 10);
            
            if (newSize === raffle.size) return;

            const oldSize = raffle.size;
            if (newSize < oldSize) {
                const lostBuyers = [];
                for (let i = newSize + 1; i <= oldSize; i++) {
                    if (raffle.numbers[i] && (raffle.numbers[i].name !== '' || raffle.numbers[i].phone !== '')) {
                        lostBuyers.push(i);
                    }
                }

                if (lostBuyers.length > 0) {
                    const confirmTrunc = confirm(`Atención: Reducir la cantidad a ${newSize} eliminará compradores registrados en los números: ${lostBuyers.join(', ')}. ¿Deseas proceder de todos modos?`);
                    if (!confirmTrunc) return;
                }
            }

            try {
                await window.Storage.saveRaffleSettings(raffle.id, {
                    name: raffle.name,
                    date: raffle.date,
                    ticketPrice: raffle.ticketPrice || 5000,
                    size: newSize
                });
                window.showToast(`Cantidad de números ajustada a ${newSize}`, "success");
                onSettingsChanged();
            } catch (err) {
                window.showToast("Error al cambiar el tamaño de la rifa", "danger");
            }
        });

        // Copy Share Link
        copyBtn.addEventListener('click', () => {
            shareInput.select();
            shareInput.setSelectionRange(0, 99999);
            
            try {
                navigator.clipboard.writeText(shareInput.value);
                window.showToast("¡Enlace público copiado!", "success");
            } catch (err) {
                document.execCommand('copy');
                window.showToast("¡Enlace copiado!", "success");
            }
        });

        // Delete Raffle
        deleteRaffleBtn.addEventListener('click', async () => {
            if (confirm(`¿Estás COMPLETAMENTE seguro de eliminar la rifa "${raffle.name}"? Esta acción no se puede deshacer y borrará todos los números e historial.`)) {
                try {
                    await window.Storage.deleteRaffle(raffle.id);
                    window.showToast("Rifa eliminada exitosamente", "warning");
                    const backBtn = document.querySelector('#btn-back-dashboard');
                    if (backBtn) backBtn.click();
                } catch (err) {
                    window.showToast("Error al eliminar la rifa", "danger");
                }
            }
        });

        // Load collaborators lists on render
        loadAndRenderCollabs();
    }
};
