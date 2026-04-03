// Модуль отображения списка оценок
class EvaluationsList {
    constructor(apiClient, pagination, onDeleteCallback) {
        this.api = apiClient;
        this.pagination = pagination;
        this.onDeleteCallback = onDeleteCallback;
        this.evaluations = [];
        this.filteredEvaluations = [];
        this.filters = {
            search: '',
            startDate: '',
            endDate: '',
            managers: [],
            qualityFilter: 'all'
        };
        
        this.init();
    }

    init() {
        this.setupFilters();
        this.setupPagination();
    }

    setupFilters() {
        const applyBtn = document.getElementById('applyFilters');
        const clearBtn = document.getElementById('clearFilters');
        const searchInput = document.getElementById('searchInput');
        
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applyFilters());
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearFilters());
        }
        
        if (searchInput) {
            let timeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.filters.search = e.target.value;
                    this.applyFilters();
                }, 300);
            });
        }
        
        document.querySelectorAll('input[name="qualityFilter"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.filters.qualityFilter = e.target.value;
                this.applyFilters();
            });
        });
    }

    setupPagination() {
        this.pagination.onPageChange(() => this.render());
        
        document.getElementById('firstPage')?.addEventListener('click', () => this.pagination.firstPage());
        document.getElementById('prevPage')?.addEventListener('click', () => this.pagination.prevPage());
        document.getElementById('nextPage')?.addEventListener('click', () => this.pagination.nextPage());
        document.getElementById('lastPage')?.addEventListener('click', () => this.pagination.lastPage());
        
        document.getElementById('pageSize')?.addEventListener('change', (e) => {
            this.pagination.setItemsPerPage(parseInt(e.target.value));
            this.render();
        });
    }

    async loadData() {
        try {
            const filters = {
                search: this.filters.search,
                start_date: this.filters.startDate,
                end_date: this.filters.endDate,
                managers: this.filters.managers,
                is_good_call: this.filters.qualityFilter
            };
            
            this.evaluations = await this.api.getEvaluations(filters);
            this.filteredEvaluations = [...this.evaluations];
            this.pagination.setTotalItems(this.filteredEvaluations.length);
            this.render();
            this.updatePaginationControls();
            
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            Utils.showMessage('❌ Ошибка загрузки данных: ' + error.message, 'error');
        }
    }

    applyFilters() {
        this.filters.startDate = document.getElementById('viewStartDate')?.value || '';
        this.filters.endDate = document.getElementById('viewEndDate')?.value || '';
        this.loadData();
    }

    clearFilters() {
        this.filters = {
            search: '',
            startDate: '',
            endDate: '',
            managers: [],
            qualityFilter: 'all'
        };
        
        const viewStartDate = document.getElementById('viewStartDate');
        const viewEndDate = document.getElementById('viewEndDate');
        const searchInput = document.getElementById('searchInput');
        
        if (viewStartDate) viewStartDate.value = '';
        if (viewEndDate) viewEndDate.value = '';
        if (searchInput) searchInput.value = '';
        
        document.getElementById('quality-all').checked = true;
        
        this.loadData();
        Utils.showMessage('✅ Фильтры сброшены', 'success');
    }

    render() {
        const container = document.getElementById('evaluationsList');
        if (!container) return;
        
        const pageData = this.pagination.getCurrentPageData(this.filteredEvaluations);
        
        if (!pageData || pageData.length === 0) {
            container.innerHTML = `
                <div class="evaluation-item" style="text-align: center; color: #666;">
                    <h3>📝 Оценки не найдены</h3>
                    <p>Создайте первую оценку во вкладке "Новая оценка" или измените фильтры</p>
                </div>
            `;
            return;
        }

        container.innerHTML = pageData.map(item => this.renderEvaluationItem(item)).join('');
    }

    renderEvaluationItem(item) {
        return `
            <div class="evaluation-item" onclick="window.evaluationsList?.toggleDetails(this)">
                <div class="evaluation-header">
                    <div class="evaluation-manager">
                        👤 ${Utils.escapeHtml(item.manager_name)}
                        ${item.is_good_call === 'да' ? '<span class="evaluation-good-call">🌟 Хороший звонок</span>' : ''}
                    </div>
                    <div class="evaluation-score">${item.total_score}/100</div>
                </div>
                <div class="evaluation-details">
                    <div>📅 Дата звонка: ${Utils.formatDate(item.call_date)}</div>
                    <div>⏱️ Длительность: ${item.call_duration}</div>
                    <div>🎯 Целевой: ${item.is_target}</div>
                    <div>🕒 Искал работу позже: ${item.later_work}</div>
                    <div>🌟 Хороший звонок: ${item.is_good_call === 'да' ? 'Да' : 'Нет'}</div>
                    <div>📊 Дата оценки: ${Utils.formatDate(item.created_at)}</div>
                    ${item.phone_number ? `<div>📞 Телефон: ${Utils.escapeHtml(item.phone_number)}</div>` : ''}
                    ${item.lead_link ? `<div>🔗 Ссылка: <a href="${Utils.escapeHtml(item.lead_link)}" target="_blank">${Utils.escapeHtml(item.lead_link)}</a></div>` : ''}
                </div>
                <div class="expand-icon">▼</div>
                
                <div class="evaluation-content">
                    <div class="score-breakdown">
                        <div class="score-item"><span class="score-category">🤝 Установление контакта:</span><span class="score-value">${item.contact_score}/30</span></div>
                        <div class="score-item"><span class="score-category">🎯 Презентация:</span><span class="score-value">${item.presentation_score}/30</span></div>
                        <div class="score-item"><span class="score-category">🛡️ Возражения:</span><span class="score-value">${item.objections_score}/30</span></div>
                        <div class="score-item"><span class="score-category">✅ Завершение:</span><span class="score-value">${item.closing_score}/10</span></div>
                        <div class="score-item"><span class="score-category">⚡ TOV:</span><span class="score-value">${item.tov_score}</span></div>
                    </div>
                    
                    ${this.renderErrors(item)}
                    
                    <div class="detailed-comments">
                        ${this.renderComment('contact', item.contact_comment, '🤝 Комментарий к установлению контакта')}
                        ${this.renderComment('presentation', item.presentation_comment, '🎯 Комментарий к презентации')}
                        ${this.renderComment('objections', item.objections_comment, '🛡️ Комментарий к отработке возражений')}
                        ${this.renderComment('closing', item.closing_comment, '✅ Комментарий к завершению')}
                        ${this.renderComment('tov', item.tov_comment, '⚡ Комментарий к TOV')}
                    </div>
                    
                    ${item.overall_comment ? `<div class="evaluation-comments"><strong>💬 Общий комментарий:</strong> ${Utils.escapeHtml(item.overall_comment)}</div>` : ''}
                    
                    <button onclick="event.stopPropagation(); window.evaluationsList?.deleteEvaluation(${item.id})" class="delete-btn">
                        🗑️ Удалить
                    </button>
                </div>
            </div>
        `;
    }

    renderComment(key, comment, title) {
        if (!comment) return '';
        return `
            <div class="parameter-comment">
                <strong>${title}:</strong>
                <div class="comment-text">${Utils.escapeHtml(comment)}</div>
            </div>
        `;
    }

    renderErrors(item) {
        const errors = [];
        
        const addError = (errorsText, category) => {
            if (!errorsText) return;
            if (errorsText.includes('Ок')) {
                errors.push(`<strong>${category}:</strong> ✅ Ок`);
            } else {
                errors.push(`<strong>${category}:</strong> ${Utils.escapeHtml(errorsText)}`);
            }
        };
        
        addError(item.contact_errors, 'Контакт');
        addError(item.presentation_errors, 'Презентация');
        addError(item.objections_errors, 'Возражения');
        addError(item.closing_errors, 'Завершение');
        addError(item.tov_errors, 'TOV');
        
        if (item.critical_error) {
            errors.push(`<strong>Критическая:</strong> ${Utils.escapeHtml(item.critical_error)}`);
        }
        
        if (errors.length === 0) return '';
        
        return `<div class="evaluation-comments"><strong>🚨 Ошибки:</strong><br>${errors.join('<br>')}</div>`;
    }

    async deleteEvaluation(id) {
        if (!confirm('Вы уверены, что хотите удалить эту оценку?')) return;

        try {
            await this.api.deleteEvaluation(id);
            Utils.showMessage('✅ Оценка удалена', 'success');
            await this.loadData();
            if (this.onDeleteCallback) await this.onDeleteCallback();
        } catch (error) {
            console.error('Ошибка при удалении:', error);
            Utils.showMessage('❌ Ошибка при удалении: ' + error.message, 'error');
        }
    }

    toggleDetails(element) {
        element.classList.toggle('expanded');
    }

    updatePaginationControls() {
        const info = this.pagination.getPageInfo();
        
        const currentRangeEl = document.getElementById('currentRange');
        const totalEvaluationsEl = document.getElementById('totalEvaluations');
        
        if (currentRangeEl) currentRangeEl.textContent = `${info.startIndex}-${info.endIndex}`;
        if (totalEvaluationsEl) totalEvaluationsEl.textContent = info.totalItems;
        
        const firstPageBtn = document.getElementById('firstPage');
        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');
        const lastPageBtn = document.getElementById('lastPage');
        
        const canPrev = this.pagination.canGoPrev();
        const canNext = this.pagination.canGoNext();
        
        if (firstPageBtn) firstPageBtn.disabled = !canPrev;
        if (prevPageBtn) prevPageBtn.disabled = !canPrev;
        if (nextPageBtn) nextPageBtn.disabled = !canNext;
        if (lastPageBtn) lastPageBtn.disabled = !canNext;
        
        this.pagination.renderPageNumbers('pageNumbers');
    }
}