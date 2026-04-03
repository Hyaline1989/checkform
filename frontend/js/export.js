// Модуль экспорта
class ExportModule {
    constructor(apiClient, getDataCallback) {
        this.api = apiClient;
        this.getDataCallback = getDataCallback;
        this.init();
    }

    init() {
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportToExcel());
        }
    }

    async exportToExcel() {
        const data = this.getDataCallback ? await this.getDataCallback() : [];
        
        if (!data || data.length === 0) {
            Utils.showMessage('❌ Нет данных для экспорта', 'error');
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

        const excelData = data.map(item => [
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
            Utils.formatDate(item.created_at)
        ]);

        try {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([headers, ...excelData]);
            
            ws['!cols'] = Array(headers.length).fill({ wch: 20 });
            ws['!autofilter'] = { ref: "A1:AA1" };
            
            XLSX.utils.book_append_sheet(wb, ws, 'Оценки звонков');
            
            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `Оценки_звонков_${dateStr}.xlsx`);
            
            Utils.showMessage('✅ Отчет успешно выгружен в формате Excel', 'success');
            
        } catch (error) {
            console.error('Ошибка при экспорте:', error);
            Utils.showMessage('❌ Ошибка при экспорте в Excel', 'error');
        }
    }
}