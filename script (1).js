/**
 * Friends Bucket List Application
 * A static web application for managing shared bucket lists with photo uploads and theme customization
 */

class BucketListApp {
    constructor() {
        this.storageKey = 'friendsBucket_v1';
        this.items = [];
        this.currentFilter = 'all';
        this.currentSort = 'newest';
        this.searchQuery = '';
        this.currentEditId = null;
        this.currentPhotos = [];
        this.maxPhotos = 3;
        this.maxPhotoSize = 800; // Max width/height for resizing
        this.photoQuality = 0.8; // JPEG quality
        
        // Initialize the application
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.loadData();
        this.setupEventListeners();
        this.renderItems();
    }

    /**
     * Load data from localStorage
     */
    loadData() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.items = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading data from localStorage:', error);
            this.items = [];
        }
    }

    /**
     * Save data to localStorage
     */
    saveData() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.items));
        } catch (error) {
            console.error('Error saving data to localStorage:', error);
            this.showNotification('Error saving data. Storage might be full.', 'error');
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Add item button
        document.getElementById('addItemBtn').addEventListener('click', () => {
            this.openModal();
        });

        // Modal controls
        document.getElementById('modalClose').addEventListener('click', () => {
            this.closeModal();
        });
        
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeModal();
        });

        // Modal overlay click to close
        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target.id === 'modalOverlay') {
                this.closeModal();
            }
        });

        // Form submission
        document.getElementById('itemForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveItem();
        });

        // Photo upload
        document.getElementById('photoInput').addEventListener('change', (e) => {
            this.handlePhotoUpload(e.target.files);
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.renderItems();
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Sort selection
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.renderItems();
        });

        // Export functionality
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        // Import functionality
        document.getElementById('importFile').addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
        });

        // Photo modal controls
        document.getElementById('photoModalClose').addEventListener('click', () => {
            this.closePhotoModal();
        });

        document.getElementById('photoPrev').addEventListener('click', () => {
            this.navigatePhoto(-1);
        });

        document.getElementById('photoNext').addEventListener('click', () => {
            this.navigatePhoto(1);
        });

        // Photo modal overlay click to close
        document.getElementById('photoModal').addEventListener('click', (e) => {
            if (e.target.id === 'photoModal') {
                this.closePhotoModal();
            }
        });

        // Keyboard navigation for photo modal
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('photoModal').style.display === 'flex') {
                switch (e.key) {
                    case 'Escape':
                        this.closePhotoModal();
                        break;
                    case 'ArrowLeft':
                        this.navigatePhoto(-1);
                        break;
                    case 'ArrowRight':
                        this.navigatePhoto(1);
                        break;
                }
            }
        });
    }

    /**
     * Open the add/edit modal
     */
    openModal(item = null) {
        this.currentEditId = item ? item.id : null;
        this.currentPhotos = item ? [...item.photos] : [];
        
        // Update modal title
        document.getElementById('modalTitle').textContent = item ? 'Edit Item' : 'Add New Item';
        
        // Populate form fields
        if (item) {
            document.getElementById('itemTitle').value = item.title;
            document.getElementById('itemDescription').value = item.description || '';
            document.getElementById('itemWhoAdded').value = item.whoAdded;
            document.getElementById('itemLocation').value = item.location || '';
        } else {
            document.getElementById('itemForm').reset();
        }
        
        // Update photo preview
        this.updatePhotoPreview();
        
        // Show modal
        document.getElementById('modalOverlay').style.display = 'flex';
        document.getElementById('itemTitle').focus();
    }

    /**
     * Close the modal
     */
    closeModal() {
        document.getElementById('modalOverlay').style.display = 'none';
        this.currentEditId = null;
        this.currentPhotos = [];
        document.getElementById('itemForm').reset();
        document.getElementById('photoInput').value = '';
        this.updatePhotoPreview();
    }

    /**
     * Handle photo upload
     */
    async handlePhotoUpload(files) {
        const fileArray = Array.from(files);
        
        // Check if adding these files would exceed the limit
        if (this.currentPhotos.length + fileArray.length > this.maxPhotos) {
            this.showNotification(`You can only upload up to ${this.maxPhotos} photos per item.`, 'warning');
            return;
        }

        for (const file of fileArray) {
            if (this.currentPhotos.length >= this.maxPhotos) break;
            
            if (!file.type.startsWith('image/')) {
                this.showNotification('Please select only image files.', 'warning');
                continue;
            }

            try {
                const resizedPhoto = await this.resizeImage(file);
                this.currentPhotos.push(resizedPhoto);
            } catch (error) {
                console.error('Error processing image:', error);
                this.showNotification('Error processing image. Please try again.', 'error');
            }
        }

        this.updatePhotoPreview();
        document.getElementById('photoInput').value = ''; // Reset input
    }

    /**
     * Resize image to optimize storage
     */
    resizeImage(file) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // Calculate new dimensions
                let { width, height } = img;
                
                if (width > this.maxPhotoSize || height > this.maxPhotoSize) {
                    const ratio = Math.min(this.maxPhotoSize / width, this.maxPhotoSize / height);
                    width *= ratio;
                    height *= ratio;
                }

                // Set canvas dimensions
                canvas.width = width;
                canvas.height = height;

                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to base64
                const base64 = canvas.toDataURL('image/jpeg', this.photoQuality);
                resolve(base64);
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Update photo preview in modal
     */
    updatePhotoPreview() {
        const preview = document.getElementById('photoPreview');
        preview.innerHTML = '';

        this.currentPhotos.forEach((photo, index) => {
            const item = document.createElement('div');
            item.className = 'photo-preview-item';
            
            item.innerHTML = `
                <img src="${photo}" alt="Preview ${index + 1}" class="photo-preview-img">
                <button type="button" class="photo-remove-btn" data-index="${index}">&times;</button>
            `;

            // Add remove functionality
            item.querySelector('.photo-remove-btn').addEventListener('click', () => {
                this.removePhoto(index);
            });

            preview.appendChild(item);
        });
    }

    /**
     * Remove photo from current photos
     */
    removePhoto(index) {
        this.currentPhotos.splice(index, 1);
        this.updatePhotoPreview();
    }

    /**
     * Save item (add or edit)
     */
    saveItem() {
        const title = document.getElementById('itemTitle').value.trim();
        const description = document.getElementById('itemDescription').value.trim();
        const whoAdded = document.getElementById('itemWhoAdded').value.trim();
        const location = document.getElementById('itemLocation').value.trim();

        if (!title || !whoAdded) {
            this.showNotification('Title and "Who Added" are required fields.', 'warning');
            return;
        }

        const itemData = {
            title,
            description,
            whoAdded,
            location,
            photos: [...this.currentPhotos],
            completed: false,
            createdAt: new Date().toISOString()
        };

        if (this.currentEditId) {
            // Edit existing item
            const index = this.items.findIndex(item => item.id === this.currentEditId);
            if (index !== -1) {
                this.items[index] = { ...this.items[index], ...itemData };
                this.showNotification('Item updated successfully!', 'success');
            }
        } else {
            // Add new item
            itemData.id = this.generateId();
            this.items.push(itemData);
            this.showNotification('Item added successfully!', 'success');
        }

        this.saveData();
        this.renderItems();
        this.closeModal();
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Delete item
     */
    deleteItem(id) {
        if (confirm('Are you sure you want to delete this item?')) {
            this.items = this.items.filter(item => item.id !== id);
            this.saveData();
            this.renderItems();
            this.showNotification('Item deleted successfully!', 'success');
        }
    }

    /**
     * Toggle item completion status
     */
    toggleComplete(id) {
        const item = this.items.find(item => item.id === id);
        if (item) {
            item.completed = !item.completed;
            item.completedAt = item.completed ? new Date().toISOString() : null;
            this.saveData();
            this.renderItems();
            
            const status = item.completed ? 'completed' : 'marked as active';
            this.showNotification(`Item ${status}!`, 'success');
        }
    }

    /**
     * Set current filter
     */
    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        this.renderItems();
    }

    /**
     * Filter items based on current criteria
     */
    getFilteredItems() {
        let filtered = [...this.items];

        // Apply completion filter
        if (this.currentFilter === 'completed') {
            filtered = filtered.filter(item => item.completed);
        }

        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(item => 
                item.title.toLowerCase().includes(this.searchQuery) ||
                (item.description && item.description.toLowerCase().includes(this.searchQuery)) ||
                item.whoAdded.toLowerCase().includes(this.searchQuery) ||
                (item.location && item.location.toLowerCase().includes(this.searchQuery))
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (this.currentSort) {
                case 'oldest':
                    return new Date(a.createdAt) - new Date(b.createdAt);
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'title-desc':
                    return b.title.localeCompare(a.title);
                case 'newest':
                default:
                    return new Date(b.createdAt) - new Date(a.createdAt);
            }
        });

        return filtered;
    }

    /**
     * Render all items
     */
    renderItems() {
        const container = document.getElementById('itemsContainer');
        const emptyState = document.getElementById('emptyState');
        const filtered = this.getFilteredItems();

        if (filtered.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        
        container.innerHTML = filtered.map(item => this.renderItem(item)).join('');

        // Add event listeners to action buttons
        container.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const id = e.target.dataset.id;
                
                switch (action) {
                    case 'complete':
                        this.toggleComplete(id);
                        break;
                    case 'edit':
                        const item = this.items.find(item => item.id === id);
                        this.openModal(item);
                        break;
                    case 'delete':
                        this.deleteItem(id);
                        break;
                }
            });
        });

        // Add event listeners to photo thumbnails
        container.querySelectorAll('.photo-thumbnail').forEach(thumb => {
            thumb.addEventListener('click', (e) => {
                const itemId = e.target.dataset.itemId;
                const photoIndex = parseInt(e.target.dataset.photoIndex);
                this.openPhotoModal(itemId, photoIndex);
            });
        });
    }

    /**
     * Render single item
     */
    renderItem(item) {
        const formatDate = (dateString) => {
            if (!dateString) return '';
            return new Date(dateString).toLocaleDateString();
        };

        const photosHtml = item.photos && item.photos.length > 0 
            ? `<div class="item-photos">
                ${item.photos.map((photo, index) => 
                    `<img src="${photo}" alt="Photo ${index + 1}" class="photo-thumbnail" 
                          data-item-id="${item.id}" data-photo-index="${index}">`
                ).join('')}
               </div>`
            : '';

        return `
            <div class="item-card ${item.completed ? 'completed' : ''}" data-id="${item.id}">
                <div class="item-header">
                    <h3 class="item-title">${this.escapeHtml(item.title)}</h3>
                    <div class="item-actions">
                        <button class="action-btn complete-btn" data-action="complete" data-id="${item.id}" 
                                title="${item.completed ? 'Mark as active' : 'Mark as completed'}">
                            ${item.completed ? '↶' : '✓'}
                        </button>
                        <button class="action-btn edit-btn" data-action="edit" data-id="${item.id}" title="Edit">
                            ✎
                        </button>
                        <button class="action-btn delete-btn" data-action="delete" data-id="${item.id}" title="Delete">
                            🗑
                        </button>
                    </div>
                </div>
                
                ${item.description ? `<p class="item-description">${this.escapeHtml(item.description)}</p>` : ''}
                
                <div class="item-meta">
                    <div class="meta-item">
                        <span class="meta-label">Added by</span>
                        <span class="meta-value">${this.escapeHtml(item.whoAdded)}</span>
                    </div>
                    ${item.location ? `
                        <div class="meta-item">
                            <span class="meta-label">Location</span>
                            <span class="meta-value">${this.escapeHtml(item.location)}</span>
                        </div>
                    ` : ''}
                    <div class="meta-item">
                        <span class="meta-label">Created</span>
                        <span class="meta-value">${formatDate(item.createdAt)}</span>
                    </div>
                </div>
                
                ${photosHtml}
            </div>
        `;
    }

    /**
     * Open photo modal
     */
    openPhotoModal(itemId, photoIndex = 0) {
        const item = this.items.find(item => item.id === itemId);
        if (!item || !item.photos || item.photos.length === 0) return;

        this.currentPhotoModal = {
            itemId,
            photoIndex,
            photos: item.photos
        };

        this.updatePhotoModal();
        document.getElementById('photoModal').style.display = 'flex';
    }

    /**
     * Close photo modal
     */
    closePhotoModal() {
        document.getElementById('photoModal').style.display = 'none';
        this.currentPhotoModal = null;
    }

    /**
     * Navigate photos in modal
     */
    navigatePhoto(direction) {
        if (!this.currentPhotoModal) return;

        const newIndex = this.currentPhotoModal.photoIndex + direction;
        const maxIndex = this.currentPhotoModal.photos.length - 1;

        if (newIndex < 0 || newIndex > maxIndex) return;

        this.currentPhotoModal.photoIndex = newIndex;
        this.updatePhotoModal();
    }

    /**
     * Update photo modal content
     */
    updatePhotoModal() {
        if (!this.currentPhotoModal) return;

        const { photos, photoIndex } = this.currentPhotoModal;
        
        document.getElementById('photoModalImage').src = photos[photoIndex];
        document.getElementById('photoCounter').textContent = `${photoIndex + 1} / ${photos.length}`;
        
        // Update navigation buttons
        document.getElementById('photoPrev').disabled = photoIndex === 0;
        document.getElementById('photoNext').disabled = photoIndex === photos.length - 1;
    }

    /**
     * Export data as JSON
     */
    exportData() {
        try {
            const data = {
                items: this.items,
                exportDate: new Date().toISOString(),
                version: '1.0'
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `bucket-list-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showNotification('Data exported successfully!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Error exporting data.', 'error');
        }
    }

    /**
     * Import data from JSON file
     */
    importData(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (!data.items || !Array.isArray(data.items)) {
                    throw new Error('Invalid file format');
                }

                if (confirm('This will replace all existing data. Are you sure?')) {
                    this.items = data.items.map(item => ({
                        ...item,
                        id: item.id || this.generateId() // Ensure all items have IDs
                    }));
                    
                    this.saveData();
                    this.renderItems();
                    this.showNotification('Data imported successfully!', 'success');
                }
            } catch (error) {
                console.error('Import error:', error);
                this.showNotification('Error importing data. Please check the file format.', 'error');
            }
        };

        reader.readAsText(file);
        // Reset file input
        document.getElementById('importFile').value = '';
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '600',
            zIndex: '10000',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            transform: 'translateX(400px)',
            transition: 'transform 0.3s ease',
            maxWidth: '300px'
        });

        // Set background color based on type
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        // Add to page
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after delay
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 4000);
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BucketListApp();
});
