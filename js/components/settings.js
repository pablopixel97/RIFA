// Raffle Settings tab component
window.SettingsTab = {
    render(container, raffle, onSettingsChanged) {
        const ticketPrice = raffle.ticketPrice || 5000;
        
        container.innerHTML = `
            <div class="settings-grid">
                <!-- Group 1: General Details -->
                <div class="settings-group-panel">
                    <h3>
                        <i data-lucide="sliders" style="width: 18px; height: 18px;"></i>
                        <span>Datos del Sorteo</span>
                    </h3>
                    <form id="settings-details-form">
                        <div class="form-group">
                            <label for="settings-name-input">Nombre de la Rifa</label>
                            <input type="text" id="settings-name-input" class="input-control" value="${raffle.name}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="settings-date-input">Fecha del Sorteo</label>
                            <input type="date" id="settings-date-input" class="input-control" value="${raffle.date || ''}">
                        </div>

                        <div class="form-group">
                            <label for="settings-price-input">Valor del Número ($)</label>
                            <input type="number" id="settings-price-input" class="input-control" value="${ticketPrice}" min="0" step="500">
                        </div>

                        <button type="submit" class="btn btn-primary" style="margin-top: 0.5rem; width: 100%;">
                            <i data-lucide="save" style="width: 16px; height: 16px;"></i>
                            <span>Guardar Configuración</span>
                        </button>
                    </form>
                </div>

                <!-- Group 2: Sizes & Actions -->
                <div class="settings-group-panel" style="display:flex; flex-direction:column; justify-content:space-between;">
                    <div>
                        <h3>
                            <i data-lucide="settings-2" style="width: 18px; height: 18px;"></i>
                            <span>Administrar Números</span>
                        </h3>
                        <form id="settings-size-form" style="margin-bottom: 2rem;">
                            <div class="form-group">
                                <label for="settings-size-input">Total de Números Disponibles</label>
                                <div style="display: flex; gap: 0.5rem;">
                                    <select id="settings-size-input" class="input-control" style="flex:1;">
                                        <option value="100" ${raffle.size === 100 ? 'selected' : ''}>100 Números</option>
                                        <option value="200" ${raffle.size === 200 ? 'selected' : ''}>200 Números</option>
                                        <option value="500" ${raffle.size === 500 ? 'selected' : ''}>500 Números</option>
                                        <option value="1000" ${raffle.size === 1000 ? 'selected' : ''}>1000 Números</option>
                                        <option value="2000" ${raffle.size === 2000 ? 'selected' : ''}>2000 Números</option>
                                    </select>
                                    <button type="submit" class="btn btn-secondary">Actualizar</button>
                                </div>
                                <p style="font-size:0.75rem; color:var(--text-muted); margin-top: 0.35rem;">
                                    Nota: Si reduces el tamaño, los números mayores con información de compradores podrían truncarse.
                                </p>
                            </div>
                        </form>

                        <h3>
                            <i data-lucide="share-2" style="width: 18px; height: 18px;"></i>
                            <span>Compartir Rifa</span>
                        </h3>
                        <div class="form-group">
                            <label>Enlace del Visor Público</label>
                            <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom: 0.5rem;">
                                Comparte este enlace con tus clientes para que vean qué números siguen disponibles en tiempo real.
                            </p>
                            <div class="share-url-box">
                                <input type="text" id="share-link-input" class="input-control" value="${window.location.origin}/?raffle=${raffle.id}" readonly style="background: rgba(0,0,0,0.3); font-size:0.85rem;">
                                <button type="button" class="btn btn-secondary" id="btn-copy-link" style="padding:0.75rem;">
                                    <i data-lucide="copy" style="width: 16px; height: 16px;"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style="border-top:1px solid rgba(239, 68, 68, 0.2); padding-top: 1.5rem; margin-top: 1rem;">
                        <h4 style="color:#fca5a5; font-size:0.95rem; margin-bottom:0.5rem; font-weight:600;">Zona de Peligro</h4>
                        <button type="button" class="btn btn-danger" id="btn-delete-raffle" style="width: 100%;">
                            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                            <span>Eliminar esta Rifa Permanentemente</span>
                        </button>
                    </div>
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
                window.showToast("¡Enlace copiado al portapapeles!", "success");
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
    }
};
