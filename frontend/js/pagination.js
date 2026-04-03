// Модуль пагинации
class Pagination {
    constructor(itemsPerPage = 20) {
        this.currentPage = 1;
        this.itemsPerPage = itemsPerPage;
        this.totalItems = 0;
        this.totalPages = 1;
        this.onPageChangeCallbacks = [];
    }

    setTotalItems(count) {
        this.totalItems = count;
        this.totalPages = this.itemsPerPage === 0 ? 1 : Math.ceil(count / this.itemsPerPage);
        if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
        if (this.currentPage < 1) this.currentPage = 1;
    }

    setItemsPerPage(size) {
        this.itemsPerPage = size;
        this.setTotalItems(this.totalItems);
        this.currentPage = 1;
        this.notifyPageChange();
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        this.currentPage = page;
        this.notifyPageChange();
    }

    getCurrentPageData(data) {
        if (this.itemsPerPage === 0 || this.totalItems === 0) {
            return data;
        }
        
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, this.totalItems);
        
        return data.slice(startIndex, endIndex);
    }

    getPageInfo() {
        const startIndex = this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
        const endIndex = this.itemsPerPage === 0 || this.totalItems === 0 
            ? this.totalItems 
            : Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
        
        return { startIndex, endIndex, totalItems: this.totalItems };
    }

    onPageChange(callback) {
        this.onPageChangeCallbacks.push(callback);
    }

    notifyPageChange() {
        this.onPageChangeCallbacks.forEach(cb => cb(this.currentPage, this.totalPages));
    }

    canGoPrev() {
        return this.currentPage > 1 && this.totalItems > 0;
    }

    canGoNext() {
        return this.currentPage < this.totalPages && this.totalItems > 0;
    }

    renderPageNumbers(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.totalItems === 0 || this.totalPages <= 1) return;
        
        const maxVisiblePages = 7;
        let startPage, endPage;
        
        if (this.totalPages <= maxVisiblePages) {
            startPage = 1;
            endPage = this.totalPages;
        } else {
            const maxPagesBeforeCurrent = Math.floor(maxVisiblePages / 2);
            const maxPagesAfterCurrent = Math.ceil(maxVisiblePages / 2) - 1;
            
            if (this.currentPage <= maxPagesBeforeCurrent) {
                startPage = 1;
                endPage = maxVisiblePages;
            } else if (this.currentPage + maxPagesAfterCurrent >= this.totalPages) {
                startPage = this.totalPages - maxVisiblePages + 1;
                endPage = this.totalPages;
            } else {
                startPage = this.currentPage - maxPagesBeforeCurrent;
                endPage = this.currentPage + maxPagesAfterCurrent;
            }
        }
        
        if (startPage > 1) {
            this.addPageButton(container, 1);
            this.addEllipsis(container);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            this.addPageButton(container, i, i === this.currentPage);
        }
        
        if (endPage < this.totalPages) {
            this.addEllipsis(container);
            this.addPageButton(container, this.totalPages);
        }
    }

    addPageButton(container, page, isActive = false) {
        const btn = document.createElement('button');
        btn.className = `page-btn ${isActive ? 'active' : ''}`;
        btn.textContent = page;
        btn.addEventListener('click', () => this.goToPage(page));
        container.appendChild(btn);
    }

    addEllipsis(container) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'page-btn ellipsis';
        ellipsis.textContent = '...';
        container.appendChild(ellipsis);
    }
}