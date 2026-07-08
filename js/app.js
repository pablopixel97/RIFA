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
            <div class="logo-container">
                <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <div class="logo-text">RifaApp</div>
            </div>
            <div class="nav-actions">
                <button class="theme-toggle-btn" id="theme-toggle" title="Cambiar Tema">
                    <i data-lucide="${isLight ? 'moon' : 'sun'}" style="width: 20px; height: 20px;"></i>
                </button>
                ${this.state.user ? `
                    <span style="font-size:0.9rem; font-weight:600; color:var(--text-secondary); display:flex; align-items:center; gap:0.5rem; background:var(--bg-card); padding:0.4rem 0.8rem; border-radius:30px; border:1px solid var(--border-color);">
                        <i data-lucide="user" style="width:14px; height:14px;"></i>
                        <span>${this.state.user.username}</span>
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
        if (this.state.user) {
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
                onRaffleSelect: (id) => {
                    this.state.selectedRaffleId = id;
                    this.state.currentView = 'raffle';
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
        }
    }
};

// Initialize App when DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    window.App = App;
    App.init();
});
