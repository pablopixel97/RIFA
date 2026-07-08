// Main Application Router
const App = {
    state: {
        user: window.Storage.getSession(),
        currentView: 'login', // Initial view, will check login on init
        selectedRaffleId: null,
        theme: localStorage.getItem('rifas_theme') || 'dark'
    },

    init() {
        // Setup toast container
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);

        // Bind global toast helper
        window.showToast = (message, type = 'success') => {
            const container = document.getElementById('toast-container');
            if (!container) return;

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            
            let iconName = 'check-circle-2';
            if (type === 'danger') iconName = 'alert-octagon';
            if (type === 'warning') iconName = 'alert-triangle';

            toast.innerHTML = `
                <i data-lucide="${iconName}" style="width:20px; height:20px;"></i>
                <span style="font-size:0.9rem; font-weight:500;">${message}</span>
            `;

            container.appendChild(toast);
            
            if (window.lucide) {
                window.lucide.createIcons({
                    attrs: {
                        style: 'stroke-width: 2.5px;'
                    }
                });
            }

            // Animate removal
            setTimeout(() => {
                toast.style.transition = 'all 0.3s ease';
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(20px)';
                setTimeout(() => toast.remove(), 300);
            }, 3500);
        };

        // Setup theme initial state
        document.documentElement.setAttribute('data-theme', this.state.theme);
        
        this.renderHeader();
        this.checkAuth();
    },

    renderHeader() {
        const header = document.getElementById('app-header');
        if (!header) return;

        const isLight = this.state.theme === 'light';

        header.innerHTML = `
            <div class="logo-container" id="logo-header-link" style="cursor: pointer;">
                <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="12" height="12" x="2" y="10" rx="2" ry="2"/>
                    <path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L8.46 8"/>
                    <path d="M6 18h.01"/>
                    <path d="M10 14h.01"/>
                    <path d="M15 6h.01"/>
                    <path d="M18 9h.01"/>
                </svg>
                <div class="logo-text">Rifapp</div>
            </div>
            <div class="nav-actions">
                <button class="theme-toggle-btn" id="theme-toggle" title="Cambiar Tema">
                    <i data-lucide="${isLight ? 'moon' : 'sun'}" style="width: 20px; height: 20px;"></i>
                </button>
                ${this.state.user ? `
                    <span class="header-user-badge">
                        <i data-lucide="user" style="width:14px; height:14px;"></i>
                        <span class="header-user-name">${this.state.user.username}</span>
                    </span>
                    <button class="btn btn-secondary" id="btn-logout" style="padding:0.4rem 0.8rem; font-size:0.85rem;">
                        <i data-lucide="log-out" style="width: 14px; height: 14px;"></i>
                        <span>Salir</span>
                    </button>
                ` : ''}
            </div>
        `;

        if (window.lucide) {
            window.lucide.createIcons();
        }

        const logoLink = header.querySelector('#logo-header-link');
        if (logoLink) {
            logoLink.addEventListener('click', () => {
                if (this.state.user) {
                    this.state.currentView = 'dashboard';
                    this.state.selectedRaffleId = null;
                    this.renderHeader();
                    this.navigate();
                }
            });
        }

        const toggle = header.querySelector('#theme-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => {
                this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
                localStorage.setItem('rifas_theme', this.state.theme);
                document.documentElement.setAttribute('data-theme', this.state.theme);
                this.renderHeader();
            });
        }

        const logoutBtn = header.querySelector('#btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                window.Storage.clearSession();
                this.state.user = null;
                this.state.currentView = 'login';
                this.state.selectedRaffleId = null;
                this.renderHeader();
                this.navigate();
                window.showToast("Sesión cerrada", "warning");
            });
        }
    },

    checkAuth() {
        const urlParams = new URLSearchParams(window.location.search);
        const raffleId = urlParams.get('raffle');
        
        if (this.state.user) {
            fetch('/api/auth/me', {
                headers: window.Storage.getHeaders()
            })
            .then(res => {
                if (res.ok) return res.json();
                throw new Error("Invalid token");
            })
            .then(data => {
                if (data && data.id) {
                    this.state.user.id = data.id;
                    localStorage.setItem('rifa_session_id', String(data.id));
                }
            })
            .catch(err => {
                console.warn("Failed to check session profile:", err);
            });
        }
        
        if (raffleId) {
            this.state.currentView = 'public-view';
            this.state.selectedRaffleId = raffleId;
        } else if (this.state.user) {
            this.state.currentView = 'dashboard';
        } else {
            this.state.currentView = 'login';
        }
        this.navigate();
    },

    navigate() {
        const main = document.getElementById('app-main');
        if (!main) return;

        main.innerHTML = '';

        if (this.state.currentView === 'login') {
            window.Login.render(main, this.state, (userData) => {
                this.state.user = userData;
                this.state.currentView = 'dashboard';
                this.renderHeader();
                this.navigate();
                window.showToast(`¡Bienvenido de nuevo, ${userData.username}!`, "success");
            });
        } else if (this.state.currentView === 'dashboard') {
            window.Dashboard.render(main, this.state, {
                onRaffleSelect: (id, isCollab) => {
                    this.state.selectedRaffleId = id;
                    this.state.currentView = isCollab ? 'collab-view' : 'raffle';
                    this.navigate();
                }
            });
        } else if (this.state.currentView === 'raffle') {
            window.RaffleView.render(main, this.state, this.state.selectedRaffleId, {
                onGoBack: () => {
                    this.state.selectedRaffleId = null;
                    this.state.currentView = 'dashboard';
                    this.navigate();
                }
            });
        } else if (this.state.currentView === 'public-view') {
            window.PublicView.render(main, this.state.selectedRaffleId);
        } else if (this.state.currentView === 'collab-view') {
            window.RaffleView.render(main, this.state, this.state.selectedRaffleId, {
                isCollaborator: true,
                onGoBack: () => {
                    this.state.selectedRaffleId = null;
                    this.state.currentView = 'dashboard';
                    this.navigate();
                }
            });
        }
    }
};

// Initialize App when DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    window.App = App;
    App.init();
});
