// Конфигурация Supabase
const SUPABASE_URL = 'https://nvmiufonskathseexsxi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52bWl1Zm9uc2thdGhzZWV4c3hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4ODA1NzEsImV4cCI6MjA3NzQ1NjU3MX0.Fg5wkFDMGPUST-vyaOhfihOownenV9GkVhJO9xm3u5o';

// Пароль для доступа (можно изменить)
const ACCESS_PASSWORD = 'admin123';

// Список менеджеров (легко добавлять/удалять)
const MANAGERS_LIST = [
    'Абушева Сабина',
    'Аксюбина Ангелина',
    'Буравкина Дарья',
    'Волков Алексей',
    'Горбачева Оксана',
    'Губина Елизавета',
    'Гурмекова Алина',
    'Долгий Олеся',
    'Емельянова Виктория',
    'Жирякова Оксана',
    'Конаныхина Татьяна',
    'Криштоп Эльза',
    'Лазарева Полина',
    'Лосев Николай',
    'Мищенко Дарья',
    'Прохина Алёна',
    'Талерчик Вячеслав',
    'Фролова Диана',
    'Ходневич София',
    'Чупрунова Ирина',
    'Шехмаметьева Диана'
];

class CallEvaluationSystem {
    constructor() {
        this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        this.isAuthenticated = false;
        this.evaluations = [];
        this.filteredEvaluations = [];
        this.selectedManagers = [];
        this.statsSelectedManagers = [];
        
        this.checkAuthentication();
        this.initializeEventListeners();
        this.populateManagersList();
        this.setupManagerFilters();
        this.setupDurationInput();
    }

    // ==================== ФОРМАТ ДЛИТЕЛЬНОСТИ ====================
    setupDurationInput() {
        const durationInput = document.getElementById('callDuration');
        durationInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 6) {
                value = value.substring(0, 6);
            }
            
            if (value.length >= 2) {
                value = value.substring(0, 2) + ':' + value.substring(2);
            }
            if (value.length >= 5) {
                value = value.substring(0, 5) + ':' + value.substring(5);
            }
            
            e.target.value = value;
        });
    }

    // ==================== ФИЛЬТРАЦИЯ ПО МЕНЕДЖЕРАМ ====================
    setupManagerFilters() {
        this.populateManagerCheckboxes('managerFilter', this.selectedManagers);
        this.populateManagerCheckboxes('statsManagerFilter', this.statsSelectedManagers);
    }

    populateManagerCheckboxes(containerId, selectedArray) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        MANAGERS_LIST.forEach(manager => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'manager-checkbox';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `${containerId}-${manager}`;
            checkbox.value = manager;
            checkbox.checked = selectedArray.includes(manager);
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = manager;
            
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    selectedArray.push(manager);
                } else {
                    const index = selectedArray.indexOf(manager);
                    if (index > -1) {
                        selectedArray.splice(index, 1);
                    }
                }
                console.log(`Обновлен ${containerId}:`, selectedArray);
            });
            
            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            container.appendChild(checkboxDiv);
        });
    }

    // ==================== ЗАПОЛНЕНИЕ СПИСКА МП ====================
    populateManagersList() {
        const managerSelect = document.getElementById('managerName');
        managerSelect.innerHTML = '<option value="">Выберите МП</option>';
        
        MANAGERS_LIST.forEach(manager => {
            const option = document.createElement('option');
            option.value = manager;
            option.textContent = manager;
            managerSelect.appendChild(option);
        });
    }

    // ==================== ПРОСТАЯ АУТЕНТИФИКАЦИЯ ====================
    checkAuthentication() {
        const savedAuth = localStorage.getItem('callSystemAuth');
        if (savedAuth === ACCESS_PASSWORD) {
            this.isAuthenticated = true;
            this.showApp();
        } else {
            this.showAuth();
        }
    }

    login(password) {
        if (password === ACCESS_PASSWORD) {
            this.isAuthenticated = true;
            localStorage.setItem('callSystemAuth', password);
            this.showApp();
            return true;
        }
        return false;
    }

    logout() {
        this.isAuthenticated = false;
        localStorage.removeItem('callSystemAuth');
        this.showAuth();
    }

    showAuth() {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('app-content').classList.add('hidden');
        document.getElementById('password').value = '';
    }

    showApp() {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        this.loadEvaluations();
        this.updateTotalScore();
    }

    // ==================== ОЦЕНКИ ЗВОНКОВ ====================
    async saveEvaluation(e) {
        e.preventDefault();
        console.log('Сохранение оценки...');
        
        if (!this.isAuthenticated) {
            this.showMessage('❌ Доступ запрещен', 'error');
            return;
        }

        // Проверка обязательных полей
        const requiredFields = [
            'evaluationDate', 'managerName', 'callDate', 'callDuration',
            'isTarget', 'laterWork', 'contactScore', 'presentationScore',
            'objectionsScore', 'closingScore'
        ];

        for (const fieldId of requiredFields) {
            const field = document.getElementById(fieldId);
            if (!field || !field.value) {
                const fieldName = field?.previousElementSibling?.textContent || fieldId;
                this.showMessage(`❌ Заполните обязательное поле: ${fieldName}`, 'error');
                field?.focus();
                return;
            }
        }

        // Валидация баллов
        const scores = {
            contact: parseInt(document.getElementById('contactScore').value),
            presentation: parseInt(document.getElementById('presentationScore').value),
            objections: parseInt(document.getElementById('objectionsScore').value),
            closing: parseInt(document.getElementById('closingScore').value),
            tov: parseInt(document.getElementById('tovScore').value)
        };

        // Обновленная валидация баллов
        if (scores.contact < 0 || scores.contact > 30) {
            this.showMessage('❌ Баллы за контакт должны быть от 0 до 30', 'error');
            return;
        }
        if (scores.presentation < 0 || scores.presentation > 30) {
            this.showMessage('❌ Баллы за презентацию должны быть от 0 до 30', 'error');
            return;
        }
        if (scores.objections < 0 || scores.objections > 30) {
            this.showMessage('❌ Баллы за возражения должны быть от 0 до 30', 'error');
            return;
        }
        if (scores.closing < 0 || scores.closing > 10) {
            this.showMessage('❌ Баллы за завершение должны быть от 0 до 10', 'error');
            return;
        }

        try {
            // Собираем выбранные ошибки
            const contactErrors = this.getSelectedErrors('contactError');
            const presentationErrors = this.getSelectedErrors('presentationError');
            const objectionsErrors = this.getSelectedErrors('objectionsError');
            const closingErrors = this.getSelectedErrors('closingError');
            const tovErrors = this.getSelectedErrors('tovError');

            const evaluationData = {
                evaluation_date: document.getElementById('evaluationDate').value,
                manager_name: document.getElementById('managerName').value,
                phone_number: document.getElementById('phoneNumber').value || null,
                lead_link: document.getElementById('leadLink').value || null,
                call_date: document.getElementById('callDate').value,
                call_duration: document.getElementById('callDuration').value,
                is_target: document.getElementById('isTarget').value,
                later_work: document.getElementById('laterWork').value,
                
                contact_score: scores.contact,
                contact_errors: contactErrors.length > 0 ? contactErrors.join('; ') : null,
                contact_comment: document.getElementById('contactComment').value || null,

                presentation_score: scores.presentation,
                presentation_errors: presentationErrors.length > 0 ? presentationErrors.join('; ') : null,
                presentation_comment: document.getElementById('presentationComment').value || null,

                objections_score: scores.objections,
                objections_errors: objectionsErrors.length > 0 ? objectionsErrors.join('; ') : null,
                objections_comment: document.getElementById('objectionsComment').value || null,

                closing_score: scores.closing,
                closing_errors: closingErrors.length > 0 ? closingErrors.join('; ') : null,
                closing_comment: document.getElementById('closingComment').value || null,

                tov_score: scores.tov,
                tov_errors: tovErrors.length > 0 ? tovErrors.join('; ') : null,
                tov_comment: document.getElementById('tovComment').value || null,

                critical_error: document.getElementById('criticalError').value || null,
                overall_comment: document.getElementById('overallComment').value || null,
                total_score: parseInt(document.getElementById('totalScoreDisplay').textContent)
            };

            console.log('Данные для сохранения:', evaluationData);

            const { data, error } = await this.supabase
                .from('evaluations')
                .insert([evaluationData]);

            if (error) {
                console.error('Ошибка Supabase:', error);
                throw error;
            }

            console.log('Успешно сохранено:', data);
            this.showMessage('✅ Оценка успешно сохранена!', 'success');
            
            // Сброс формы
            document.getElementById('evaluationForm').reset();
            this.setDefaultDates();
            this.updateTotalScore();
            this.clearAllErrorCheckboxes();
            
            // Перезагрузка списка оценок
            await this.loadEvaluations();
            
        } catch (error) {
            console.error('Полная ошибка:', error);
            let errorMessage = '❌ Ошибка при сохранении';
            
            if (error.message) {
                errorMessage += ': ' + error.message;
            } else if (error.details) {
                errorMessage += ': ' + error.details;
            } else if (error.code) {
                errorMessage += ` (код: ${error.code})`;
            }
            
            this.showMessage(errorMessage, 'error');
        }
    }

    getSelectedErrors(prefix) {
        const checkboxes = document.querySelectorAll(`input[id^="${prefix}"]:checked`);
        return Array.from(checkboxes).map(cb => cb.value);
    }

    clearAllErrorCheckboxes() {
        const allCheckboxes = document.querySelectorAll('.errors-checkbox-group input[type="checkbox"]');
        allCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
    }

    async loadEvaluations(searchTerm = '') {
        try {
            let query = this.supabase
                .from('evaluations')
                .select('*')
                .order('created_at', { ascending: false });

            if (searchTerm) {
                query = query.ilike('manager_name', `%${searchTerm}%`);
            }

            const { data, error } = await query;

            if (error) throw error;

            this.evaluations = data || [];
            // При загрузке показываем все оценки
            this.filteredEvaluations = [...this.evaluations];
            this.applyFilters();
            
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            this.showMessage('❌ Ошибка загрузки данных', 'error');
        }
    }

    // ==================== ФИЛЬТРАЦИЯ И ПРОСМОТР ====================
    applyFilters() {
        let filtered = [...this.evaluations];
        
        console.log('Всего оценок:', this.evaluations.length);
        console.log('Выбранные менеджеры:', this.selectedManagers);
        console.log('Все менеджеры в данных:', this.evaluations.map(e => e.manager_name));
        
        // Фильтр по дате
        const startDate = document.getElementById('viewStartDate')?.value;
        const endDate = document.getElementById('viewEndDate')?.value;
        
        console.log('Дата начала:', startDate, 'Дата окончания:', endDate);
        
        if (startDate) {
            filtered = filtered.filter(item => {
                const itemDate = new Date(item.call_date);
                const start = new Date(startDate);
                return itemDate >= start;
            });
        }
        if (endDate) {
            filtered = filtered.filter(item => {
                const itemDate = new Date(item.call_date);
                const end = new Date(endDate);
                return itemDate <= end;
            });
        }
        
        console.log('После фильтрации по дате:', filtered.length);
        
        // Фильтр по менеджерам
        if (this.selectedManagers.length > 0) {
            filtered = filtered.filter(item => {
                const isIncluded = this.selectedManagers.includes(item.manager_name);
                console.log(`Менеджер "${item.manager_name}" в выбранных:`, isIncluded);
                return isIncluded;
            });
            console.log('После фильтрации по менеджерам:', filtered.length);
        }
        
        // Поиск
        const searchTerm = document.getElementById('searchInput')?.value;
        if (searchTerm && searchTerm.trim() !== '') {
            filtered = filtered.filter(item => 
                item.manager_name.toLowerCase().includes(searchTerm.toLowerCase().trim())
            );
            console.log('После поиска:', filtered.length);
        }
        
        this.filteredEvaluations = filtered;
        console.log('Итоговое количество для отображения:', this.filteredEvaluations.length);
        this.displayEvaluations();
    }

    async deleteEvaluation(id) {
        if (!confirm('Вы уверены, что хотите удалить эту оценку?')) return;

        try {
            const { error } = await this.supabase
                .from('evaluations')
                .delete()
                .eq('id', id);

            if (error) throw error;

            this.showMessage('✅ Оценка удалена', 'success');
            this.loadEvaluations();
            
        } catch (error) {
            this.showMessage('❌ Ошибка при удалении: ' + error.message, 'error');
        }
    }

    displayEvaluations() {
        const container = document.getElementById('evaluationsList');
        const evaluationsToShow = this.filteredEvaluations;
        
        if (!evaluationsToShow || evaluationsToShow.length === 0) {
            container.innerHTML = `
                <div class="evaluation-item" style="text-align: center; color: #666;">
                    <h3>📝 Оценки не найдены</h3>
                    <p>Создайте первую оценку во вкладке "Новая оценка" или измените фильтры</p>
                </div>
            `;
            return;
        }

        container.innerHTML = evaluationsToShow.map(evalItem => `
            <div class="evaluation-item" onclick="callSystem.toggleEvaluation(this)">
                <div class="evaluation-header">
                    <div class="evaluation-manager">👤 ${evalItem.manager_name}</div>
                    <div class="evaluation-score">${evalItem.total_score}/100</div>
                </div>
                <div class="evaluation-details">
                    <div>📅 Дата звонка: ${this.formatDate(evalItem.call_date)}</div>
                    <div>⏱️ Длительность: ${evalItem.call_duration}</div>
                    <div>🎯 Целевой: ${evalItem.is_target}</div>
                    <div>🕒 Искал работу позже: ${evalItem.later_work}</div>
                    <div>📊 Дата оценки: ${this.formatDate(evalItem.created_at)}</div>
                    ${evalItem.phone_number ? `<div>📞 Телефон: ${evalItem.phone_number}</div>` : ''}
                    ${evalItem.lead_link ? `<div>🔗 Ссылка: <a href="${evalItem.lead_link}" target="_blank">${evalItem.lead_link}</a></div>` : ''}
                </div>
                <div class="expand-icon">▼</div>
                
                <div class="evaluation-content">
                    <!-- Детализация баллов -->
                    <div class="score-breakdown">
                        <div class="score-item">
                            <span class="score-category">🤝 Установление контакта:</span>
                            <span class="score-value">${evalItem.contact_score}/30</span>
                        </div>
                        <div class="score-item">
                            <span class="score-category">🎯 Презентация:</span>
                            <span class="score-value">${evalItem.presentation_score}/30</span>
                        </div>
                        <div class="score-item">
                            <span class="score-category">🛡️ Возражения:</span>
                            <span class="score-value">${evalItem.objections_score}/30</span>
                        </div>
                        <div class="score-item">
                            <span class="score-category">✅ Завершение:</span>
                            <span class="score-value">${evalItem.closing_score}/10</span>
                        </div>
                        <div class="score-item">
                            <span class="score-category">⚡ TOV:</span>
                            <span class="score-value">${evalItem.tov_score}</span>
                        </div>
                    </div>
                    
                    ${this.renderErrors(evalItem)}
                    
                    <!-- Развернутые комментарии к параметрам -->
                    <div class="detailed-comments">
                        ${evalItem.contact_comment ? `
                            <div class="parameter-comment">
                                <strong>🤝 Комментарий к установлению контакта:</strong>
                                <div class="comment-text">${evalItem.contact_comment}</div>
                            </div>
                        ` : ''}
                        
                        ${evalItem.presentation_comment ? `
                            <div class="parameter-comment">
                                <strong>🎯 Комментарий к презентации:</strong>
                                <div class="comment-text">${evalItem.presentation_comment}</div>
                            </div>
                        ` : ''}
                        
                        ${evalItem.objections_comment ? `
                            <div class="parameter-comment">
                                <strong>🛡️ Комментарий к отработке возражений:</strong>
                                <div class="comment-text">${evalItem.objections_comment}</div>
                            </div>
                        ` : ''}
                        
                        ${evalItem.closing_comment ? `
                            <div class="parameter-comment">
                                <strong>✅ Комментарий к завершению:</strong>
                                <div class="comment-text">${evalItem.closing_comment}</div>
                            </div>
                        ` : ''}
                        
                        ${evalItem.tov_comment ? `
                            <div class="parameter-comment">
                                <strong>⚡ Комментарий к TOV:</strong>
                                <div class="comment-text">${evalItem.tov_comment}</div>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${evalItem.overall_comment ? `
                        <div class="evaluation-comments">
                            <strong>💬 Общий комментарий:</strong> ${evalItem.overall_comment}
                        </div>
                    ` : ''}
                    <button onclick="event.stopPropagation(); callSystem.deleteEvaluation(${evalItem.id})" class="delete-btn">
                        🗑️ Удалить
                    </button>
                </div>
            </div>
        `).join('');
    }

    toggleEvaluation(element) {
        element.classList.toggle('expanded');
    }

    renderErrors(evalItem) {
        const errors = [];
        if (evalItem.contact_errors) errors.push(`<strong>Контакт:</strong> ${evalItem.contact_errors}`);
        if (evalItem.presentation_errors) errors.push(`<strong>Презентация:</strong> ${evalItem.presentation_errors}`);
        if (evalItem.objections_errors) errors.push(`<strong>Возражения:</strong> ${evalItem.objections_errors}`);
        if (evalItem.closing_errors) errors.push(`<strong>Завершение:</strong> ${evalItem.closing_errors}`);
        if (evalItem.tov_errors) errors.push(`<strong>TOV:</strong> ${evalItem.tov_errors}`);
        if (evalItem.critical_error) errors.push(`<strong>Критическая:</strong> ${evalItem.critical_error}`);
        
        if (errors.length > 0) {
            return `
                <div class="evaluation-comments">
                    <strong>🚨 Ошибки:</strong><br>
                    ${errors.join('<br>')}
                </div>
            `;
        }
        return '';
    }

    // ==================== СТАТИСТИКА ====================
    async calculateStatistics() {
        const startDate = document.getElementById('statsStartDate')?.value;
        const endDate = document.getElementById('statsEndDate')?.value;

        try {
            let query = this.supabase
                .from('evaluations')
                .select('*');

            if (startDate && endDate) {
                query = query.gte('call_date', startDate).lte('call_date', endDate);
            }

            const { data, error } = await query;

            if (error) throw error;

            let evaluationsData = data || [];
            
            // Фильтр по менеджерам для статистики
            if (this.statsSelectedManagers.length > 0) {
                evaluationsData = evaluationsData.filter(item => 
                    this.statsSelectedManagers.includes(item.manager_name)
                );
            }

            this.displayStatistics(evaluationsData);
            this.displayAdditionalStats(evaluationsData);
            this.displayErrorsStatistics(evaluationsData);
            
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
            this.showMessage('❌ Ошибка загрузки статистики', 'error');
        }
    }

    displayStatistics(evaluationsData) {
        const container = document.getElementById('statsResults');
        
        if (!evaluationsData || evaluationsData.length === 0) {
            container.innerHTML = `
                <div class="stat-card">
                    <div class="stat-label">📊 Нет данных</div>
                    <div class="stat-value">0</div>
                    <div>Для выбранного периода</div>
                </div>
            `;
            return;
        }

        const totalCalls = evaluationsData.length;
        const averageScore = evaluationsData.reduce((sum, item) => sum + item.total_score, 0) / totalCalls;
        const avgContact = evaluationsData.reduce((sum, item) => sum + item.contact_score, 0) / totalCalls;
        const avgPresentation = evaluationsData.reduce((sum, item) => sum + item.presentation_score, 0) / totalCalls;
        const avgObjections = evaluationsData.reduce((sum, item) => sum + item.objections_score, 0) / totalCalls;
        const avgClosing = evaluationsData.reduce((sum, item) => sum + item.closing_score, 0) / totalCalls;

        // Базовая статистика
        let baseStatsHTML = `
            <div class="stat-card">
                <div class="stat-label">📞 Всего оценок</div>
                <div class="stat-value">${totalCalls}</div>
                <div>за период</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">📊 Средний балл</div>
                <div class="stat-value">${averageScore.toFixed(1)}</div>
                <div>из 100</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">🤝 Контакт</div>
                <div class="stat-value">${avgContact.toFixed(1)}</div>
                <div>из 30</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">🎯 Презентация</div>
                <div class="stat-value">${avgPresentation.toFixed(1)}</div>
                <div>из 30</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">🛡️ Возражения</div>
                <div class="stat-value">${avgObjections.toFixed(1)}</div>
                <div>из 30</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">✅ Завершение</div>
                <div class="stat-value">${avgClosing.toFixed(1)}</div>
                <div>из 10</div>
            </div>
        `;

        // Если выбраны конкретные менеджеры, показываем детальную статистику по каждому
        let managersStatsHTML = '';
        if (this.statsSelectedManagers.length > 0) {
            managersStatsHTML = this.displayManagersDetailedStats(evaluationsData);
        }

        container.innerHTML = baseStatsHTML + managersStatsHTML;
    }

    displayManagersDetailedStats(evaluationsData) {
        // Группируем данные по менеджерам
        const managersData = {};
        
        evaluationsData.forEach(item => {
            if (!managersData[item.manager_name]) {
                managersData[item.manager_name] = {
                    evaluations: [],
                    totalScore: 0,
                    contactScore: 0,
                    presentationScore: 0,
                    objectionsScore: 0,
                    closingScore: 0,
                    tovScore: 0
                };
            }
            
            managersData[item.manager_name].evaluations.push(item);
            managersData[item.manager_name].totalScore += item.total_score;
            managersData[item.manager_name].contactScore += item.contact_score;
            managersData[item.manager_name].presentationScore += item.presentation_score;
            managersData[item.manager_name].objectionsScore += item.objections_score;
            managersData[item.manager_name].closingScore += item.closing_score;
            managersData[item.manager_name].tovScore += item.tov_score;
        });

        let managersHTML = '<div class="managers-detailed-stats">';
        
        Object.entries(managersData).forEach(([managerName, data]) => {
            const evalCount = data.evaluations.length;
            const avgTotal = (data.totalScore / evalCount).toFixed(1);
            const avgContact = (data.contactScore / evalCount).toFixed(1);
            const avgPresentation = (data.presentationScore / evalCount).toFixed(1);
            const avgObjections = (data.objectionsScore / evalCount).toFixed(1);
            const avgClosing = (data.closingScore / evalCount).toFixed(1);
            const avgTov = (data.tovScore / evalCount).toFixed(1);

            managersHTML += `
                <div class="manager-stat-section">
                    <h3>👤 ${managerName} (${evalCount} оценок)</h3>
                    <div class="manager-stats-grid">
                        <div class="manager-stat-card">
                            <div class="manager-stat-label">Общий балл</div>
                            <div class="manager-stat-value">${avgTotal}</div>
                            <div class="manager-stat-max">/100</div>
                        </div>
                        <div class="manager-stat-card">
                            <div class="manager-stat-label">🤝 Контакт</div>
                            <div class="manager-stat-value">${avgContact}</div>
                            <div class="manager-stat-max">/30</div>
                        </div>
                        <div class="manager-stat-card">
                            <div class="manager-stat-label">🎯 Презентация</div>
                            <div class="manager-stat-value">${avgPresentation}</div>
                            <div class="manager-stat-max">/30</div>
                        </div>
                        <div class="manager-stat-card">
                            <div class="manager-stat-label">🛡️ Возражения</div>
                            <div class="manager-stat-value">${avgObjections}</div>
                            <div class="manager-stat-max">/30</div>
                        </div>
                        <div class="manager-stat-card">
                            <div class="manager-stat-label">✅ Завершение</div>
                            <div class="manager-stat-value">${avgClosing}</div>
                            <div class="manager-stat-max">/10</div>
                        </div>
                        <div class="manager-stat-card">
                            <div class="manager-stat-label">⚡ TOV</div>
                            <div class="manager-stat-value">${avgTov}</div>
                            <div class="manager-stat-max">баллов</div>
                        </div>
                    </div>
                </div>
            `;
        });

        managersHTML += '</div>';
        return managersHTML;
    }

    displayAdditionalStats(evaluationsData) {
        const container = document.getElementById('additionalStats');
        
        if (!evaluationsData || evaluationsData.length === 0) {
            container.innerHTML = '';
            return;
        }

        // Статистика по "Целевой"
        const targetStats = {
            да: evaluationsData.filter(item => item.is_target === 'да').length,
            нет: evaluationsData.filter(item => item.is_target === 'нет').length
        };

        // Статистика по "Искал работу на более позднее время"
        const laterWorkStats = {
            да: evaluationsData.filter(item => item.later_work === 'да').length,
            нет: evaluationsData.filter(item => item.later_work === 'нет').length
        };

        const totalCalls = evaluationsData.length;

        container.innerHTML = `
            <div class="additional-stats-section">
                <h3>🎯 Статистика по целевым звонкам</h3>
                <div class="additional-stats-grid">
                    <div class="additional-stat-card">
                        <div class="additional-stat-label">Целевые звонки</div>
                        <div class="additional-stat-value">${targetStats.да}</div>
                        <div>${((targetStats.да / totalCalls) * 100).toFixed(1)}%</div>
                    </div>
                    <div class="additional-stat-card">
                        <div class="additional-stat-label">Нецелевые звонки</div>
                        <div class="additional-stat-value">${targetStats.нет}</div>
                        <div>${((targetStats.нет / totalCalls) * 100).toFixed(1)}%</div>
                    </div>
                </div>
            </div>
            <div class="additional-stats-section">
                <h3>🕒 Статистика по поиску работы на later время</h3>
                <div class="additional-stats-grid">
                    <div class="additional-stat-card">
                        <div class="additional-stat-label">Искали работу позже</div>
                        <div class="additional-stat-value">${laterWorkStats.да}</div>
                        <div>${((laterWorkStats.да / totalCalls) * 100).toFixed(1)}%</div>
                    </div>
                    <div class="additional-stat-card">
                        <div class="additional-stat-label">Не искали работу позже</div>
                        <div class="additional-stat-value">${laterWorkStats.нет}</div>
                        <div>${((laterWorkStats.нет / totalCalls) * 100).toFixed(1)}%</div>
                    </div>
                </div>
            </div>
        `;
    }

    displayErrorsStatistics(evaluationsData) {
        const container = document.getElementById('errorsStats');
        
        if (!evaluationsData || evaluationsData.length === 0) {
            container.innerHTML = '';
            return;
        }

        // Собираем статистику по ошибкам
        const errorsStats = {
            contact: {},
            presentation: {},
            objections: {},
            closing: {},
            tov: {},
            critical: 0 // Счетчик для критических ошибок
        };

        const totalCalls = evaluationsData.length;

        evaluationsData.forEach(item => {
            // Ошибки контакта
            if (item.contact_errors) {
                item.contact_errors.split('; ').forEach(error => {
                    errorsStats.contact[error] = (errorsStats.contact[error] || 0) + 1;
                });
            }
            // Ошибки презентации
            if (item.presentation_errors) {
                item.presentation_errors.split('; ').forEach(error => {
                    errorsStats.presentation[error] = (errorsStats.presentation[error] || 0) + 1;
                });
            }
            // Ошибки возражений
            if (item.objections_errors) {
                item.objections_errors.split('; ').forEach(error => {
                    errorsStats.objections[error] = (errorsStats.objections[error] || 0) + 1;
                });
            }
            // Ошибки завершения
            if (item.closing_errors) {
                item.closing_errors.split('; ').forEach(error => {
                    errorsStats.closing[error] = (errorsStats.closing[error] || 0) + 1;
                });
            }
            // Ошибки TOV
            if (item.tov_errors) {
                item.tov_errors.split('; ').forEach(error => {
                    errorsStats.tov[error] = (errorsStats.tov[error] || 0) + 1;
                });
            }
            // Критические ошибки - просто счетчик заполненных полей
            if (item.critical_error && item.critical_error.trim() !== '') {
                errorsStats.critical++;
            }
        });

        let errorsHTML = '';

        // Функция для отображения ошибок по категории
        const renderErrorsSection = (category, title) => {
            const errors = errorsStats[category];
            
            if (Object.keys(errors).length === 0) return '';
            
            let sectionHTML = `
                <div class="errors-section">
                    <h3>${title}</h3>
            `;
            
            Object.entries(errors)
                .sort(([,a], [,b]) => b - a)
                .forEach(([error, count]) => {
                    const percentage = ((count / totalCalls) * 100).toFixed(1);
                    sectionHTML += `
                        <div class="error-item">
                            <span class="error-name">${error}</span>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <span class="error-percentage">${percentage}%</span>
                                <span class="error-count">${count}</span>
                            </div>
                        </div>
                    `;
                });
            
            sectionHTML += '</div>';
            return sectionHTML;
        };

        // Отдельно для критических ошибок (просто счетчик)
        if (errorsStats.critical > 0) {
            const criticalPercentage = ((errorsStats.critical / totalCalls) * 100).toFixed(1);
            errorsHTML += `
                <div class="errors-section">
                    <h3>🚨 Критические ошибки</h3>
                    <div class="error-item">
                        <span class="error-name">Анкет с критическими ошибками</span>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <span class="error-percentage">${criticalPercentage}%</span>
                            <span class="error-count">${errorsStats.critical}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        errorsHTML += renderErrorsSection('contact', '🤝 Ошибки установления контакта');
        errorsHTML += renderErrorsSection('presentation', '🎯 Ошибки презентации');
        errorsHTML += renderErrorsSection('objections', '🛡️ Ошибки отработки возражений');
        errorsHTML += renderErrorsSection('closing', '✅ Ошибки завершения');
        errorsHTML += renderErrorsSection('tov', '⚡ Ошибки TOV');

        container.innerHTML = errorsHTML || '<p>Нет данных по ошибкам для выбранного периода</p>';
    }

    // ==================== ЭКСПОРТ ====================
    async exportToCSV() {
        const evaluationsToExport = this.filteredEvaluations.length > 0 ? this.filteredEvaluations : this.evaluations;
        
        if (!evaluationsToExport || evaluationsToExport.length === 0) {
            this.showMessage('❌ Нет данных для экспорта', 'error');
            return;
        }

        const headers = [
            'Дата проверки', 'Номер телефона', 'Ссылка на лид', 'ФИО МП', 'Дата звонка',
            'Длительность звонка', 'Целевой', 'Искал работу на более позднее время',
            'Установление контакта', 'Ошибки контакта', 'Развёрнутый комментарий',
            'Презентация/Предложение', 'Ошибки презентации', 'Развёрнутый комментарий',
            'Отработка возражений', 'Ошибки возражений', 'Развёрнутый комментарий',
            'Завершение', 'Ошибки завершения', 'Развёрнутый комментарий',
            'TOV', 'Ошибки TOV', 'Развёрнутый комментарий',
            'Критическая ошибка', 'Итог по звонку', 'Общий комментарий'
        ];

        const csvData = evaluationsToExport.map(item => [
            item.evaluation_date,
            item.phone_number || '',
            item.lead_link || '',
            item.manager_name,
            item.call_date,
            item.call_duration,
            item.is_target,
            item.later_work,
            item.contact_score,
            item.contact_errors || '',
            item.contact_comment || '',
            item.presentation_score,
            item.presentation_errors || '',
            item.presentation_comment || '',
            item.objections_score,
            item.objections_errors || '',
            item.objections_comment || '',
            item.closing_score,
            item.closing_errors || '',
            item.closing_comment || '',
            item.tov_score,
            item.tov_errors || '',
            item.tov_comment || '',
            item.critical_error || '',
            item.total_score,
            item.overall_comment || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `оценки_звонков_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showMessage('✅ Данные экспортированы в CSV', 'success');
    }

    // ==================== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ====================
    updateTotalScore() {
        const scores = [
            'contactScore',
            'presentationScore',
            'objectionsScore',
            'closingScore',
            'tovScore'
        ];

        const total = scores.reduce((sum, id) => {
            const value = parseInt(document.getElementById(id).value) || 0;
            return sum + value;
        }, 0);

        document.getElementById('totalScoreDisplay').textContent = total;
    }

    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('evaluationDate').value = today;
        document.getElementById('callDate').value = today;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU');
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.getElementById('auth-message');
        messageDiv.textContent = message;
        messageDiv.className = `auth-message ${type}`;
        
        if (type === 'success') {
            messageDiv.style.background = '#d4edda';
            messageDiv.style.color = '#155724';
            messageDiv.style.border = '1px solid #c3e6cb';
        } else if (type === 'error') {
            messageDiv.style.background = '#f8d7da';
            messageDiv.style.color = '#721c24';
            messageDiv.style.border = '1px solid #f5c6cb';
        } else {
            messageDiv.style.background = '#d1ecf1';
            messageDiv.style.color = '#0c5460';
            messageDiv.style.border = '1px solid #bee5eb';
        }
        
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.style.background = '';
            messageDiv.style.color = '';
            messageDiv.style.border = '';
        }, 5000);
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');

        if (tabName === 'view') {
            this.loadEvaluations();
        } else if (tabName === 'stats') {
            this.calculateStatistics();
        }
    }

    // ==================== ИНИЦИАЛИЗАЦИЯ СОБЫТИЙ ====================
    initializeEventListeners() {
        // Авторизация
        document.getElementById('login-btn').addEventListener('click', (e) => {
            e.preventDefault();
            const password = document.getElementById('password').value;
            
            if (!password) {
                this.showMessage('❌ Введите пароль', 'error');
                return;
            }

            if (this.login(password)) {
                this.showMessage('✅ Вход успешен!', 'success');
            } else {
                this.showMessage('❌ Неверный пароль', 'error');
            }
        });

        document.getElementById('password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('login-btn').click();
            }
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
            this.showMessage('✅ Выход выполнен', 'success');
        });

        // Форма оценки
        const evaluationForm = document.getElementById('evaluationForm');
        if (evaluationForm) {
            evaluationForm.addEventListener('submit', (e) => {
                this.saveEvaluation(e);
            });
        } else {
            console.error('Форма оценки не найдена!');
        }

        // Обновление итогового балла
        document.querySelectorAll('.criterion input[type="number"]').forEach(input => {
            input.addEventListener('input', () => this.updateTotalScore());
        });

        // ==================== ФИЛЬТРЫ ПРОСМОТРА ====================
        document.getElementById('applyFilters').addEventListener('click', () => {
            console.log('Применение фильтров...');
            this.applyFilters();
        });

        document.getElementById('clearFilters').addEventListener('click', () => {
            console.log('Сброс фильтров...');
            this.selectedManagers = [];
            this.setupManagerFilters();
            document.getElementById('viewStartDate').value = '';
            document.getElementById('viewEndDate').value = '';
            document.getElementById('searchInput').value = '';
            this.applyFilters();
            this.showMessage('✅ Фильтры сброшены', 'success');
        });

        // Поиск с задержкой
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.applyFilters();
                }, 300);
            });
        }

        // Экспорт
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportToCSV();
        });

        // ==================== СТАТИСТИКА ====================
        document.getElementById('calculateStats').addEventListener('click', () => {
            this.calculateStatistics();
        });

        document.getElementById('clearStatsFilters').addEventListener('click', () => {
            this.statsSelectedManagers = [];
            this.setupManagerFilters();
            document.getElementById('statsStartDate').value = '';
            document.getElementById('statsEndDate').value = '';
            this.calculateStatistics();
            this.showMessage('✅ Фильтры статистики сброшены', 'success');
        });

        // Переключение табов
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Установка текущей даты по умолчанию
        this.setDefaultDates();
    }
}

// Инициализация системы при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.callSystem = new CallEvaluationSystem();
});