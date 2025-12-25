// Конфигурация Supabase - ПРОВЕРЬТЕ ЭТИ ДАННЫЕ
const SUPABASE_URL = 'https://nvmiufonskathseexsxi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52bWl1Zm9uc2thdGhzZWV4c3hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4ODA1NzEsImV4cCI6MjA3NzQ1NjU3MX0.Fg5wkFDMGPUST-vyaOhfihOownenV9GkVhJO9xm3u5o';

// Пароль для доступа (можно изменить)
const ACCESS_PASSWORD = 'admin123';

// Список менеджеров (легко добавлять/удалять)
const MANAGERS_LIST = [
    'Аксюбина Ангелина',
    'Аладьина Алина',
    'Волков Алексей',
    'Гурмекова Алина',
    'Долгий Олеся',
    'Жирякова Оксана',
    'Конаныхина Татьяна',
    'Лазарева Полина',
    'Лосев Николай',
    'Мельник Полина',
    'Мищенко Дарья',
    'Прохина Алёна',
    'Талерчик Вячеслав',
    'Фролова Диана',
    'Ходневич София',
    'Чупрунова Ирина'
];

class CallEvaluationSystem {
    constructor() {
        this.isAuthenticated = false;
        this.evaluations = [];
        this.filteredEvaluations = [];
        this.selectedManagers = [];
        this.statsSelectedManagers = [];
        this.qualityFilter = 'all';
        this.supabase = null;
        
        // Пагинация
        this.currentPage = 1;
        this.pageSize = 20; // По умолчанию 20 элементов на странице
        this.totalPages = 1;
        this.displayedEvaluations = [];
        
        this.initializeSupabase();
        this.checkAuthentication();
        this.initializeEventListeners();
        this.populateManagersList();
        this.setupManagerFilters();
        this.setupDurationInput();
        this.setupOkCheckboxes();
        this.initializePaginationListeners();
    }

    // ==================== ИНИЦИАЛИЗАЦИЯ ПАГИНАЦИИ ====================
    initializePaginationListeners() {
        // Обработчики для кнопок пагинации
        document.getElementById('firstPage')?.addEventListener('click', () => this.goToPage(1));
        document.getElementById('prevPage')?.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        document.getElementById('nextPage')?.addEventListener('click', () => this.goToPage(this.currentPage + 1));
        document.getElementById('lastPage')?.addEventListener('click', () => this.goToPage(this.totalPages));
        
        // Обработчик изменения размера страницы
        document.getElementById('pageSize')?.addEventListener('change', (e) => {
            this.pageSize = parseInt(e.target.value);
            this.currentPage = 1; // Сброс на первую страницу при изменении размера
            this.applyFilters();
        });
    }

    // ==================== ПАГИНАЦИЯ ДАННЫХ ====================
    getPaginatedData() {
        const totalItems = this.filteredEvaluations.length;
        
        // Если выбрано "Все" или нет данных
        if (this.pageSize === 0 || totalItems === 0) {
            this.displayedEvaluations = this.filteredEvaluations;
            this.totalPages = 1;
            this.currentPage = 1;
            return;
        }
        
        // Рассчитываем общее количество страниц
        this.totalPages = Math.ceil(totalItems / this.pageSize);
        
        // Корректируем текущую страницу, если она вышла за пределы
        if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages;
        }
        if (this.currentPage < 1) {
            this.currentPage = 1;
        }
        
        // Получаем данные для текущей страницы
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, totalItems);
        
        this.displayedEvaluations = this.filteredEvaluations.slice(startIndex, endIndex);
    }

    // ==================== ПЕРЕХОД НА СТРАНИЦУ ====================
    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        
        this.currentPage = page;
        this.displayEvaluations();
        this.updatePaginationControls();
        this.scrollToTop();
    }

    // ==================== ОБНОВЛЕНИЕ ЭЛЕМЕНТОВ ПАГИНАЦИИ ====================
    updatePaginationControls() {
        const totalItems = this.filteredEvaluations.length;
        const startIndex = totalItems === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
        let endIndex;
        
        if (this.pageSize === 0 || totalItems === 0) {
            endIndex = totalItems;
        } else {
            endIndex = Math.min(this.currentPage * this.pageSize, totalItems);
        }
        
        // Обновляем информацию о странице
        const currentRangeEl = document.getElementById('currentRange');
        const totalEvaluationsEl = document.getElementById('totalEvaluations');
        
        if (currentRangeEl) currentRangeEl.textContent = `${startIndex}-${endIndex}`;
        if (totalEvaluationsEl) totalEvaluationsEl.textContent = totalItems;
        
        // Обновляем состояние кнопок навигации
        const firstPageBtn = document.getElementById('firstPage');
        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');
        const lastPageBtn = document.getElementById('lastPage');
        
        if (firstPageBtn) firstPageBtn.disabled = this.currentPage === 1 || totalItems === 0;
        if (prevPageBtn) prevPageBtn.disabled = this.currentPage === 1 || totalItems === 0;
        if (nextPageBtn) nextPageBtn.disabled = this.currentPage === this.totalPages || totalItems === 0;
        if (lastPageBtn) lastPageBtn.disabled = this.currentPage === this.totalPages || totalItems === 0;
        
        // Обновляем номера страниц
        this.renderPageNumbers();
    }

    // ==================== РЕНДЕРИНГ НОМЕРОВ СТРАНИЦ ====================
    renderPageNumbers() {
        const pageNumbersContainer = document.getElementById('pageNumbers');
        if (!pageNumbersContainer) return;
        
        pageNumbersContainer.innerHTML = '';
        
        const totalItems = this.filteredEvaluations.length;
        if (totalItems === 0 || this.totalPages <= 1) return;
        
        const maxVisiblePages = 7; // Максимальное количество видимых номеров страниц
        let startPage, endPage;
        
        if (this.totalPages <= maxVisiblePages) {
            // Показываем все страницы
            startPage = 1;
            endPage = this.totalPages;
        } else {
            // Рассчитываем диапазон страниц с текущей страницей в центре
            const maxPagesBeforeCurrent = Math.floor(maxVisiblePages / 2);
            const maxPagesAfterCurrent = Math.ceil(maxVisiblePages / 2) - 1;
            
            if (this.currentPage <= maxPagesBeforeCurrent) {
                // Текущая страница в начале
                startPage = 1;
                endPage = maxVisiblePages;
            } else if (this.currentPage + maxPagesAfterCurrent >= this.totalPages) {
                // Текущая страница в конце
                startPage = this.totalPages - maxVisiblePages + 1;
                endPage = this.totalPages;
            } else {
                // Текущая страница в середине
                startPage = this.currentPage - maxPagesBeforeCurrent;
                endPage = this.currentPage + maxPagesAfterCurrent;
            }
        }
        
        // Создаем кнопки для диапазона страниц
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-btn ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => this.goToPage(i));
            pageNumbersContainer.appendChild(pageBtn);
        }
        
        // Добавляем многоточие в начале, если нужно
        if (startPage > 1) {
            const ellipsisStart = document.createElement('span');
            ellipsisStart.className = 'page-btn ellipsis';
            ellipsisStart.textContent = '...';
            pageNumbersContainer.insertBefore(ellipsisStart, pageNumbersContainer.firstChild);
            
            const firstPageBtn = document.createElement('button');
            firstPageBtn.className = 'page-btn';
            firstPageBtn.textContent = '1';
            firstPageBtn.addEventListener('click', () => this.goToPage(1));
            pageNumbersContainer.insertBefore(firstPageBtn, pageNumbersContainer.firstChild);
        }
        
        // Добавляем многоточие в конце, если нужно
        if (endPage < this.totalPages) {
            const ellipsisEnd = document.createElement('span');
            ellipsisEnd.className = 'page-btn ellipsis';
            ellipsisEnd.textContent = '...';
            pageNumbersContainer.appendChild(ellipsisEnd);
            
            const lastPageBtn = document.createElement('button');
            lastPageBtn.className = 'page-btn';
            lastPageBtn.textContent = this.totalPages;
            lastPageBtn.addEventListener('click', () => this.goToPage(this.totalPages));
            pageNumbersContainer.appendChild(lastPageBtn);
        }
    }

    // ==================== ПРОКРУТКА К ВЕРХУ ====================
    scrollToTop() {
        const evaluationsList = document.getElementById('evaluationsList');
        if (evaluationsList) {
            evaluationsList.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // ==================== ЛОГИКА ЧЕКБОКСОВ "ОК" ====================
    setupOkCheckboxes() {
        const criteria = ['contact', 'presentation', 'objections', 'closing', 'tov'];
        
        criteria.forEach(criterion => {
            const okCheckbox = document.getElementById(`${criterion}Ok`);
            if (!okCheckbox) return;
            
            const errorCheckboxes = document.querySelectorAll(`input[id^="${criterion}Error"]`);
            
            okCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    errorCheckboxes.forEach(cb => {
                        cb.checked = false;
                        cb.disabled = true;
                    });
                } else {
                    errorCheckboxes.forEach(cb => {
                        cb.disabled = false;
                    });
                }
            });
            
            errorCheckboxes.forEach(cb => {
                cb.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        okCheckbox.checked = false;
                        errorCheckboxes.forEach(errorCb => {
                            errorCb.disabled = false;
                        });
                    }
                });
            });
        });
    }

    // ==================== ВАЛИДАЦИЯ ЧЕКБОКСОВ ====================
    validateCheckboxes() {
        const criteria = [
            { key: 'contact', name: 'Установление контакта' },
            { key: 'presentation', name: 'Презентация/Предложение' },
            { key: 'objections', name: 'Отработка возражений' },
            { key: 'closing', name: 'Завершение' },
            { key: 'tov', name: 'TOV' }
        ];
        
        const missingCriteria = [];
        
        for (const criterion of criteria) {
            const okCheckbox = document.getElementById(`${criterion.key}Ok`);
            const errorCheckboxes = document.querySelectorAll(`input[id^="${criterion.key}Error"]:checked`);
            
            const hasOk = okCheckbox && okCheckbox.checked;
            const hasErrors = errorCheckboxes.length > 0;
            
            if (!hasOk && !hasErrors) {
                // Находим родительский контейнер критерия
                const criterionElement = okCheckbox ? okCheckbox.closest('.criterion') : null;
                missingCriteria.push({
                    name: criterion.name,
                    element: criterionElement
                });
            }
        }
        
        return missingCriteria;
    }

    // ==================== ОЧИСТКА ВАЛИДАЦИОННЫХ ОШИБОК ====================
    clearValidationErrors() {
        // Убираем красные рамки
        document.querySelectorAll('.validation-error').forEach(element => {
            element.classList.remove('validation-error');
        });
        
        // Убираем сообщения об ошибках
        document.querySelectorAll('.error-message').forEach(element => {
            element.remove();
        });
    }

    // ==================== ПОКАЗАТЬ ОШИБКУ ВАЛИДАЦИИ ====================
    showValidationError(element, message) {
        if (!element) return;
        
        // Добавляем красную рамку
        element.classList.add('validation-error');
        
        // Если это контейнер критерия, находим заголовок для сообщения
        let targetElement = element;
        if (element.classList.contains('criterion')) {
            // Находим заголовок внутри критерия
            const header = element.querySelector('h3');
            if (header) {
                targetElement = header;
            }
        }
        
        // Удаляем старое сообщение об ошибке
        const existingError = targetElement.nextElementSibling?.classList.contains('error-message') 
            ? targetElement.nextElementSibling 
            : null;
        if (existingError) {
            existingError.remove();
        }
        
        // Создаем новое сообщение об ошибке
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.color = '#dc3545';
        errorDiv.style.fontSize = '14px';
        errorDiv.style.marginTop = '5px';
        errorDiv.style.padding = '5px 10px';
        errorDiv.style.backgroundColor = '#f8d7da';
        errorDiv.style.borderRadius = '4px';
        errorDiv.style.border = '1px solid #f5c6cb';
        errorDiv.textContent = message;
        
        // Добавляем сообщение после элемента
        if (targetElement.nextSibling) {
            targetElement.parentNode.insertBefore(errorDiv, targetElement.nextSibling);
        } else {
            targetElement.parentNode.appendChild(errorDiv);
        }
        
        // Прокручиваем к ошибке
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Фокусируемся на первом чекбоксе в критерии
        if (element.classList.contains('criterion')) {
            const firstCheckbox = element.querySelector('input[type="checkbox"]');
            if (firstCheckbox) {
                firstCheckbox.focus();
            }
        } else {
            element.focus();
        }
    }

    // ==================== ИНИЦИАЛИЗАЦИЯ SUPABASE ====================
    initializeSupabase() {
        try {
            if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
                this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                console.log('Supabase клиент инициализирован');
            } else {
                console.warn('Supabase не доступен, работаем в режиме демо');
                this.supabase = null;
            }
        } catch (error) {
            console.error('Ошибка инициализации Supabase:', error);
            this.supabase = null;
        }
    }

    // ==================== ЛОКАЛЬНОЕ ХРАНИЛИЩЕ ====================
    getLocalEvaluations() {
        try {
            const stored = localStorage.getItem('callEvaluations');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Ошибка чтения из localStorage:', error);
            return [];
        }
    }

    saveLocalEvaluation(evaluationData) {
        try {
            const evaluations = this.getLocalEvaluations();
            evaluationData.id = Date.now();
            evaluationData.created_at = new Date().toISOString();
            evaluations.unshift(evaluationData);
            localStorage.setItem('callEvaluations', JSON.stringify(evaluations));
            return evaluationData;
        } catch (error) {
            console.error('Ошибка сохранения в localStorage:', error);
            throw error;
        }
    }

    // ==================== ФОРМАТ ДЛИТЕЛЬНОСТИ ====================
    setupDurationInput() {
        const durationInput = document.getElementById('callDuration');
        if (durationInput) {
            durationInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 6) value = value.substring(0, 6);
                
                if (value.length >= 2) value = value.substring(0, 2) + ':' + value.substring(2);
                if (value.length >= 5) value = value.substring(0, 5) + ':' + value.substring(5);
                
                e.target.value = value;
            });
        }
    }

    // ==================== ФИЛЬТРАЦИЯ ПО МЕНЕДЖЕРАМ ====================
    setupManagerFilters() {
        this.populateManagerCheckboxes('managerFilter', this.selectedManagers);
        this.populateManagerCheckboxes('statsManagerFilter', this.statsSelectedManagers);
    }

    populateManagerCheckboxes(containerId, selectedArray) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
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
                    if (index > -1) selectedArray.splice(index, 1);
                }
            });
            
            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            container.appendChild(checkboxDiv);
        });
    }

    // ==================== ЗАПОЛНЕНИЕ СПИСКА МП ====================
    populateManagersList() {
        const managerSelect = document.getElementById('managerName');
        if (!managerSelect) return;
        
        managerSelect.innerHTML = '<option value="">Выберите МП</option>';
        
        MANAGERS_LIST.forEach(manager => {
            const option = document.createElement('option');
            option.value = manager;
            option.textContent = manager;
            managerSelect.appendChild(option);
        });
    }

    // ==================== АУТЕНТИФИКАЦИЯ ====================
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
        
        this.loadEvaluations();
        this.updateTotalScore();
        this.setDefaultDates();
    }

    // ==================== СОХРАНЕНИЕ ОЦЕНКИ ====================
    async saveEvaluation(e) {
        e.preventDefault();
        
        if (!this.isAuthenticated) {
            this.showMessage('❌ Доступ запрещен', 'error');
            return;
        }

        // Очищаем предыдущие ошибки
        this.clearValidationErrors();

        // Проверка обязательных полей
        const requiredFields = [
            { id: 'evaluationDate', name: 'Дата проверки' },
            { id: 'managerName', name: 'ФИО МП' },
            { id: 'callDate', name: 'Дата звонка' },
            { id: 'callDuration', name: 'Длительность звонка' },
            { id: 'isTarget', name: 'Целевой' },
            { id: 'laterWork', name: 'Искал работу на более позднее время' },
            { id: 'isGoodCall', name: 'Хороший звонок' },
            { id: 'contactScore', name: 'Баллы за контакт' },
            { id: 'presentationScore', name: 'Баллы за презентацию' },
            { id: 'objectionsScore', name: 'Баллы за возражения' },
            { id: 'closingScore', name: 'Баллы за завершение' }
        ];

        let hasError = false;
        let firstErrorElement = null;

        // Проверяем обязательные поля
        for (const field of requiredFields) {
            const element = document.getElementById(field.id);
            if (!element || !element.value.trim()) {
                this.showValidationError(element, `❌ Заполните поле: ${field.name}`);
                hasError = true;
                if (!firstErrorElement) firstErrorElement = element;
            }
        }

        // Проверяем чекбоксы
        const missingCriteria = this.validateCheckboxes();
        if (missingCriteria.length > 0) {
            missingCriteria.forEach(item => {
                if (item.element) {
                    this.showValidationError(item.element, `❌ Выберите "Ок" или ошибки для: ${item.name}`);
                    hasError = true;
                    if (!firstErrorElement) firstErrorElement = item.element;
                }
            });
        }

        // Если есть ошибки - не продолжаем
        if (hasError) {
            // Прокручиваем к первой ошибке
            if (firstErrorElement) {
                firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // Валидация баллов
        const scores = {
            contact: parseInt(document.getElementById('contactScore').value),
            presentation: parseInt(document.getElementById('presentationScore').value),
            objections: parseInt(document.getElementById('objectionsScore').value),
            closing: parseInt(document.getElementById('closingScore').value),
            tov: parseInt(document.getElementById('tovScore').value)
        };

        const scoreValidations = [
            { id: 'contactScore', value: scores.contact, min: 0, max: 30, name: 'контакт' },
            { id: 'presentationScore', value: scores.presentation, min: 0, max: 30, name: 'презентацию' },
            { id: 'objectionsScore', value: scores.objections, min: 0, max: 30, name: 'возражения' },
            { id: 'closingScore', value: scores.closing, min: 0, max: 10, name: 'завершение' }
        ];

        for (const validation of scoreValidations) {
            if (validation.value < validation.min || validation.value > validation.max) {
                const element = document.getElementById(validation.id);
                this.showValidationError(element, `❌ Баллы за ${validation.name} должны быть от ${validation.min} до ${validation.max}`);
                hasError = true;
                if (!firstErrorElement) firstErrorElement = element;
            }
        }

        if (hasError) {
            if (firstErrorElement) {
                firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        try {
            // Собираем данные
            const contactErrors = this.getSelectedErrors('contact');
            const presentationErrors = this.getSelectedErrors('presentation');
            const objectionsErrors = this.getSelectedErrors('objections');
            const closingErrors = this.getSelectedErrors('closing');
            const tovErrors = this.getSelectedErrors('tov');

            const evaluationData = {
                evaluation_date: document.getElementById('evaluationDate').value,
                manager_name: document.getElementById('managerName').value,
                phone_number: document.getElementById('phoneNumber').value || null,
                lead_link: document.getElementById('leadLink').value || null,
                call_date: document.getElementById('callDate').value,
                call_duration: document.getElementById('callDuration').value,
                is_target: document.getElementById('isTarget').value,
                later_work: document.getElementById('laterWork').value,
                is_good_call: document.getElementById('isGoodCall').value,
                
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

            let savedData;
            
            if (this.supabase) {
                const { data, error } = await this.supabase
                    .from('evaluations')
                    .insert([evaluationData])
                    .select();

                if (error) throw error;
                savedData = data[0];
            } else {
                savedData = this.saveLocalEvaluation(evaluationData);
            }

            this.showMessage('✅ Оценка успешно сохранена!', 'success');
            
            document.getElementById('evaluationForm').reset();
            this.setDefaultDates();
            this.updateTotalScore();
            this.clearAllErrorCheckboxes();
            this.clearValidationErrors();
            
            await this.loadEvaluations();
            
        } catch (error) {
            console.error('Ошибка при сохранении:', error);
            this.showMessage(`❌ Ошибка при сохранении: ${error.message}`, 'error');
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
            checkbox.disabled = false;
        });
    }

    // ==================== ОБНОВЛЕННЫЙ МЕТОД ЗАГРУЗКИ ОЦЕНОК ====================
    async loadEvaluations(searchTerm = '') {
        try {
            let evaluationsData = [];

            if (this.supabase) {
                let query = this.supabase
                    .from('evaluations')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (searchTerm) query = query.ilike('manager_name', `%${searchTerm}%`);

                const { data, error } = await query;
                if (error) throw error;
                evaluationsData = data || [];
            } else {
                evaluationsData = this.getLocalEvaluations();
                if (searchTerm) {
                    evaluationsData = evaluationsData.filter(item => 
                        item.manager_name.toLowerCase().includes(searchTerm.toLowerCase().trim())
                    );
                }
            }

            this.evaluations = evaluationsData;
            this.filteredEvaluations = [...this.evaluations];
            this.currentPage = 1; // Сброс на первую страницу
            this.getPaginatedData();
            this.displayEvaluations();
            this.updatePaginationControls();
            
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            this.evaluations = this.getLocalEvaluations();
            this.filteredEvaluations = [...this.evaluations];
            this.currentPage = 1;
            this.getPaginatedData();
            this.displayEvaluations();
            this.updatePaginationControls();
            
            if (this.evaluations.length === 0) {
                this.showMessage('⚠️ Используется локальное хранилище. Данные будут сохранены только в этом браузере.', 'info');
            }
        }
    }

    // ==================== ОБНОВЛЕННЫЙ МЕТОД ФИЛЬТРАЦИИ ====================
    applyFilters() {
        let filtered = [...this.evaluations];
        
        const startDate = document.getElementById('viewStartDate')?.value;
        const endDate = document.getElementById('viewEndDate')?.value;
        
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
        
        if (this.selectedManagers.length > 0) {
            filtered = filtered.filter(item => this.selectedManagers.includes(item.manager_name));
        }
        
        // Фильтр по качеству звонка
        if (this.qualityFilter !== 'all') {
            filtered = filtered.filter(item => item.is_good_call === this.qualityFilter);
        }
        
        const searchTerm = document.getElementById('searchInput')?.value;
        if (searchTerm && searchTerm.trim() !== '') {
            filtered = filtered.filter(item => 
                item.manager_name.toLowerCase().includes(searchTerm.toLowerCase().trim())
            );
        }
        
        this.filteredEvaluations = filtered;
        
        // Сбрасываем на первую страницу при применении фильтров
        this.currentPage = 1;
        this.getPaginatedData();
        this.displayEvaluations();
        this.updatePaginationControls();
    }

    // ==================== УДАЛЕНИЕ ОЦЕНКИ ====================
    async deleteEvaluation(id) {
        if (!confirm('Вы уверены, что хотите удалить эту оценку?')) return;

        try {
            let success = false;
            
            if (this.supabase) {
                const { error } = await this.supabase
                    .from('evaluations')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
                success = true;
            }
            
            const evaluations = this.getLocalEvaluations();
            const updatedEvaluations = evaluations.filter(item => item.id !== id);
            localStorage.setItem('callEvaluations', JSON.stringify(updatedEvaluations));
            success = true;

            if (success) {
                this.showMessage('✅ Оценка удалена', 'success');
                this.loadEvaluations();
            }
            
        } catch (error) {
            console.error('Ошибка при удалении:', error);
            this.showMessage('❌ Ошибка при удалении: ' + error.message, 'error');
        }
    }

    // ==================== ОБНОВЛЕННЫЙ МЕТОД ОТОБРАЖЕНИЯ ОЦЕНОК ====================
    displayEvaluations() {
        const container = document.getElementById('evaluationsList');
        if (!container) return;
        
        const evaluationsToShow = this.displayedEvaluations;
        
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
                    <div class="evaluation-manager">
                        👤 ${evalItem.manager_name}
                        ${evalItem.is_good_call === 'да' ? 
                            '<span class="evaluation-good-call">🌟 Хороший звонок</span>' : 
                            ''}
                    </div>
                    <div class="evaluation-score">${evalItem.total_score}/100</div>
                </div>
                <div class="evaluation-details">
                    <div>📅 Дата звонка: ${this.formatDate(evalItem.call_date)}</div>
                    <div>⏱️ Длительность: ${evalItem.call_duration}</div>
                    <div>🎯 Целевой: ${evalItem.is_target}</div>
                    <div>🕒 Искал работу позже: ${evalItem.later_work}</div>
                    <div>🌟 Хороший звонок: ${evalItem.is_good_call === 'да' ? 'Да' : 'Нет'}</div>
                    <div>📊 Дата оценки: ${this.formatDate(evalItem.created_at)}</div>
                    ${evalItem.phone_number ? `<div>📞 Телефон: ${evalItem.phone_number}</div>` : ''}
                    ${evalItem.lead_link ? `<div>🔗 Ссылка: <a href="${evalItem.lead_link}" target="_blank">${evalItem.lead_link}</a></div>` : ''}
                </div>
                <div class="expand-icon">▼</div>
                
                <div class="evaluation-content">
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

    renderErrors(evalItem) {
        const errors = [];
        
        const formatErrors = (errorsText, category) => {
            if (!errorsText) return null;
            if (errorsText.includes('Ок')) {
                return `<strong>${category}:</strong> ✅ Ок`;
            } else {
                return `<strong>${category}:</strong> ${errorsText}`;
            }
        };
        
        if (evalItem.contact_errors) {
            const formatted = formatErrors(evalItem.contact_errors, 'Контакт');
            if (formatted) errors.push(formatted);
        }
        if (evalItem.presentation_errors) {
            const formatted = formatErrors(evalItem.presentation_errors, 'Презентация');
            if (formatted) errors.push(formatted);
        }
        if (evalItem.objections_errors) {
            const formatted = formatErrors(evalItem.objections_errors, 'Возражения');
            if (formatted) errors.push(formatted);
        }
        if (evalItem.closing_errors) {
            const formatted = formatErrors(evalItem.closing_errors, 'Завершение');
            if (formatted) errors.push(formatted);
        }
        if (evalItem.tov_errors) {
            const formatted = formatErrors(evalItem.tov_errors, 'TOV');
            if (formatted) errors.push(formatted);
        }
        if (evalItem.critical_error) {
            errors.push(`<strong>Критическая:</strong> ${evalItem.critical_error}`);
        }
        
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

    toggleEvaluation(element) {
        element.classList.toggle('expanded');
    }

    // ==================== ОБНОВЛЕНИЕ ФИЛЬТРА КАЧЕСТВА ====================
    updateQualityFilter(value) {
        this.qualityFilter = value;
        this.applyFilters();
    }

    // ==================== СТАТИСТИКА ====================
    async calculateStatistics() {
        const startDate = document.getElementById('statsStartDate')?.value;
        const endDate = document.getElementById('statsEndDate')?.value;

        try {
            let evaluationsData = [];

            if (this.supabase) {
                let query = this.supabase.from('evaluations').select('*');
                if (startDate && endDate) {
                    query = query.gte('call_date', startDate).lte('call_date', endDate);
                }
                const { data, error } = await query;
                if (error) throw error;
                evaluationsData = data || [];
            } else {
                evaluationsData = this.getLocalEvaluations();
                if (startDate && endDate) {
                    evaluationsData = evaluationsData.filter(item => {
                        const itemDate = new Date(item.call_date);
                        const start = new Date(startDate);
                        const end = new Date(endDate);
                        return itemDate >= start && itemDate <= end;
                    });
                }
            }
            
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
            const evaluationsData = this.getLocalEvaluations();
            this.displayStatistics(evaluationsData);
            this.displayAdditionalStats(evaluationsData);
            this.displayErrorsStatistics(evaluationsData);
        }
    }

    displayStatistics(evaluationsData) {
        const container = document.getElementById('statsResults');
        if (!container) return;
        
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
        
        // Статистика хороших звонков
        const goodCalls = evaluationsData.filter(item => item.is_good_call === 'да').length;
        const goodCallsPercentage = totalCalls > 0 ? ((goodCalls / totalCalls) * 100).toFixed(1) : 0;

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
            <div class="stat-card stat-good-calls">
                <div class="stat-label">🌟 Хороших звонков</div>
                <div class="stat-value">${goodCalls}</div>
                <div>${goodCallsPercentage}%</div>
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

        let managersStatsHTML = '';
        if (this.statsSelectedManagers.length > 0) {
            managersStatsHTML = this.displayManagersDetailedStats(evaluationsData);
        }

        container.innerHTML = baseStatsHTML + managersStatsHTML;
    }

    displayManagersDetailedStats(evaluationsData) {
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
                    tovScore: 0,
                    goodCalls: 0
                };
            }
            
            managersData[item.manager_name].evaluations.push(item);
            managersData[item.manager_name].totalScore += item.total_score;
            managersData[item.manager_name].contactScore += item.contact_score;
            managersData[item.manager_name].presentationScore += item.presentation_score;
            managersData[item.manager_name].objectionsScore += item.objections_score;
            managersData[item.manager_name].closingScore += item.closing_score;
            managersData[item.manager_name].tovScore += item.tov_score;
            if (item.is_good_call === 'да') {
                managersData[item.manager_name].goodCalls++;
            }
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
            const goodCallsPercentage = evalCount > 0 ? ((data.goodCalls / evalCount) * 100).toFixed(1) : 0;

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
                            <div class="manager-stat-label">🌟 Хороших звонков</div>
                            <div class="manager-stat-value">${data.goodCalls}</div>
                            <div class="manager-stat-max">${goodCallsPercentage}%</div>
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
        if (!container) return;
        
        if (!evaluationsData || evaluationsData.length === 0) {
            container.innerHTML = '';
            return;
        }

        const totalCalls = evaluationsData.length;
        
        const targetStats = {
            да: evaluationsData.filter(item => item.is_target === 'да').length,
            нет: evaluationsData.filter(item => item.is_target === 'нет').length
        };

        const laterWorkStats = {
            да: evaluationsData.filter(item => item.later_work === 'да').length,
            нет: evaluationsData.filter(item => item.later_work === 'нет').length
        };

        const goodCallStats = {
            да: evaluationsData.filter(item => item.is_good_call === 'да').length,
            нет: evaluationsData.filter(item => item.is_good_call === 'нет').length
        };

        container.innerHTML = `
            <div class="additional-stats-section">
                <h3>🎯 Статистика по целевым звонкам</h3>
                <div class="additional-stats-grid">
                    <div class="additional-stat-card">
                        <div class="additional-stat-label">Целевые звонки</div>
                        <div class="additional-stat-value">${targetStats.да}</div>
                        <div>${totalCalls > 0 ? ((targetStats.да / totalCalls) * 100).toFixed(1) : 0}%</div>
                    </div>
                    <div class="additional-stat-card">
                        <div class="additional-stat-label">Нецелевые звонки</div>
                        <div class="additional-stat-value">${targetStats.нет}</div>
                        <div>${totalCalls > 0 ? ((targetStats.нет / totalCalls) * 100).toFixed(1) : 0}%</div>
                    </div>
                </div>
            </div>
            <div class="additional-stats-section">
                <h3>🕒 Статистика по поиску работы на более позднее время</h3>
                <div class="additional-stats-grid">
                    <div class="additional-stat-card">
                        <div class="additional-stat-label">Искали работу позже</div>
                        <div class="additional-stat-value">${laterWorkStats.да}</div>
                        <div>${totalCalls > 0 ? ((laterWorkStats.да / totalCalls) * 100).toFixed(1) : 0}%</div>
                    </div>
                    <div class="additional-stat-card">
                        <div class="additional-stat-label">Не искали работу позже</div>
                        <div class="additional-stat-value">${laterWorkStats.нет}</div>
                        <div>${totalCalls > 0 ? ((laterWorkStats.нет / totalCalls) * 100).toFixed(1) : 0}%</div>
                    </div>
                </div>
            </div>
            <div class="additional-stats-section">
                <h3>🌟 Статистика по хорошим звонкам</h3>
                <div class="additional-stats-grid">
                    <div class="additional-stat-card" style="border-left: 4px solid #ff9800;">
                        <div class="additional-stat-label">Хорошие звонки</div>
                        <div class="additional-stat-value" style="color: #ff9800;">${goodCallStats.да}</div>
                        <div>${totalCalls > 0 ? ((goodCallStats.да / totalCalls) * 100).toFixed(1) : 0}%</div>
                    </div>
                    <div class="additional-stat-card">
                        <div class="additional-stat-label">Обычные звонки</div>
                        <div class="additional-stat-value">${goodCallStats.нет}</div>
                        <div>${totalCalls > 0 ? ((goodCallStats.нет / totalCalls) * 100).toFixed(1) : 0}%</div>
                    </div>
                </div>
            </div>
        `;
    }

    displayErrorsStatistics(evaluationsData) {
        const container = document.getElementById('errorsStats');
        if (!container) return;
        
        if (!evaluationsData || evaluationsData.length === 0) {
            container.innerHTML = '';
            return;
        }

        const errorsStats = {
            contact: {},
            presentation: {},
            objections: {},
            closing: {},
            tov: {},
            critical: 0
        };

        const totalCalls = evaluationsData.length;

        evaluationsData.forEach(item => {
            if (item.contact_errors) {
                item.contact_errors.split('; ').forEach(error => {
                    // Исключаем "Ок" из статистики ошибок
                    if (error !== 'Ок') {
                        errorsStats.contact[error] = (errorsStats.contact[error] || 0) + 1;
                    }
                });
            }
            if (item.presentation_errors) {
                item.presentation_errors.split('; ').forEach(error => {
                    if (error !== 'Ок') {
                        errorsStats.presentation[error] = (errorsStats.presentation[error] || 0) + 1;
                    }
                });
            }
            if (item.objections_errors) {
                item.objections_errors.split('; ').forEach(error => {
                    if (error !== 'Ок') {
                        errorsStats.objections[error] = (errorsStats.objections[error] || 0) + 1;
                    }
                });
            }
            if (item.closing_errors) {
                item.closing_errors.split('; ').forEach(error => {
                    if (error !== 'Ок') {
                        errorsStats.closing[error] = (errorsStats.closing[error] || 0) + 1;
                    }
                });
            }
            if (item.tov_errors) {
                item.tov_errors.split('; ').forEach(error => {
                    if (error !== 'Ок') {
                        errorsStats.tov[error] = (errorsStats.tov[error] || 0) + 1;
                    }
                });
            }
            if (item.critical_error && item.critical_error.trim() !== '') {
                errorsStats.critical++;
            }
        });

        let errorsHTML = '';

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
                    const percentage = totalCalls > 0 ? ((count / totalCalls) * 100).toFixed(1) : 0;
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

        if (errorsStats.critical > 0) {
            const criticalPercentage = totalCalls > 0 ? ((errorsStats.critical / totalCalls) * 100).toFixed(1) : 0;
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

    // ==================== ЭКСПОРТ В XLSX ====================
    async exportToExcel() {
        const evaluationsToExport = this.filteredEvaluations.length > 0 ? this.filteredEvaluations : this.evaluations;
        
        if (!evaluationsToExport || evaluationsToExport.length === 0) {
            this.showMessage('❌ Нет данных для экспорта', 'error');
            return;
        }

        const headers = [
            'ФИО МП', 'Дата проверки', 'Дата звонка', 'Длительность звонка',
            'Целевой', 'Искал работу на более позднее время', 'Хороший звонок',
            'Номер телефона', 'Ссылка на лид', 'Общий балл', 'Установление контакта - Баллы',
            'Установление контакта - Ошибки', 'Установление контакта - Комментарий',
            'Презентация - Баллы', 'Презентация - Ошибки', 'Презентация - Комментарий',
            'Отработка возражений - Баллы', 'Отработка возражений - Ошибки',
            'Отработка возражений - Комментарий', 'Завершение - Баллы',
            'Завершение - Ошибки', 'Завершение - Комментарий', 'TOV - Баллы',
            'TOV - Ошибки', 'TOV - Комментарий', 'Критическая ошибка',
            'Общий комментарий', 'Дата создания записи'
        ];

        const data = evaluationsToExport.map(item => [
            item.manager_name, item.evaluation_date, item.call_date,
            item.call_duration, item.is_target, item.later_work,
            item.is_good_call === 'да' ? 'Да' : 'Нет',
            item.phone_number || '', item.lead_link || '', item.total_score,
            item.contact_score, item.contact_errors || '', item.contact_comment || '',
            item.presentation_score, item.presentation_errors || '', item.presentation_comment || '',
            item.objections_score, item.objections_errors || '', item.objections_comment || '',
            item.closing_score, item.closing_errors || '', item.closing_comment || '',
            item.tov_score, item.tov_errors || '', item.tov_comment || '',
            item.critical_error || '', item.overall_comment || '',
            new Date(item.created_at).toLocaleDateString('ru-RU')
        ]);

        try {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

            const colWidths = [
                { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 10 },
                { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 12 },
                { wch: 10 }, { wch: 30 }, { wch: 30 }, { wch: 10 }, { wch: 30 },
                { wch: 30 }, { wch: 10 }, { wch: 30 }, { wch: 30 }, { wch: 10 },
                { wch: 30 }, { wch: 30 }, { wch: 10 }, { wch: 30 }, { wch: 30 },
                { wch: 25 }, { wch: 30 }, { wch: 15 }
            ];
            ws['!cols'] = colWidths;

            ws['!autofilter'] = { ref: "A1:AA1" };

            XLSX.utils.book_append_sheet(wb, ws, 'Оценки звонков');

            const dateStr = new Date().toISOString().split('T')[0];
            const filename = `Оценки_звонков_${dateStr}.xlsx`;
            
            XLSX.writeFile(wb, filename);
            
            this.showMessage('✅ Отчет успешно выгружен в формате Excel (XLSX)', 'success');
            
        } catch (error) {
            console.error('Ошибка при экспорте в Excel:', error);
            this.showMessage('❌ Ошибка при экспорте в Excel', 'error');
        }
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

        const display = document.getElementById('totalScoreDisplay');
        if (display) {
            display.textContent = total;
        }
    }

    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        const evaluationDate = document.getElementById('evaluationDate');
        const callDate = document.getElementById('callDate');
        
        if (evaluationDate) evaluationDate.value = today;
        if (callDate) callDate.value = today;
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU');
        } catch (error) {
            return dateString;
        }
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.getElementById('auth-message');
        if (!messageDiv) return;
        
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

        const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
        const tabContent = document.getElementById(tabName);
        
        if (tabButton) tabButton.classList.add('active');
        if (tabContent) tabContent.classList.add('active');

        if (tabName === 'view') {
            this.loadEvaluations();
        } else if (tabName === 'stats') {
            this.calculateStatistics();
        }
    }

    // ==================== ОБНОВЛЁННЫЙ МЕТОД ИНИЦИАЛИЗАЦИИ СОБЫТИЙ ====================
    initializeEventListeners() {
        // Авторизация
        const loginBtn = document.getElementById('login-btn');
        const passwordInput = document.getElementById('password');
        const logoutBtn = document.getElementById('logout-btn');

        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const password = passwordInput ? passwordInput.value : '';
                
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
        }

        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    if (loginBtn) loginBtn.click();
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
                this.showMessage('✅ Выход выполнен', 'success');
            });
        }

        // Форма оценки
        const evaluationForm = document.getElementById('evaluationForm');
        if (evaluationForm) {
            evaluationForm.addEventListener('submit', (e) => {
                this.saveEvaluation(e);
            });
        }

        // Обновление итогового балла
        document.querySelectorAll('.criterion input[type="number"]').forEach(input => {
            input.addEventListener('input', () => this.updateTotalScore());
        });

        // ФИЛЬТРЫ ПРОСМОТРА
        const applyFiltersBtn = document.getElementById('applyFilters');
        const clearFiltersBtn = document.getElementById('clearFilters');
        const searchInput = document.getElementById('searchInput');
        const exportBtn = document.getElementById('exportBtn');

        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.applyFilters();
            });
        }

        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.selectedManagers = [];
                this.qualityFilter = 'all';
                this.currentPage = 1; // Сброс на первую страницу
                this.setupManagerFilters();
                const viewStartDate = document.getElementById('viewStartDate');
                const viewEndDate = document.getElementById('viewEndDate');
                
                if (viewStartDate) viewStartDate.value = '';
                if (viewEndDate) viewEndDate.value = '';
                if (searchInput) searchInput.value = '';
                
                // Сброс радио-кнопок качества
                document.getElementById('quality-all').checked = true;
                
                this.applyFilters();
                this.showMessage('✅ Фильтры сброшены', 'success');
            });
        }

        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.applyFilters();
                }, 300);
            });
        }

        // Обработчики для фильтра качества
        document.querySelectorAll('input[name="qualityFilter"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.updateQualityFilter(e.target.value);
            });
        });

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportToExcel();
            });
        }

        // СТАТИСТИКА
        const calculateStatsBtn = document.getElementById('calculateStats');
        const clearStatsFiltersBtn = document.getElementById('clearStatsFilters');

        if (calculateStatsBtn) {
            calculateStatsBtn.addEventListener('click', () => {
                this.calculateStatistics();
            });
        }

        if (clearStatsFiltersBtn) {
            clearStatsFiltersBtn.addEventListener('click', () => {
                this.statsSelectedManagers = [];
                this.setupManagerFilters();
                const statsStartDate = document.getElementById('statsStartDate');
                const statsEndDate = document.getElementById('statsEndDate');
                
                if (statsStartDate) statsStartDate.value = '';
                if (statsEndDate) statsEndDate.value = '';
                
                this.calculateStatistics();
                this.showMessage('✅ Фильтры статистики сброшены', 'success');
            });
        }

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