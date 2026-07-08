// Login and Registration Component
window.Login = {
    render(container, state, onLoginSuccess) {
        let isSignupMode = false;

        const drawView = () => {
            container.innerHTML = `
                <div class="login-wrapper">
                    <div class="login-card">
                        <svg class="login-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                        <h2>${isSignupMode ? 'Crear Cuenta RifaApp' : 'Acceso RifaApp'}</h2>
                        <p>${isSignupMode ? 'Regístrate para comenzar a gestionar tus rifas' : 'Inicia sesión para administrar tus rifas'}</p>
                        
                        <form id="auth-form">
                            <div class="form-group">
                                <label for="username">Usuario (Email)</label>
                                <input type="email" id="username" class="input-control" value="${isSignupMode ? '' : 'admin@rifa.com'}" placeholder="ejemplo@rifa.com" required autocomplete="username">
                            </div>
                            <div class="form-group">
                                <label for="password">Contraseña</label>
                                <input type="password" id="password" class="input-control" value="${isSignupMode ? '' : 'admin123'}" placeholder="••••••••" required autocomplete="current-password">
                            </div>
                            
                            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">
                                <span>${isSignupMode ? 'Registrar y Entrar' : 'Ingresar'}</span>
                                <i data-lucide="${isSignupMode ? 'user-plus' : 'log-in'}" style="width: 18px; height: 18px;"></i>
                            </button>
                            
                            <div style="margin-top: 1.5rem; font-size: 0.85rem; color: var(--text-secondary);">
                                ${isSignupMode ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'} 
                                <a href="#" id="toggle-mode-btn" style="color: var(--color-primary); text-decoration: none; font-weight: 600;">
                                    ${isSignupMode ? 'Inicia Sesión' : 'Regístrate aquí'}
                                </a>
                            </div>
                            
                            <div id="auth-error" class="login-error" style="display: none; margin-top: 1.25rem;"></div>
                        </form>
                    </div>
                </div>
            `;

            if (window.lucide) {
                window.lucide.createIcons();
            }

            const form = container.querySelector('#auth-form');
            const errorDiv = container.querySelector('#auth-error');
            const toggleBtn = container.querySelector('#toggle-mode-btn');

            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                isSignupMode = !isSignupMode;
                drawView();
            });

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = form.username.value.trim();
                const password = form.password.value;
                errorDiv.style.display = 'none';

                const endpoint = isSignupMode ? '/api/auth/register' : '/api/auth/login';

                try {
                    const res = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ email, password })
                    });

                    const data = await res.json();

                    if (!res.ok) {
                        throw new Error(data.error || 'Ocurrió un error en la autenticación');
                    }

                    // Save session
                    window.Storage.saveSession(data.email, data.token);

                    // Check and run data migration from localStorage to SQL
                    await window.Storage.checkAndMigrateLocalData();

                    // Trigger callback
                    onLoginSuccess({ username: data.email });

                } catch (err) {
                    errorDiv.textContent = err.message;
                    errorDiv.style.display = 'block';

                    // Shake effect on error
                    const card = container.querySelector('.login-card');
                    card.style.transform = 'translateX(-10px)';
                    setTimeout(() => card.style.transform = 'translateX(10px)', 100);
                    setTimeout(() => card.style.transform = 'translateX(-5px)', 200);
                    setTimeout(() => card.style.transform = 'translateX(5px)', 300);
                    setTimeout(() => card.style.transform = 'none', 400);
                }
            });
        };

        drawView();
    }
};
