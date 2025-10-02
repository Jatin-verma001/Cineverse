// Watchlist Management for Movie/Series/Anime Website

class WatchlistManager {
    constructor() {
        this.storageKey = 'cineverse_watchlist';
        this.watchlist = this.loadWatchlist();
        this.observers = [];
    }

    // Load watchlist from localStorage
    loadWatchlist() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading watchlist:', error);
            return [];
        }
    }

    // Save watchlist to localStorage
    saveWatchlist() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.watchlist));
            this.notifyObservers();
        } catch (error) {
            console.error('Error saving watchlist:', error);
        }
    }

    // Add observer for watchlist changes
    addObserver(callback) {
        this.observers.push(callback);
    }

    // Remove observer
    removeObserver(callback) {
        this.observers = this.observers.filter(obs => obs !== callback);
    }

    // Notify all observers of changes
    notifyObservers() {
        this.observers.forEach(callback => {
            try {
                callback(this.watchlist);
            } catch (error) {
                console.error('Error in observer callback:', error);
            }
        });
    }

    // Add item to watchlist
    addToWatchlist(item) {
        if (!item || (!item.id && !item.tmdb_id)) {
            console.error('Invalid item: missing ID');
            return false;
        }

        const itemId = item.id || item.tmdb_id;
        
        // Check if item already exists
        if (this.isInWatchlist(itemId)) {
            console.log('Item already in watchlist');
            return false;
        }

        const watchlistItem = {
            id: itemId,
            tmdb_id: itemId,
            title: item.title || item.name || 'Unknown Title',
            poster_path: item.poster_path || null,
            backdrop_path: item.backdrop_path || null,
            overview: item.overview || '',
            release_date: item.release_date || item.first_air_date || '',
            vote_average: item.vote_average || 0,
            genre_ids: item.genre_ids || [],
            media_type: item.media_type || this.getMediaType(item),
            added_date: new Date().toISOString(),
            original_language: item.original_language || 'en',
            popularity: item.popularity || 0
        };

        this.watchlist.unshift(watchlistItem); // Add to beginning
        this.saveWatchlist();
        
        // Show success notification
        this.showNotification(`Added "${watchlistItem.title}" to watchlist`, 'success');
        
        return true;
    }

    // Remove item from watchlist
    removeFromWatchlist(itemId) {
        const initialLength = this.watchlist.length;
        this.watchlist = this.watchlist.filter(item => 
            item.id !== itemId && item.tmdb_id !== itemId
        );
        
        if (this.watchlist.length < initialLength) {
            this.saveWatchlist();
            
            // Show success notification
            this.showNotification('Removed from watchlist', 'success');
            
            return true;
        }
        
        return false;
    }

    // Check if item is in watchlist
    isInWatchlist(itemId) {
        return this.watchlist.some(item => 
            item.id === itemId || item.tmdb_id === itemId
        );
    }

    // Get watchlist
    getWatchlist() {
        return [...this.watchlist]; // Return a copy
    }

    // Get watchlist count
    getCount() {
        return this.watchlist.length;
    }

    // Clear entire watchlist
    clearWatchlist() {
        this.watchlist = [];
        this.saveWatchlist();
        this.showNotification('Watchlist cleared', 'info');
    }

    // Get watchlist by type
    getWatchlistByType(mediaType) {
        return this.watchlist.filter(item => item.media_type === mediaType);
    }

    // Sort watchlist
    sortWatchlist(sortBy = 'added_date', order = 'desc') {
        this.watchlist.sort((a, b) => {
            let valueA = a[sortBy];
            let valueB = b[sortBy];

            // Handle different data types
            if (sortBy === 'added_date' || sortBy === 'release_date') {
                valueA = new Date(valueA);
                valueB = new Date(valueB);
            } else if (typeof valueA === 'string') {
                valueA = valueA.toLowerCase();
                valueB = valueB.toLowerCase();
            }

            if (order === 'asc') {
                return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
            } else {
                return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
            }
        });

        this.saveWatchlist();
    }

    // Filter watchlist
    filterWatchlist(filters = {}) {
        let filtered = [...this.watchlist];

        // Filter by media type
        if (filters.type && filters.type !== 'all') {
            filtered = filtered.filter(item => item.media_type === filters.type);
        }

        // Filter by genre
        if (filters.genre && filters.genre !== 'all') {
            const genreId = GENRE_MAP[filters.genre];
            if (genreId) {
                filtered = filtered.filter(item => 
                    item.genre_ids && item.genre_ids.includes(genreId)
                );
            }
        }

        // Filter by search query
        if (filters.query) {
            const query = filters.query.toLowerCase();
            filtered = filtered.filter(item =>
                item.title.toLowerCase().includes(query) ||
                (item.overview && item.overview.toLowerCase().includes(query))
            );
        }

        // Filter by rating
        if (filters.minRating) {
            filtered = filtered.filter(item => 
                item.vote_average >= filters.minRating
            );
        }

        return filtered;
    }

    // Get media type from item data
    getMediaType(item) {
        if (item.title || item.release_date) return 'movie';
        if (item.name || item.first_air_date) return 'tv';
        return 'unknown';
    }

    // Export watchlist as JSON
    exportWatchlist() {
        const exportData = {
            exported_at: new Date().toISOString(),
            version: '1.0',
            count: this.watchlist.length,
            watchlist: this.watchlist
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `cineverse_watchlist_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showNotification('Watchlist exported successfully', 'success');
    }

    // Import watchlist from JSON
    async importWatchlist(file) {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            if (!importData.watchlist || !Array.isArray(importData.watchlist)) {
                throw new Error('Invalid watchlist format');
            }

            // Merge with existing watchlist, avoiding duplicates
            const existingIds = new Set(this.watchlist.map(item => item.id || item.tmdb_id));
            const newItems = importData.watchlist.filter(item => 
                !existingIds.has(item.id || item.tmdb_id)
            );

            this.watchlist = [...this.watchlist, ...newItems];
            this.saveWatchlist();
            
            this.showNotification(
                `Imported ${newItems.length} new items to watchlist`, 
                'success'
            );
            
            return true;
        } catch (error) {
            console.error('Error importing watchlist:', error);
            this.showNotification('Error importing watchlist', 'error');
            return false;
        }
    }

    // Get watchlist statistics
    getStatistics() {
        const stats = {
            total: this.watchlist.length,
            movies: 0,
            tv: 0,
            anime: 0,
            averageRating: 0,
            totalRuntime: 0,
            genreBreakdown: {},
            languageBreakdown: {},
            recentlyAdded: 0 // Added in last 7 days
        };

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        let totalRating = 0;
        let ratedItems = 0;

        this.watchlist.forEach(item => {
            // Count by media type
            if (item.media_type === 'movie') {
                stats.movies++;
            } else if (item.media_type === 'tv') {
                stats.tv++;
                // Check if it's anime
                if (this.isAnimeItem(item)) {
                    stats.anime++;
                }
            }

            // Calculate average rating
            if (item.vote_average > 0) {
                totalRating += item.vote_average;
                ratedItems++;
            }

            // Count recently added
            if (new Date(item.added_date) > oneWeekAgo) {
                stats.recentlyAdded++;
            }

            // Language breakdown
            const lang = item.original_language || 'unknown';
            stats.languageBreakdown[lang] = (stats.languageBreakdown[lang] || 0) + 1;
        });

        stats.averageRating = ratedItems > 0 ? (totalRating / ratedItems).toFixed(1) : 0;

        return stats;
    }

    // Check if item is anime
    isAnimeItem(item) {
        const hasAnimationGenre = item.genre_ids && item.genre_ids.includes(16);
        const isJapanese = item.original_language === 'ja';
        return hasAnimationGenre && isJapanese;
    }

    // Show notification
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
            backgroundColor: type === 'error' ? '#e74c3c' : 
                           type === 'success' ? '#27ae60' : '#3498db',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            zIndex: '10000',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '300px',
            wordWrap: 'break-word',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Search within watchlist
    searchWatchlist(query) {
        if (!query.trim()) return this.getWatchlist();
        
        const searchTerm = query.toLowerCase().trim();
        return this.watchlist.filter(item =>
            item.title.toLowerCase().includes(searchTerm) ||
            (item.overview && item.overview.toLowerCase().includes(searchTerm))
        );
    }

    // Get random item from watchlist
    getRandomItem() {
        if (this.watchlist.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * this.watchlist.length);
        return this.watchlist[randomIndex];
    }

    // Backup watchlist to user account (if implemented)
    async backupToCloud() {
        // This would integrate with a backend service
        // For now, just export to downloads
        this.exportWatchlist();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WatchlistManager;
} else {
    window.WatchlistManager = WatchlistManager;
}
