// REST API storage helper client
window.Storage = {
    // Helper to get JWT token
    getToken() {
        return localStorage.getItem('rifa_jwt_token');
    },

    // Helper to check authentication headers
    getHeaders() {
        const token = this.getToken();
        const collabKey = localStorage.getItem('rifa_collab_key') || '';
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'x-collaborator-key': collabKey
        };
    },

    // Get session
    getSession() {
        const email = localStorage.getItem('rifa_session_email');
        const token = this.getToken();
        const name = localStorage.getItem('rifa_session_name');
        return (email && token) ? { email, username: name || email } : null;
    },

    // Save session
    saveSession(email, token, name) {
        localStorage.setItem('rifa_session_email', email);
        localStorage.setItem('rifa_jwt_token', token);
        if (name) localStorage.setItem('rifa_session_name', name);
    },

    // Clear session
    clearSession() {
        localStorage.removeItem('rifa_session_email');
        localStorage.removeItem('rifa_jwt_token');
        localStorage.removeItem('rifa_session_name');
    },

    // Get all raffles (async)
    async getRaffles() {
        const res = await fetch('/api/raffles', {
            headers: this.getHeaders()
        });
        if (res.status === 401 || res.status === 403) {
            // Token expired or invalid - force logout
            this.clearSession();
            const err = new Error('SESSION_EXPIRED');
            err.status = res.status;
            throw err;
        }
        if (!res.ok) {
            const err = new Error(`Error fetching raffles (${res.status})`);
            err.status = res.status;
            throw err;
        }
        return await res.json();
    },

    // Get a specific raffle (and its tickets/draws)
    async getRaffle(id) {
        try {
            const res = await fetch(`/api/raffles/${id}/numbers`, {
                headers: this.getHeaders()
            });
            if (!res.ok) throw new Error("Error fetching raffle numbers");
            
            const detailData = await res.json();
            
            return {
                id: detailData.id,
                name: detailData.title,
                size: detailData.size,
                date: detailData.draw_date,
                ticketPrice: detailData.ticket_price,
                collaboratorKey: detailData.collaborator_key,
                numbers: detailData.numbers,
                draws: detailData.draws
            };
        } catch (err) {
            console.error(err);
            return null;
        }
    },

    // Get public raffle details (visitor view)
    async getPublicRaffle(id) {
        try {
            const res = await fetch(`/api/public/raffles/${id}`);
            if (!res.ok) throw new Error("Rifa pública no encontrada");
            return await res.json();
        } catch (err) {
            console.error(err);
            return null;
        }
    },

    // Save a ticket
    async saveTicket(raffleId, number, ticketData) {
        try {
            const res = await fetch(`/api/tickets/${raffleId}/${number}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(ticketData)
            });
            if (!res.ok) throw new Error("Error updating ticket");
            return await res.json();
        } catch (err) {
            console.error(err);
            throw err;
        }
    },

    // Save a specific raffle settings
    async saveRaffleSettings(raffleId, settings) {
        try {
            const res = await fetch(`/api/raffles/${raffleId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    title: settings.name,
                    drawDate: settings.date,
                    ticketPrice: settings.ticketPrice
                })
            });
            if (!res.ok) throw new Error("Error saving raffle settings");
            return await res.json();
        } catch (err) {
            console.error(err);
            throw err;
        }
    },

    // Create a new raffle (async)
    async createRaffle(name, size, date = '', ticketPrice = 5000) {
        const id = 'raffle_' + Date.now();
        const drawDate = date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        try {
            const res = await fetch('/api/raffles', {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    id,
                    title: name,
                    size,
                    drawDate,
                    ticketPrice
                })
            });
            if (!res.ok) throw new Error("Error creating raffle");
            
            // Return dummy local representation to dashboard
            return {
                id,
                name,
                size,
                date: drawDate,
                ticketPrice,
                numbers: {},
                draws: []
            };
        } catch (err) {
            console.error(err);
            throw err;
        }
    },

    // Save a raffle draws update (post a new draw)
    async recordDraw(raffleId, drawObj) {
        try {
            const res = await fetch(`/api/raffles/${raffleId}/draws`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(drawObj)
            });
            if (!res.ok) throw new Error("Error recording draw");
            return await res.json();
        } catch (err) {
            console.error(err);
            throw err;
        }
    },

    // Delete a raffle (async)
    async deleteRaffle(id) {
        try {
            const res = await fetch(`/api/raffles/${id}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            if (!res.ok) throw new Error("Error deleting raffle");
            return await res.json();
        } catch (err) {
            console.error(err);
            throw err;
        }
    },

    // Bulk update tickets (Excel upload) - splits into batches to avoid Vercel timeout
    async importTickets(raffleId, ticketsList) {
        const BATCH_SIZE = 50;
        try {
            for (let i = 0; i < ticketsList.length; i += BATCH_SIZE) {
                const batch = ticketsList.slice(i, i + BATCH_SIZE);
                const res = await fetch(`/api/raffles/${raffleId}/import`, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify({ ticketsList: batch })
                });
                if (!res.ok) throw new Error("Error importing tickets batch");
            }
            return { success: true };
        } catch (err) {
            console.error(err);
            throw err;
        }
    },

    // Auto-migration routine from localStorage to SQL database
    async checkAndMigrateLocalData() {
        const localData = localStorage.getItem('rifas_app_data');
        if (!localData) return;
        
        try {
            const oldRaffles = JSON.parse(localData);
            if (!Array.isArray(oldRaffles) || oldRaffles.length === 0) return;
            
            console.log("Iniciando migración de localStorage a SQLite...");
            
            for (const oldRaffle of oldRaffles) {
                // 1. Create raffle
                await this.createRaffle(oldRaffle.name, oldRaffle.size, oldRaffle.date, oldRaffle.ticketPrice || 5000);
                
                // 2. Import tickets in bulk
                const ticketsList = Object.values(oldRaffle.numbers || {}).filter(t => t.name !== '' || t.phone !== '');
                if (ticketsList.length > 0) {
                    await this.importTickets(oldRaffle.id, ticketsList);
                }
                
                // 3. Import draws
                if (Array.isArray(oldRaffle.draws)) {
                    for (const draw of oldRaffle.draws) {
                        await this.recordDraw(oldRaffle.id, draw);
                    }
                }
            }
            
            console.log("Migración completada exitosamente.");
            // Clear migration trigger
            localStorage.removeItem('rifas_app_data');
        } catch (err) {
            console.error("Error durante la migración de datos:", err);
        }
    }
};
