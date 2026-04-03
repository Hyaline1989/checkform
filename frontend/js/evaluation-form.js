// Модуль формы оценки
class EvaluationForm {
    constructor(apiClient, onSaveCallback) {
        this.api = apiClient;
        this.onSaveCallback = onSaveCallback;
        this.init();
    }

    init() {
        this.setupOkCheckboxes();
        this.setupDurationInput();
        this.setupScoreListeners();
        this.setupFormSubmit();
    }

    setupOkCheckboxes() {
        const criteria = ['contact', 'presentation', 'objections', 'closing', 'tov'];
        
        criteria.forEach(criterion => {
            const okCheckbox = document.getElementById(`${criterion}Ok`);
            if (!okCheckbox) return;
            
            const errorCheckboxes = document.querySelectorAll(`input[id^="${criterion}Error"]`);
            
            okCheckbox.addEventListener('change', (e) => {
                errorCheckboxes.forEach(cb => {
                    cb.checked = false;
                    cb.disabled = e.target.checked;
                });
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

    setupDurationInput() {
        const durationInput = document.getElementById('callDuration');
        if (durationInput) {
            durationInput.addEventListener('input', (e) => {
                e.target.value = Utils.formatDuration(e.target.value);
            });
        }
    }

    setupScoreListeners() {
        document.querySelectorAll('.criterion input[type="number"]').forEach(input => {
            input.addEventListener('input', () => Utils.updateTotalScore());
        });
    }

    setupFormSubmit() {
        const form = document.getElementById('evaluationForm');
        if (form) {
            form.addEventListener('submit', (e) => this.save(e));
        }
    }

    async save(e) {
        e.preventDefault();
        
        if (!this.onSaveCallback) return;

        this.clearValidationErrors();

        if (this.validateForm()) return;

        try {
            const evaluationData = this.collectFormData();
            await this.api.createEvaluation(evaluationData);
            
            Utils.showMessage('✅ Оценка успешно сохранена!', 'success');
            
            this.resetForm();
            
            if (this.onSaveCallback) {
                await this.onSaveCallback();
            }
            
        } catch (error) {
            console.error('Ошибка при сохранении:', error);
            Utils.showMessage(`❌ Ошибка при сохранении: ${error.message}`, 'error');
        }
    }

    collectFormData() {
        return {
            evaluation_date: document.getElementById('evaluationDate').value,
            manager_name: document.getElementById('managerName').value,
            phone_number: document.getElementById('phoneNumber').value || null,
            lead_link: document.getElementById('leadLink').value || null,
            call_date: document.getElementById('callDate').value,
            call_duration: document.getElementById('callDuration').value,
            is_target: document.getElementById('isTarget').value,
            later_work: document.getElementById('laterWork').value,
            is_good_call: document.getElementById('isGoodCall').value,
            
            contact_score: parseInt(document.getElementById('contactScore').value),
            contact_errors: this.getErrorsString('contact'),
            contact_comment: document.getElementById('contactComment').value || null,

            presentation_score: parseInt(document.getElementById('presentationScore').value),
            presentation_errors: this.getErrorsString('presentation'),
            presentation_comment: document.getElementById('presentationComment').value || null,

            objections_score: parseInt(document.getElementById('objectionsScore').value),
            objections_errors: this.getErrorsString('objections'),
            objections_comment: document.getElementById('objectionsComment').value || null,

            closing_score: parseInt(document.getElementById('closingScore').value),
            closing_errors: this.getErrorsString('closing'),
            closing_comment: document.getElementById('closingComment').value || null,

            tov_score: parseInt(document.getElementById('tovScore').value),
            tov_errors: this.getErrorsString('tov'),
            tov_comment: document.getElementById('tovComment').value || null,

            critical_error: document.getElementById('criticalError').value || null,
            overall_comment: document.getElementById('overallComment').value || null,
            total_score: parseInt(document.getElementById('totalScoreDisplay').textContent)
        };
    }

    getErrorsString(prefix) {
        const errors = Utils.getSelectedErrors(prefix);
        return errors.length > 0 ? errors.join('; ') : null;
    }

    resetForm() {
        document.getElementById('evaluationForm').reset();
        Utils.setDefaultDates();
        Utils.updateTotalScore();
        Utils.clearAllErrorCheckboxes();
        this.clearValidationErrors();
    }

    validateForm() {
        let hasError = false;
        let firstErrorElement = null;

        const requiredFields = [
            { id: 'evaluationDate', name: 'Дата проверки' },
            { id: 'managerName', name: 'ФИО МП' },
            { id: 'callDate', name: 'Дата звонка' },
            { id: 'callDuration', name: 'Длительность звонка' },
            { id: 'isTarget', name: 'Целевой' },
            { id: 'laterWork', name: 'Искал работу на более позднее время' },
            { id: 'isGoodCall', name: 'Хороший звонок' }
        ];

        for (const field of requiredFields) {
            const element = document.getElementById(field.id);
            if (!element || !element.value.trim()) {
                this.showValidationError(element, `❌ Заполните поле: ${field.name}`);
                hasError = true;
                if (!firstErrorElement) firstErrorElement = element;
            }
        }

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

        const scores = this.validateScores();
        if (scores.hasError) {
            hasError = true;
            if (!firstErrorElement) firstErrorElement = scores.firstErrorElement;
        }

        if (hasError && firstErrorElement) {
            Utils.scrollToElement(firstErrorElement);
        }

        return hasError;
    }

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
                const criterionElement = okCheckbox ? okCheckbox.closest('.criterion') : null;
                missingCriteria.push({ name: criterion.name, element: criterionElement });
            }
        }
        
        return missingCriteria;
    }

    validateScores() {
        const scores = [
            { id: 'contactScore', value: parseInt(document.getElementById('contactScore')?.value), min: 0, max: 30, name: 'контакт' },
            { id: 'presentationScore', value: parseInt(document.getElementById('presentationScore')?.value), min: 0, max: 30, name: 'презентацию' },
            { id: 'objectionsScore', value: parseInt(document.getElementById('objectionsScore')?.value), min: 0, max: 30, name: 'возражения' },
            { id: 'closingScore', value: parseInt(document.getElementById('closingScore')?.value), min: 0, max: 10, name: 'завершение' }
        ];

        for (const score of scores) {
            if (isNaN(score.value) || score.value < score.min || score.value > score.max) {
                const element = document.getElementById(score.id);
                this.showValidationError(element, `❌ Баллы за ${score.name} должны быть от ${score.min} до ${score.max}`);
                return { hasError: true, firstErrorElement: element };
            }
        }

        return { hasError: false, firstErrorElement: null };
    }

    showValidationError(element, message) {
        if (!element) return;
        
        element.classList.add('validation-error');
        
        let targetElement = element;
        if (element.classList.contains('criterion')) {
            const header = element.querySelector('h3');
            if (header) targetElement = header;
        }
        
        const existingError = targetElement.nextElementSibling?.classList.contains('error-message') 
            ? targetElement.nextElementSibling : null;
        if (existingError) existingError.remove();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        Object.assign(errorDiv.style, {
            color: '#dc3545',
            fontSize: '14px',
            marginTop: '5px',
            padding: '5px 10px',
            backgroundColor: '#f8d7da',
            borderRadius: '4px',
            border: '1px solid #f5c6cb'
        });
        errorDiv.textContent = message;
        
        if (targetElement.nextSibling) {
            targetElement.parentNode.insertBefore(errorDiv, targetElement.nextSibling);
        } else {
            targetElement.parentNode.appendChild(errorDiv);
        }
    }

    clearValidationErrors() {
        document.querySelectorAll('.validation-error').forEach(element => {
            element.classList.remove('validation-error');
        });
        document.querySelectorAll('.error-message').forEach(element => {
            element.remove();
        });
    }
}