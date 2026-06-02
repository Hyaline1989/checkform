// Модуль отображения списка оценок
class EvaluationsList {
    constructor(apiClient, pagination, onDeleteCallback, onEditCallback) {
        this.api = apiClient;
        this.pagination = pagination;
        this.onDeleteCallback = onDeleteCallback;
        this.onEditCallback = onEditCallback;
        this.evaluations = [];
        this.filteredEvaluations = [];
        this.editingId = null;
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
        // Подписываемся на изменение страницы
        this.pagination.onPageChange(() => {
            this.render();
            this.updatePaginationControls();
        });
        
        const firstPageBtn = document.getElementById('firstPage');
        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');
        const lastPageBtn = document.getElementById('lastPage');
        const pageSizeSelect = document.getElementById('pageSize');
        
        if (firstPageBtn) {
            firstPageBtn.addEventListener('click', () => {
                this.pagination.firstPage();
                this.forceUpdatePaginationDisplay();
            });
        }
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => {
                this.pagination.prevPage();
                this.forceUpdatePaginationDisplay();
            });
        }
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => {
                this.pagination.nextPage();
                this.forceUpdatePaginationDisplay();
            });
        }
        if (lastPageBtn) {
            lastPageBtn.addEventListener('click', () => {
                this.pagination.lastPage();
                this.forceUpdatePaginationDisplay();
            });
        }
        
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                const newSize = parseInt(e.target.value);
                this.pagination.setItemsPerPage(newSize);
                setTimeout(() => {
                    this.forceUpdatePaginationDisplay();
                    this.render();
                }, 50);
            });
        }
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
            // setTotalItems вызовет onPageChange, который вызовет render и updatePaginationControls
            
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            Utils.showMessage('❌ Ошибка загрузки данных: ' + error.message, 'error');
            this.filteredEvaluations = [];
            this.pagination.setTotalItems(0);
            this.render();
            this.updatePaginationControls();
        }
    }

    applyFilters() {
        this.filters.startDate = document.getElementById('viewStartDate')?.value || '';
        this.filters.endDate = document.getElementById('viewEndDate')?.value || '';
        
        this.syncManagersFromCheckboxes();
        
        // Сбрасываем на первую страницу при применении фильтров
        this.pagination.currentPage = 1;
        this.loadData();
    }
    
    syncManagersFromCheckboxes() {
        const managerCheckboxes = document.querySelectorAll('#managerFilter input[type="checkbox"]:checked');
        this.filters.managers = Array.from(managerCheckboxes).map(cb => cb.value);
    }
    
    syncCheckboxesFromManagers() {
        const managerCheckboxes = document.querySelectorAll('#managerFilter input[type="checkbox"]');
        managerCheckboxes.forEach(checkbox => {
            checkbox.checked = this.filters.managers.includes(checkbox.value);
        });
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
        
        const qualityAllRadio = document.getElementById('quality-all');
        if (qualityAllRadio) qualityAllRadio.checked = true;
        
        const managerCheckboxes = document.querySelectorAll('#managerFilter input[type="checkbox"]');
        managerCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Сбрасываем на первую страницу
        this.pagination.currentPage = 1;
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
        
        this.attachActionHandlers();
    }

    renderEvaluationItem(item) {
        return `
            <div class="evaluation-item" data-id="${item.id}">
                <div class="evaluation-header" onclick="window.evaluationsList?.toggleDetails(this.parentElement)">
                    <div class="evaluation-manager">
                        👤 ${Utils.escapeHtml(item.manager_name)}
                        ${item.is_good_call === 'да' ? '<span class="evaluation-good-call">🌟 Хороший звонок</span>' : ''}
                    </div>
                    <div class="evaluation-score">${item.total_score}/100</div>
                </div>
                <div class="evaluation-details" onclick="window.evaluationsList?.toggleDetails(this.parentElement)">
                    <div>📅 Дата звонка: ${Utils.formatDate(item.call_date)}</div>
                    <div>⏱️ Длительность: ${item.call_duration}</div>
                    <div>🎯 Целевой: ${item.is_target}</div>
                    <div>🕒 Искал работу позже: ${item.later_work}</div>
                    <div>🌟 Хороший звонок: ${item.is_good_call === 'да' ? 'Да' : 'Нет'}</div>
                    <div>📊 Дата оценки: ${Utils.formatDate(item.created_at)}</div>
                    ${item.phone_number ? `<div>📞 Телефон: ${Utils.escapeHtml(item.phone_number)}</div>` : ''}
                    ${item.lead_link ? `<div>🔗 Ссылка: <a href="${Utils.escapeHtml(item.lead_link)}" target="_blank">${Utils.escapeHtml(item.lead_link)}</a></div>` : ''}
                </div>
                <div class="expand-icon" onclick="window.evaluationsList?.toggleDetails(this.parentElement)">▼</div>
                
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
                    
                    <div class="action-buttons">
                        <button onclick="event.stopPropagation(); window.evaluationsList?.editEvaluation(${item.id})" class="edit-btn">
                            ✏️ Редактировать
                        </button>
                        <button onclick="event.stopPropagation(); window.evaluationsList?.deleteEvaluation(${item.id})" class="delete-btn">
                            🗑️ Удалить
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async editEvaluation(id) {
        const evaluation = this.evaluations.find(e => e.id === id);
        if (!evaluation) {
            Utils.showMessage('❌ Оценка не найдена', 'error');
            return;
        }
        
        // Переключаемся на вкладку формы
        const evaluationTab = document.querySelector('[data-tab="evaluation"]');
        if (evaluationTab) evaluationTab.click();
        
        // Заполняем форму данными оценки
        this.fillFormWithEvaluation(evaluation);
        
        // Сохраняем ID редактируемой оценки
        this.editingId = id;
        
        // Меняем текст кнопки сохранения
        const submitBtn = document.querySelector('#evaluationForm .submit-btn');
        if (submitBtn) {
            submitBtn.textContent = '✏️ Обновить оценку';
            submitBtn.classList.add('editing-mode');
        }
        
        Utils.showMessage('✏️ Режим редактирования. Внесите изменения и нажмите "Обновить оценку"', 'info');
    }
    
    fillFormWithEvaluation(evaluation) {
        // Основная информация
        document.getElementById('evaluationDate').value = evaluation.evaluation_date;
        document.getElementById('managerName').value = evaluation.manager_name;
        document.getElementById('phoneNumber').value = evaluation.phone_number || '';
        document.getElementById('leadLink').value = evaluation.lead_link || '';
        document.getElementById('callDate').value = evaluation.call_date;
        document.getElementById('callDuration').value = evaluation.call_duration;
        document.getElementById('isTarget').value = evaluation.is_target;
        document.getElementById('laterWork').value = evaluation.later_work;
        document.getElementById('isGoodCall').value = evaluation.is_good_call;
        
        // Баллы
        document.getElementById('contactScore').value = evaluation.contact_score;
        document.getElementById('presentationScore').value = evaluation.presentation_score;
        document.getElementById('objectionsScore').value = evaluation.objections_score;
        document.getElementById('closingScore').value = evaluation.closing_score;
        document.getElementById('tovScore').value = evaluation.tov_score;
        
        // Очищаем все чекбоксы перед заполнением
        Utils.clearAllErrorCheckboxes();
        
        // Заполняем ошибки
        this.fillErrorsFromString('contact', evaluation.contact_errors);
        this.fillErrorsFromString('presentation', evaluation.presentation_errors);
        this.fillErrorsFromString('objections', evaluation.objections_errors);
        this.fillErrorsFromString('closing', evaluation.closing_errors);
        this.fillErrorsFromString('tov', evaluation.tov_errors);
        
        // Комментарии
        document.getElementById('contactComment').value = evaluation.contact_comment || '';
        document.getElementById('presentationComment').value = evaluation.presentation_comment || '';
        document.getElementById('objectionsComment').value = evaluation.objections_comment || '';
        document.getElementById('closingComment').value = evaluation.closing_comment || '';
        document.getElementById('tovComment').value = evaluation.tov_comment || '';
        
        // Итоги
        document.getElementById('criticalError').value = evaluation.critical_error || '';
        document.getElementById('overallComment').value = evaluation.overall_comment || '';
        
        // Обновляем итоговый балл
        Utils.updateTotalScore();
        
        // Прокручиваем к форме
        document.getElementById('evaluation').scrollIntoView({ behavior: 'smooth' });
    }
    
    fillErrorsFromString(prefix, errorsString) {
        if (!errorsString) return;
        
        const errors = errorsString.split('; ');
        const checkboxes = document.querySelectorAll(`input[id^="${prefix}Error"]`);
        
        checkboxes.forEach(checkbox => {
            if (errors.includes(checkbox.value)) {
                checkbox.checked = true;
            }
        });
        
        // Если есть ошибка "Ок"
        const okCheckbox = document.getElementById(`${prefix}Ok`);
        if (okCheckbox && errors.includes('Ок')) {
            okCheckbox.checked = true;
            // Отключаем остальные чекбоксы
            checkboxes.forEach(cb => {
                cb.disabled = true;
            });
        }
    }
    
    resetEditMode() {
        this.editingId = null;
        const submitBtn = document.querySelector('#evaluationForm .submit-btn');
        if (submitBtn) {
            submitBtn.textContent = '💾 Сохранить оценку';
            submitBtn.classList.remove('editing-mode');
        }
        // Сбрасываем форму
        const form = document.getElementById('evaluationForm');
        if (form) {
            form.reset();
            Utils.setDefaultDates();
            Utils.updateTotalScore();
            Utils.clearAllErrorCheckboxes();
        }
    }

    attachActionHandlers() {
        // Обработчики уже добавлены через onclick
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
        
        if (currentRangeEl) {
            if (info.totalItems === 0) {
                currentRangeEl.textContent = '0-0';
            } else {
                currentRangeEl.textContent = `${info.startIndex}-${info.endIndex}`;
            }
        }
        if (totalEvaluationsEl) {
            totalEvaluationsEl.textContent = info.totalItems;
        }
        
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
        
        // Обновляем отображение номеров страниц с учетом текущей страницы
        this.pagination.renderPageNumbers('pageNumbers');
    }
    
    forceUpdatePaginationDisplay() {
        const info = this.pagination.getPageInfo();
        const currentRangeEl = document.getElementById('currentRange');
        const totalEvaluationsEl = document.getElementById('totalEvaluations');
        
        if (currentRangeEl) {
            if (info.totalItems === 0) {
                currentRangeEl.textContent = '0-0';
            } else {
                currentRangeEl.textContent = `${info.startIndex}-${info.endIndex}`;
            }
        }
        if (totalEvaluationsEl) {
            totalEvaluationsEl.textContent = info.totalItems;
        }
        
        // Обновляем активные кнопки страниц
        this.pagination.renderPageNumbers('pageNumbers');
        
        // Обновляем состояние кнопок навигации
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
    }

    async refreshManagerFilters() {
        const managers = await this.api.getAllManagers();
        const managerFilter = document.getElementById('managerFilter');
        
        if (managerFilter) {
            managerFilter.innerHTML = '';
            managers.forEach(manager => {
                const div = document.createElement('div');
                div.className = 'manager-checkbox';
                div.innerHTML = `
                    <input type="checkbox" id="filter-${manager.id}" value="${manager.name}" ${!manager.is_active ? 'disabled' : ''}>
                    <label for="filter-${manager.id}" style="${!manager.is_active ? 'opacity: 0.5;' : ''}">${Utils.escapeHtml(manager.name)}${!manager.is_active ? ' (архив)' : ''}</label>
                `;
                if (manager.is_active) {
                    const checkbox = div.querySelector('input');
                    checkbox.addEventListener('change', (e) => {
                        if (e.target.checked) {
                            if (!this.filters.managers.includes(manager.name)) {
                                this.filters.managers.push(manager.name);
                            }
                        } else {
                            const index = this.filters.managers.indexOf(manager.name);
                            if (index > -1) this.filters.managers.splice(index, 1);
                        }
                        this.applyFilters();
                    });
                }
                managerFilter.appendChild(div);
            });
        }
    }
}