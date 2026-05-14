// Модуль управления сотрудниками
class EmployeesModule {
    constructor(apiClient) {
        this.api = apiClient;
        this.managers = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const addBtn = document.getElementById('addManagerBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.addManager());
        }

        const newNameInput = document.getElementById('newManagerName');
        if (newNameInput) {
            newNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addManager();
                }
            });
        }
    }

    async loadManagers() {
        try {
            const managers = await this.api.getManagers();
            this.managers = managers;
            this.renderManagersList();
            return managers;
        } catch (error) {
            console.error('Ошибка загрузки сотрудников:', error);
            Utils.showMessage('❌ Ошибка загрузки списка сотрудников', 'error');
            return [];
        }
    }

    async addManager() {
        const nameInput = document.getElementById('newManagerName');
        const name = nameInput.value.trim();

        if (!name) {
            Utils.showMessage('❌ Введите ФИО сотрудника', 'error');
            return;
        }

        try {
            const result = await this.api.request('/managers', {
                method: 'POST',
                body: JSON.stringify({ name: name })
            });

            if (result.success) {
                Utils.showMessage(result.message, 'success');
                nameInput.value = '';
                await this.loadManagers();
                
                // Обновляем список менеджеров в других модулях
                if (window.managerRefreshCallback) {
                    await window.managerRefreshCallback();
                }
            } else {
                Utils.showMessage(result.message, 'error');
            }
        } catch (error) {
            console.error('Ошибка добавления сотрудника:', error);
            Utils.showMessage('❌ Ошибка при добавлении сотрудника', 'error');
        }
    }

    async updateManager(id, oldName, newName) {
        if (!newName.trim()) {
            Utils.showMessage('❌ Имя не может быть пустым', 'error');
            return;
        }

        if (newName === oldName) {
            return;
        }

        try {
            const result = await this.api.request(`/managers/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ name: newName })
            });

            if (result.success) {
                Utils.showMessage(result.message, 'success');
                await this.loadManagers();
                
                // Обновляем список менеджеров в других модулях
                if (window.managerRefreshCallback) {
                    await window.managerRefreshCallback();
                }
            } else {
                Utils.showMessage(result.message, 'error');
            }
        } catch (error) {
            console.error('Ошибка обновления сотрудника:', error);
            Utils.showMessage('❌ Ошибка при обновлении сотрудника', 'error');
        }
    }

    async deleteManager(id, name) {
        if (!confirm(`Вы уверены, что хотите удалить сотрудника "${name}"?\n\nОбратите внимание: оценки этого сотрудника останутся в системе.`)) {
            return;
        }

        try {
            const result = await this.api.request(`/managers/${id}`, {
                method: 'DELETE'
            });

            if (result.success) {
                Utils.showMessage(result.message, 'success');
                await this.loadManagers();
                
                // Обновляем список менеджеров в других модулях
                if (window.managerRefreshCallback) {
                    await window.managerRefreshCallback();
                }
            } else {
                Utils.showMessage(result.message, 'error');
            }
        } catch (error) {
            console.error('Ошибка удаления сотрудника:', error);
            Utils.showMessage('❌ Ошибка при удалении сотрудника', 'error');
        }
    }

    renderManagersList() {
        const container = document.getElementById('managersList');
        if (!container) return;

        if (this.managers.length === 0) {
            container.innerHTML = `
                <div class="empty-managers">
                    <p>📝 Список сотрудников пуст</p>
                    <p>Добавьте первого сотрудника с помощью формы выше</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="managers-table-container">
                <table class="managers-table">
                    <thead>
                        <tr>
                            <th>№</th>
                            <th>ФИО сотрудника</th>
                            <th>Дата добавления</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.managers.map((manager, index) => this.renderManagerRow(manager, index + 1)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        // Добавляем обработчики для кнопок редактирования и удаления
        this.attachRowHandlers();
    }

    renderManagerRow(manager, index) {
        const date = manager.created_at ? new Date(manager.created_at).toLocaleDateString('ru-RU') : '';
        
        return `
            <tr data-id="${manager.id}" data-name="${Utils.escapeHtml(manager.name)}">
                <td>${index}</td>
                <td class="manager-name-cell">
                    <span class="manager-name-display">${Utils.escapeHtml(manager.name)}</span>
                    <input type="text" class="manager-name-edit" value="${Utils.escapeHtml(manager.name)}" style="display: none;">
                </td>
                <td>${date}</td>
                <td class="actions-cell">
                    <button class="edit-manager-btn" data-id="${manager.id}">✏️ Редактировать</button>
                    <button class="save-manager-btn" data-id="${manager.id}" style="display: none;">💾 Сохранить</button>
                    <button class="cancel-manager-btn" data-id="${manager.id}" style="display: none;">❌ Отмена</button>
                    <button class="delete-manager-btn" data-id="${manager.id}">🗑️ Удалить</button>
                </td>
            </tr>
        `;
    }

    attachRowHandlers() {
        // Обработчики для кнопок редактирования
        document.querySelectorAll('.edit-manager-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const row = btn.closest('tr');
                this.enterEditMode(row);
            });
        });

        // Обработчики для кнопок сохранения
        document.querySelectorAll('.save-manager-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const row = btn.closest('tr');
                const id = parseInt(row.dataset.id);
                const oldName = row.dataset.name;
                const newNameInput = row.querySelector('.manager-name-edit');
                const newName = newNameInput.value.trim();
                
                if (newName && newName !== oldName) {
                    await this.updateManager(id, oldName, newName);
                }
                this.exitEditMode(row);
            });
        });

        // Обработчики для кнопок отмены
        document.querySelectorAll('.cancel-manager-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const row = btn.closest('tr');
                this.exitEditMode(row);
            });
        });

        // Обработчики для кнопок удаления
        document.querySelectorAll('.delete-manager-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const row = btn.closest('tr');
                const id = parseInt(row.dataset.id);
                const name = row.dataset.name;
                this.deleteManager(id, name);
            });
        });

        // Обработчики для нажатия Enter в поле редактирования
        document.querySelectorAll('.manager-name-edit').forEach(input => {
            input.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter') {
                    const row = input.closest('tr');
                    const saveBtn = row.querySelector('.save-manager-btn');
                    saveBtn.click();
                }
            });
        });
    }

    enterEditMode(row) {
        const displaySpan = row.querySelector('.manager-name-display');
        const editInput = row.querySelector('.manager-name-edit');
        const editBtn = row.querySelector('.edit-manager-btn');
        const saveBtn = row.querySelector('.save-manager-btn');
        const cancelBtn = row.querySelector('.cancel-manager-btn');
        const deleteBtn = row.querySelector('.delete-manager-btn');

        displaySpan.style.display = 'none';
        editInput.style.display = 'inline-block';
        editBtn.style.display = 'none';
        saveBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'inline-block';
        deleteBtn.style.display = 'none';

        editInput.focus();
        editInput.select();
    }

    exitEditMode(row) {
        const displaySpan = row.querySelector('.manager-name-display');
        const editInput = row.querySelector('.manager-name-edit');
        const editBtn = row.querySelector('.edit-manager-btn');
        const saveBtn = row.querySelector('.save-manager-btn');
        const cancelBtn = row.querySelector('.cancel-manager-btn');
        const deleteBtn = row.querySelector('.delete-manager-btn');

        // Восстанавливаем исходное значение
        editInput.value = row.dataset.name;

        displaySpan.style.display = 'inline-block';
        editInput.style.display = 'none';
        editBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        deleteBtn.style.display = 'inline-block';
    }
}