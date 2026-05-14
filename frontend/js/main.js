// Главный модуль - точка входа
let apiClient, authManager, evaluationForm, evaluationsList, statistics, exportModule, pagination, employeesModule;

async function initManagerFilters() {
    try {
        const managers = await apiClient.getManagers();
        
        // Заполнение фильтров менеджеров
        const managerFilter = document.getElementById('managerFilter');
        const statsManagerFilter = document.getElementById('statsManagerFilter');
        
        if (managerFilter) {
            managerFilter.innerHTML = '';
            managers.forEach(manager => {
                const div = document.createElement('div');
                div.className = 'manager-checkbox';
                div.innerHTML = `
                    <input type="checkbox" id="filter-${manager.id}" value="${manager.name}">
                    <label for="filter-${manager.id}">${Utils.escapeHtml(manager.name)}</label>
                `;
                const checkbox = div.querySelector('input');
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        if (!evaluationsList.filters.managers.includes(manager.name)) {
                            evaluationsList.filters.managers.push(manager.name);
                        }
                    } else {
                        const index = evaluationsList.filters.managers.indexOf(manager.name);
                        if (index > -1) evaluationsList.filters.managers.splice(index, 1);
                    }
                    evaluationsList.applyFilters();
                });
                managerFilter.appendChild(div);
            });
        }
        
        if (statsManagerFilter) {
            statsManagerFilter.innerHTML = '';
            managers.forEach(manager => {
                const div = document.createElement('div');
                div.className = 'manager-checkbox';
                div.innerHTML = `
                    <input type="checkbox" id="stats-${manager.id}" value="${manager.name}">
                    <label for="stats-${manager.id}">${Utils.escapeHtml(manager.name)}</label>
                `;
                const checkbox = div.querySelector('input');
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        if (!statistics.selectedManagers.includes(manager.name)) {
                            statistics.selectedManagers.push(manager.name);
                        }
                    } else {
                        const index = statistics.selectedManagers.indexOf(manager.name);
                        if (index > -1) statistics.selectedManagers.splice(index, 1);
                    }
                });
                statsManagerFilter.appendChild(div);
            });
        }
        
        // Заполнение выпадающего списка в форме
        const managerSelect = document.getElementById('managerName');
        if (managerSelect) {
            managerSelect.innerHTML = '<option value="">Выберите МП</option>';
            managers.forEach(manager => {
                const option = document.createElement('option');
                option.value = manager.name;
                option.textContent = manager.name;
                managerSelect.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Ошибка загрузки менеджеров:', error);
    }
}

function setupTabSwitching() {
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', async (e) => {
            const tabName = e.target.dataset.tab;
            
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            e.target.classList.add('active');
            document.getElementById(tabName).classList.add('active');
            
            if (tabName === 'view') {
                await evaluationsList.loadData();
            } else if (tabName === 'stats') {
                await statistics.calculate();
            } else if (tabName === 'employees') {
                await employeesModule.loadManagers();
            }
        });
    });
}

async function init() {
    // Инициализация API клиента
    apiClient = new APIClient();
    
    // Инициализация авторизации
    authManager = new AuthManager(apiClient);
    
    authManager.onAuthChange(async (isAuthenticated) => {
        if (isAuthenticated) {
            authManager.showApp();
            await initManagerFilters();
            Utils.setDefaultDates();
            Utils.updateTotalScore();
            
            // Инициализация модулей после авторизации
            pagination = new Pagination(20);
            
            evaluationsList = new EvaluationsList(apiClient, pagination, async () => {
                if (statistics) await statistics.calculate();
            });
            
            evaluationForm = new EvaluationForm(apiClient, async () => {
                await evaluationsList.loadData();
                if (statistics) await statistics.calculate();
            });
            
            statistics = new StatisticsModule(apiClient);
            exportModule = new ExportModule(apiClient, () => evaluationsList.filteredEvaluations);
            
            // Инициализация модуля сотрудников
            employeesModule = new EmployeesModule(apiClient);
            
            // Функция обновления списка менеджеров во всех местах
            window.managerRefreshCallback = async () => {
                // Обновляем выпадающий список в форме
                const managers = await apiClient.getManagers();
                const managerSelect = document.getElementById('managerName');
                if (managerSelect) {
                    const currentValue = managerSelect.value;
                    managerSelect.innerHTML = '<option value="">Выберите МП</option>';
                    managers.forEach(manager => {
                        const option = document.createElement('option');
                        option.value = manager.name;
                        option.textContent = manager.name;
                        managerSelect.appendChild(option);
                    });
                    if (currentValue && managers.some(m => m.name === currentValue)) {
                        managerSelect.value = currentValue;
                    }
                }
                
                // Обновляем фильтры в просмотре оценок и статистике
                if (evaluationsList) {
                    await evaluationsList.refreshManagerFilters();
                }
                if (statistics) {
                    await statistics.refreshManagerFilters();
                }
            };
            
            await evaluationsList.loadData();
            await employeesModule.loadManagers();
            
            // Сохраняем ссылку для доступа из onclick
            window.evaluationsList = evaluationsList;
            
        } else {
            authManager.showAuth();
        }
    });
    
    await authManager.checkAuthentication();
    
    // Настройка обработчиков входа
    const loginBtn = document.getElementById('login-btn');
    const passwordInput = document.getElementById('password');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const password = passwordInput ? passwordInput.value : '';
            
            if (!password) {
                Utils.showMessage('❌ Введите пароль', 'error');
                return;
            }
            
            if (await authManager.login(password)) {
                Utils.showMessage('✅ Вход успешен!', 'success');
            } else {
                Utils.showMessage('❌ Неверный пароль', 'error');
            }
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && loginBtn) loginBtn.click();
        });
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            authManager.logout();
            Utils.showMessage('✅ Выход выполнен', 'success');
        });
    }
    
    setupTabSwitching();
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', init);