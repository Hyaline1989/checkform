// Вспомогательные функции
const Utils = {
    formatDate(dateString) {
        try {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU');
        } catch (error) {
            return dateString;
        }
    },

    escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    formatDuration(value) {
        let numbers = value.replace(/\D/g, '');
        if (numbers.length > 6) numbers = numbers.substring(0, 6);
        
        if (numbers.length >= 2) numbers = numbers.substring(0, 2) + ':' + numbers.substring(2);
        if (numbers.length >= 5) numbers = numbers.substring(0, 5) + ':' + numbers.substring(5);
        
        return numbers;
    },

    showMessage(message, type = 'info') {
        const messageDiv = document.getElementById('auth-message');
        if (!messageDiv) return;
        
        messageDiv.textContent = message;
        messageDiv.className = `auth-message ${type}`;
        
        const styles = {
            success: { background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' },
            error: { background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' },
            info: { background: '#d1ecf1', color: '#0c5460', border: '1px solid #bee5eb' }
        };
        
        const style = styles[type] || styles.info;
        Object.assign(messageDiv.style, style);
        
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.style.background = '';
            messageDiv.style.color = '';
            messageDiv.style.border = '';
        }, 5000);
    },

    getSelectedErrors(prefix) {
        const checkboxes = document.querySelectorAll(`input[id^="${prefix}"]:checked`);
        return Array.from(checkboxes).map(cb => cb.value);
    },

    clearAllErrorCheckboxes() {
        const allCheckboxes = document.querySelectorAll('.errors-checkbox-group input[type="checkbox"]');
        allCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
            checkbox.disabled = false;
        });
    },

    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        const evaluationDate = document.getElementById('evaluationDate');
        const callDate = document.getElementById('callDate');
        
        if (evaluationDate) evaluationDate.value = today;
        if (callDate) callDate.value = today;
    },

    updateTotalScore() {
        const scores = ['contactScore', 'presentationScore', 'objectionsScore', 'closingScore', 'tovScore'];
        
        const total = scores.reduce((sum, id) => {
            const value = parseInt(document.getElementById(id)?.value) || 0;
            return sum + value;
        }, 0);
        
        const display = document.getElementById('totalScoreDisplay');
        if (display) {
            display.textContent = total;
        }
    },

    scrollToElement(element) {
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
};