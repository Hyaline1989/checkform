// Модуль авторизации
class AuthManager {
    constructor(apiClient) {
        this.api = apiClient;
        this.isAuthenticated = false;
        this.onAuthChangeCallbacks = [];
    }

    onAuthChange(callback) {
        this.onAuthChangeCallbacks.push(callback);
    }

    notifyAuthChange() {
        this.onAuthChangeCallbacks.forEach(cb => cb(this.isAuthenticated));
    }

    async checkAuthentication() {
        const isValid = await this.api.verifyToken();
        this.isAuthenticated = isValid;
        if (!isValid) {
            this.api.clearToken();
        }
        this.notifyAuthChange();
        return this.isAuthenticated;
    }

    async login(password) {
        try {
            const result = await this.api.login(password);
            if (result.success) {
                this.isAuthenticated = true;
                this.notifyAuthChange();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    }

    logout() {
        this.isAuthenticated = false;
        this.api.clearToken();
        this.notifyAuthChange();
    }

    showAuth() {
        const authSection = document.getElementById('auth-section');
        const appContent = document.getElementById('app-content');
        
        if (authSection) authSection.classList.remove('hidden');
        if (appContent) appContent.classList.add('hidden');
        
        const passwordInput = document.getElementById('password');
        if (passwordInput) passwordInput.value = '';
    }

    showApp() {
        const authSection = document.getElementById('auth-section');
        const appContent = document.getElementById('app-content');
        
        if (authSection) authSection.classList.add('hidden');
        if (appContent) appContent.classList.remove('hidden');
    }
}