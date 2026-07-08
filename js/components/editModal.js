// Edit Buyer Modal Component
window.EditModal = {
    render(container, numberDetails, onSaveCallback) {
        const isBought = numberDetails.name !== '' || numberDetails.phone !== '';

        container.innerHTML = `
            <div class="modal-overlay" id="edit-buyer-modal">
                <div class="modal-content" style="max-width: 480px;">
                    <div class="modal-header">
                        <h3 class="modal-title">Editar Número ${numberDetails.number}</h3>
                        <button class="modal-close" id="edit-modal-close">
                            <i data-lucide="x" style="width: 20px; height: 20px;"></i>
                        </button>
                    </div>
                    <form id="edit-buyer-form">
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="buyer-name-input">Nombre del Comprador</label>
                                <input type="text" id="buyer-name-input" class="input-control" placeholder="Ej. Juan Pérez" value="${numberDetails.name}">
                            </div>
                            
                            <div class="form-group">
                                <label for="buyer-phone-input">Teléfono / WhatsApp</label>
                                <input type="text" id="buyer-phone-input" class="input-control" placeholder="Ej. +56 9 1234 5678" value="${numberDetails.phone}">
                            </div>
                            
                            <div class="switch-container">
                                <div>
                                    <span style="display:block; font-weight: 600; font-size: 0.95rem;">Estado de Pago</span>
                                    <span class="switch-label-desc" id="payment-status-desc">
                                        ${numberDetails.paid ? 'Confirmado (Pagado)' : 'Pendiente (Por cobrar)'}
                                    </span>
                                </div>
                                <label class="switch">
                                    <input type="checkbox" id="buyer-paid-checkbox" ${numberDetails.paid ? 'checked' : ''}>
                                    <span class="slider"></span>
                                </label>
                            </div>
                            
                            ${isBought ? `
                                <div style="margin-top: 1rem; text-align: center;">
                                    <button type="button" class="btn btn-danger" id="btn-delete-buyer" style="width: 100%;">
                                        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                                        <span>Eliminar Comprador</span>
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="modal-footer" style="justify-content: space-between;">
                            <div></div>
                            <div style="display: flex; gap: 0.75rem;">
                                <button type="button" class="btn btn-secondary" id="edit-modal-cancel">Cancelar</button>
                                <button type="submit" class="btn btn-primary">Guardar</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        `;

        if (window.lucide) {
            window.lucide.createIcons();
        }

        const modal = container.querySelector('#edit-buyer-modal');
        const form = container.querySelector('#edit-buyer-form');
        const closeBtn = container.querySelector('#edit-modal-close');
        const cancelBtn = container.querySelector('#edit-modal-cancel');
        const paidCheckbox = container.querySelector('#buyer-paid-checkbox');
        const statusDesc = container.querySelector('#payment-status-desc');
        const deleteBtn = container.querySelector('#btn-delete-buyer');

        const closeModal = () => {
            modal.style.display = 'none';
            container.innerHTML = ''; // Destroy
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        paidCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                statusDesc.textContent = 'Confirmado (Pagado)';
                statusDesc.style.color = 'var(--color-success)';
            } else {
                statusDesc.textContent = 'Pendiente (Por cobrar)';
                statusDesc.style.color = 'var(--text-secondary)';
            }
        });

        if (numberDetails.paid) {
            statusDesc.style.color = 'var(--color-success)';
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (confirm(`¿Estás seguro de liberar el número ${numberDetails.number}? Se borrarán los datos del comprador.`)) {
                    onSaveCallback(null); // Trigger deletion
                    window.showToast(`Se liberó el número ${numberDetails.number}`, "warning");
                    closeModal();
                }
            });
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = form.querySelector('#buyer-name-input').value.trim();
            const phone = form.querySelector('#buyer-phone-input').value.trim();
            const paid = paidCheckbox.checked;

            onSaveCallback({
                name,
                phone,
                paid
            });

            window.showToast(`Número ${numberDetails.number} actualizado`, "success");
            closeModal();
        });
    }
};
