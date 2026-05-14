// Модуль статистики
class StatisticsModule {
    constructor(apiClient) {
        this.api = apiClient;
        this.selectedManagers = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const calculateBtn = document.getElementById('calculateStats');
        const clearBtn = document.getElementById('clearStatsFilters');
        
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => this.calculate());
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearFilters());
        }
    }

    async calculate() {
        const startDate = document.getElementById('statsStartDate')?.value;
        const endDate = document.getElementById('statsEndDate')?.value;

        try {
            const stats = await this.api.getStatistics({
                start_date: startDate,
                end_date: endDate,
                managers: this.selectedManagers
            });
            
            this.displayStats(stats);
            this.displayAdditionalStats(stats);
            this.displayErrorsStats(stats.errors_stats, stats.total_calls);
            
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
            Utils.showMessage('❌ Ошибка загрузки статистики', 'error');
        }
    }

    displayStats(stats) {
        const container = document.getElementById('statsResults');
        if (!container) return;
        
        if (!stats || stats.total_calls === 0) {
            container.innerHTML = `<div class="stat-card"><div class="stat-label">📊 Нет данных</div><div class="stat-value">0</div></div>`;
            return;
        }

        const goodCallsPercentage = ((stats.good_calls / stats.total_calls) * 100).toFixed(1);

        container.innerHTML = `
            <div class="stat-card"><div class="stat-label">📞 Всего оценок</div><div class="stat-value">${stats.total_calls}</div></div>
            <div class="stat-card"><div class="stat-label">📊 Средний балл</div><div class="stat-value">${stats.avg_score}</div></div>
            <div class="stat-card stat-good-calls"><div class="stat-label">🌟 Хороших звонков</div><div class="stat-value">${stats.good_calls}</div><div>${goodCallsPercentage}%</div></div>
            <div class="stat-card"><div class="stat-label">🤝 Контакт</div><div class="stat-value">${stats.avg_contact}</div></div>
            <div class="stat-card"><div class="stat-label">🎯 Презентация</div><div class="stat-value">${stats.avg_presentation}</div></div>
            <div class="stat-card"><div class="stat-label">🛡️ Возражения</div><div class="stat-value">${stats.avg_objections}</div></div>
            <div class="stat-card"><div class="stat-label">✅ Завершение</div><div class="stat-value">${stats.avg_closing}</div></div>
        `;
    }

    displayAdditionalStats(stats) {
        const container = document.getElementById('additionalStats');
        if (!container) return;
        
        if (!stats || stats.total_calls === 0) {
            container.innerHTML = '';
            return;
        }

        const targetPercentage = ((stats.target_calls / stats.total_calls) * 100).toFixed(1);
        const laterWorkPercentage = ((stats.later_work_calls / stats.total_calls) * 100).toFixed(1);
        const goodCallsPercentage = ((stats.good_calls / stats.total_calls) * 100).toFixed(1);

        container.innerHTML = `
            <div class="additional-stats-section">
                <h3>🎯 Статистика по целевым звонкам</h3>
                <div class="additional-stats-grid">
                    <div class="additional-stat-card"><div class="additional-stat-label">Целевые звонки</div><div class="additional-stat-value">${stats.target_calls}</div><div>${targetPercentage}%</div></div>
                    <div class="additional-stat-card"><div class="additional-stat-label">Нецелевые звонки</div><div class="additional-stat-value">${stats.total_calls - stats.target_calls}</div><div>${(100 - targetPercentage).toFixed(1)}%</div></div>
                </div>
            </div>
            <div class="additional-stats-section">
                <h3>🕒 Статистика по поиску работы на более позднее время</h3>
                <div class="additional-stats-grid">
                    <div class="additional-stat-card"><div class="additional-stat-label">Искали работу позже</div><div class="additional-stat-value">${stats.later_work_calls}</div><div>${laterWorkPercentage}%</div></div>
                    <div class="additional-stat-card"><div class="additional-stat-label">Не искали работу позже</div><div class="additional-stat-value">${stats.total_calls - stats.later_work_calls}</div><div>${(100 - laterWorkPercentage).toFixed(1)}%</div></div>
                </div>
            </div>
            <div class="additional-stats-section">
                <h3>🌟 Статистика по хорошим звонкам</h3>
                <div class="additional-stats-grid">
                    <div class="additional-stat-card"><div class="additional-stat-label">Хорошие звонки</div><div class="additional-stat-value">${stats.good_calls}</div><div>${goodCallsPercentage}%</div></div>
                    <div class="additional-stat-card"><div class="additional-stat-label">Обычные звонки</div><div class="additional-stat-value">${stats.total_calls - stats.good_calls}</div><div>${(100 - goodCallsPercentage).toFixed(1)}%</div></div>
                </div>
            </div>
        `;
    }

    displayErrorsStats(errorsStats, totalCalls) {
        const container = document.getElementById('errorsStats');
        if (!container) return;
        
        if (!errorsStats || totalCalls === 0) {
            container.innerHTML = '';
            return;
        }

        let html = '';

        if (errorsStats.critical > 0) {
            const percentage = ((errorsStats.critical / totalCalls) * 100).toFixed(1);
            html += `<div class="errors-section"><h3>🚨 Критические ошибки</h3><div class="error-item"><span class="error-name">Анкет с критическими ошибками</span><span class="error-percentage">${percentage}%</span><span class="error-count">${errorsStats.critical}</span></div></div>`;
        }

        html += this.renderErrorSection(errorsStats.contact, '🤝 Ошибки установления контакта', totalCalls);
        html += this.renderErrorSection(errorsStats.presentation, '🎯 Ошибки презентации', totalCalls);
        html += this.renderErrorSection(errorsStats.objections, '🛡️ Ошибки отработки возражений', totalCalls);
        html += this.renderErrorSection(errorsStats.closing, '✅ Ошибки завершения', totalCalls);
        html += this.renderErrorSection(errorsStats.tov, '⚡ Ошибки TOV', totalCalls);

        container.innerHTML = html || '<p>Нет данных по ошибкам для выбранного периода</p>';
    }

    renderErrorSection(errors, title, totalCalls) {
        if (!errors || Object.keys(errors).length === 0) return '';
        
        let html = `<div class="errors-section"><h3>${title}</h3>`;
        
        // Сортируем ошибки по убыванию количества
        const sortedErrors = Object.entries(errors).sort(([,a], [,b]) => b - a);
        
        for (const [error, count] of sortedErrors) {
            const percentage = ((count / totalCalls) * 100).toFixed(1);
            html += `
                <div class="error-item">
                    <span class="error-name">${Utils.escapeHtml(error)}</span>
                    <span class="error-percentage">${percentage}%</span>
                    <span class="error-count">${count}</span>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }

    async refreshManagerFilters() {
        try {
            const managers = await this.api.getAllManagers();
            const statsManagerFilter = document.getElementById('statsManagerFilter');
            
            if (statsManagerFilter) {
                statsManagerFilter.innerHTML = '';
                managers.forEach(manager => {
                    const div = document.createElement('div');
                    div.className = 'manager-checkbox';
                    div.innerHTML = `
                        <input type="checkbox" id="stats-${manager.id}" value="${manager.name}" ${!manager.is_active ? 'disabled' : ''}>
                        <label for="stats-${manager.id}" style="${!manager.is_active ? 'opacity: 0.5;' : ''}">${Utils.escapeHtml(manager.name)}${!manager.is_active ? ' (архив)' : ''}</label>
                    `;
                    if (manager.is_active) {
                        const checkbox = div.querySelector('input');
                        checkbox.addEventListener('change', (e) => {
                            if (e.target.checked) {
                                if (!this.selectedManagers.includes(manager.name)) {
                                    this.selectedManagers.push(manager.name);
                                }
                            } else {
                                const index = this.selectedManagers.indexOf(manager.name);
                                if (index > -1) this.selectedManagers.splice(index, 1);
                            }
                        });
                    }
                    statsManagerFilter.appendChild(div);
                });
            }
        } catch (error) {
            console.error('Ошибка обновления фильтров менеджеров:', error);
        }
    }

    clearFilters() {
        this.selectedManagers = [];
        const startDate = document.getElementById('statsStartDate');
        const endDate = document.getElementById('statsEndDate');
        
        if (startDate) startDate.value = '';
        if (endDate) endDate.value = '';
        
        // Сбрасываем все чекбоксы в фильтре менеджеров
        const checkboxes = document.querySelectorAll('#statsManagerFilter input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = false;
        });
        
        this.calculate();
        Utils.showMessage('✅ Фильтры статистики сброшены', 'success');
    }

    setManagers(managers) {
        this.selectedManagers = managers;
    }
}