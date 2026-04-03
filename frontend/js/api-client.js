// API клиент для работы с бэкендом
class APIClient {
    constructor() {
        // Используем относительный путь, так как фронтенд и бэкенд на одном сервере
        this.baseURL = '/api';
        this.token = null;
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('access_token', token);
    }

    getToken() {
        if (!this.token) {
            this.token = localStorage.getItem('access_token');
        }
        return this.token;
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('access_token');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Ошибка запроса');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async login(password) {
        const data = await this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ password })
        });
        
        if (data.success && data.access_token) {
            this.setToken(data.access_token);
        }
        
        return data;
    }

    async verifyToken() {
        try {
            await this.request('/verify');
            return true;
        } catch (error) {
            return false;
        }
    }

    async getManagers() {
        const data = await this.request('/managers');
        return data.data;
    }

    async getEvaluations(filters = {}) {
        const params = new URLSearchParams();
        
        if (filters.search) params.append('search', filters.search);
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
        if (filters.is_good_call && filters.is_good_call !== 'all') {
            params.append('is_good_call', filters.is_good_call);
        }
        if (filters.managers && filters.managers.length > 0) {
            filters.managers.forEach(m => params.append('managers[]', m));
        }
        
        const queryString = params.toString();
        const endpoint = `/evaluations${queryString ? '?' + queryString : ''}`;
        
        const data = await this.request(endpoint);
        return data.data;
    }

    async createEvaluation(evaluationData) {
        const data = await this.request('/evaluations', {
            method: 'POST',
            body: JSON.stringify(evaluationData)
        });
        return data.data;
    }

    async deleteEvaluation(id) {
        const data = await this.request(`/evaluations/${id}`, {
            method: 'DELETE'
        });
        return data;
    }

    async getStatistics(filters = {}) {
        const data = await this.request('/stats', {
            method: 'POST',
            body: JSON.stringify(filters)
        });
        return data.data;
    }
}