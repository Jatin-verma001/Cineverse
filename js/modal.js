// Modal System for Movie/Series/Anime Website

class ModalManager {
    constructor() {
        this.modal = null;
        this.modalContent = null;
        this.closeBtn = null;
        this.isOpen = false;
        this.currentItem = null;
        this.api = null;
        this.watchlistManager = null;
        
        this.init();
    }

    // Initialize modal system
    init() {
        this.createModal();
        this.bindEvents();
    }

    // Create modal HTML structure
    createModal() {
        // Check if modal already exists
        if (document.getElementById('detailModal')) {
            this.modal = document.getElementById('detailModal');
            this.modalContent = document.getElementById('modalBody');
            this.closeBtn = document.getElementById('closeModal');
            return;
        }

        // Create modal element
        this.modal = document.createElement('div');
        this.modal.id = 'detailModal';
        this.modal.className = 'modal';
        
        this.modal.innerHTML = `
            <div class="modal-content">
                <span class="close-btn" id="closeModal">&times;</span>
                <div class="modal-body" id="modalBody">
                    <!-- Modal content will be dynamically generated -->
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
        
        this.modalContent = document.getElementById('modalBody');
        this.closeBtn = document.getElementById('closeModal');
    }

    // Bind event listeners
    bindEvents() {
        // Close button
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.close());
        }

        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    // Set API and watchlist manager references
    setDependencies(api, watchlistManager) {
        this.api = api;
        this.watchlistManager = watchlistManager;
    }

    // Open modal with content details
    async open(item) {
        if (!item || !item.id) {
            console.error('Invalid item provided to modal');
            return;
        }

        this.currentItem = item;
        this.showLoading();
        this.modal.classList.add('active');
        this.isOpen = true;
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        try {
            let detailData;
            const mediaType = this.getMediaType(item);
            
            if (this.api) {
                // Fetch detailed information
                if (mediaType === 'movie') {
                    detailData = await this.api.getMovieDetails(item.id);
                } else if (mediaType === 'tv') {
                    detailData = await this.api.getTVDetails(item.id);
                } else {
                    detailData = item; // Use provided data if API not available
                }
            } else {
                detailData = item;
            }

            this.renderContent(detailData);
        } catch (error) {
            console.error('Error loading modal content:', error);
            this.renderError();
        }
    }

    // Close modal
    close() {
        this.modal.classList.remove('active');
        this.isOpen = false;
        this.currentItem = null;
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Clear content after animation
        setTimeout(() => {
            if (this.modalContent) {
                this.modalContent.innerHTML = '';
            }
        }, 300);
    }

    // Show loading state
    showLoading() {
        this.modalContent.innerHTML = `
            <div class="modal-loading">
                <div class="spinner"></div>
                <p>Loading details...</p>
            </div>
        `;
    }

    // Render error state
    renderError() {
        this.modalContent.innerHTML = `
            <div class="modal-error">
                <h2>Error Loading Content</h2>
                <p>Sorry, we couldn't load the details for this item. Please try again later.</p>
                <button class="modal-btn" onclick="this.closest('.modal').querySelector('.close-btn').click()">
                    Close
                </button>
            </div>
        `;
    }

    // Render modal content
    renderContent(item) {
        const mediaType = this.getMediaType(item);
        const isInWatchlist = this.watchlistManager ? 
            this.watchlistManager.isInWatchlist(item.id) : false;

        const title = item.title || item.name || 'Unknown Title';
        const releaseDate = item.release_date || item.first_air_date || '';
        const overview = item.overview || 'No description available.';
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        const voteCount = item.vote_count || 0;
        
        // Get poster and backdrop URLs
        const posterURL = this.api ? 
            this.api.getPosterURL(item.poster_path) : 
            (item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '/assets/images/no-poster.jpg');
        
        const backdropURL = this.api ? 
            this.api.getBackdropURL(item.backdrop_path) : 
            (item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : posterURL);

        // Get trailer URL
        const trailerURL = this.api && item.videos ? 
            this.api.getTrailerURL(item.videos) : null;

        // Format runtime
        let runtime = '';
        if (mediaType === 'movie' && item.runtime) {
            runtime = this.api ? 
                this.api.formatRuntime(item.runtime) : 
                `${Math.floor(item.runtime / 60)}h ${item.runtime % 60}m`;
        } else if (mediaType === 'tv' && item.episode_run_time && item.episode_run_time.length > 0) {
            runtime = `${item.episode_run_time[0]}m per episode`;
        }

        // Format date
        const formattedDate = this.api ? 
            this.api.formatDate(releaseDate) : 
            (releaseDate ? new Date(releaseDate).getFullYear() : 'Unknown');

        // Get genres
        const genres = item.genres ? 
            item.genres.map(g => g.name).join(', ') : 
            'Unknown';

        // Get cast (first 5 members)
        const cast = item.credits && item.credits.cast ? 
            item.credits.cast.slice(0, 5).map(actor => actor.name).join(', ') : 
            'Cast information not available';

        // Get director/creator
        let director = 'Unknown';
        if (item.credits && item.credits.crew) {
            const directorInfo = item.credits.crew.find(person => 
                person.job === 'Director' || person.job === 'Creator'
            );
            if (directorInfo) {
                director = directorInfo.name;
            }
        }

        this.modalContent.innerHTML = `
            <div class="modal-header">
                <img src="${backdropURL}" alt="${title}" onerror="this.src='${posterURL}'">
                <div class="modal-header-overlay">
                    <h1 class="modal-title">${title}</h1>
                    <div class="modal-meta">
                        <div class="modal-rating">
                            <span>⭐</span>
                            <span>${rating}</span>
                            <span>(${voteCount.toLocaleString()} votes)</span>
                        </div>
                        <span class="modal-year">${formattedDate}</span>
                        ${runtime ? `<span class="modal-runtime">${runtime}</span>` : ''}
                        <span class="modal-type">${mediaType.toUpperCase()}</span>
                    </div>
                </div>
            </div>
            
            <div class="modal-body-content">
                <div class="modal-poster-section">
                    <img src="${posterURL}" alt="${title}" class="modal-poster">
                </div>
                
                <div class="modal-info-section">
                    <div class="modal-description">
                        <h3>Overview</h3>
                        <p>${overview}</p>
                    </div>
                    
                    <div class="modal-details">
                        <div class="detail-item">
                            <div class="detail-label">Genres</div>
                            <div class="detail-value">${genres}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">${mediaType === 'movie' ? 'Director' : 'Creator'}</div>
                            <div class="detail-value">${director}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Cast</div>
                            <div class="detail-value">${cast}</div>
                        </div>
                        ${item.original_language ? `
                        <div class="detail-item">
                            <div class="detail-label">Language</div>
                            <div class="detail-value">${item.original_language.toUpperCase()}</div>
                        </div>
                        ` : ''}
                        ${mediaType === 'tv' && item.number_of_seasons ? `
                        <div class="detail-item">
                            <div class="detail-label">Seasons</div>
                            <div class="detail-value">${item.number_of_seasons}</div>
                        </div>
                        ` : ''}
                        ${mediaType === 'tv' && item.number_of_episodes ? `
                        <div class="detail-item">
                            <div class="detail-label">Episodes</div>
                            <div class="detail-value">${item.number_of_episodes}</div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="modal-actions">
                        ${trailerURL ? `
                        <a href="${trailerURL}" target="_blank" class="modal-btn">
                            ▶️ Watch Trailer
                        </a>
                        ` : ''}
                        
                        <button class="modal-btn ${isInWatchlist ? 'secondary' : ''}" 
                                onclick="window.modalManager.toggleWatchlist()">
                            ${isInWatchlist ? '➖ Remove from Watchlist' : '➕ Add to Watchlist'}
                        </button>
                        
                        <button class="modal-btn secondary" onclick="window.modalManager.close()">
                            Close
                        </button>
                    </div>
                </div>
            </div>
            
            ${this.renderRecommendations(item)}
        `;

        // Add CSS for modal content layout
        this.addModalStyles();
    }

    // Render recommendations section
    renderRecommendations(item) {
        if (!item.recommendations || !item.recommendations.results || item.recommendations.results.length === 0) {
            return '';
        }

        const recommendations = item.recommendations.results.slice(0, 6);
        
        return `
            <div class="modal-recommendations">
                <h3>You Might Also Like</h3>
                <div class="recommendations-grid">
                    ${recommendations.map(rec => {
                        const posterURL = this.api ? 
                            this.api.getPosterURL(rec.poster_path) : 
                            (rec.poster_path ? `https://image.tmdb.org/t/p/w300${rec.poster_path}` : '/assets/images/no-poster.jpg');
                        
                        const title = rec.title || rec.name || 'Unknown';
                        const rating = rec.vote_average ? rec.vote_average.toFixed(1) : 'N/A';
                        
                        return `
                            <div class="recommendation-card" onclick="window.modalManager.openRecommendation(${rec.id}, '${this.getMediaType(rec)}')">
                                <img src="${posterURL}" alt="${title}" loading="lazy">
                                <div class="recommendation-info">
                                    <h4>${title}</h4>
                                    <div class="recommendation-rating">⭐ ${rating}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // Open recommendation in new modal
    async openRecommendation(id, mediaType) {
        const item = { id, media_type: mediaType };
        await this.open(item);
    }

    // Toggle watchlist status
    toggleWatchlist() {
        if (!this.watchlistManager || !this.currentItem) return;

        const isInWatchlist = this.watchlistManager.isInWatchlist(this.currentItem.id);
        
        if (isInWatchlist) {
            this.watchlistManager.removeFromWatchlist(this.currentItem.id);
        } else {
            this.watchlistManager.addToWatchlist(this.currentItem);
        }

        // Re-render content to update button
        setTimeout(() => {
            if (this.isOpen && this.currentItem) {
                this.renderContent(this.currentItem);
            }
        }, 100);
    }

    // Get media type from item
    getMediaType(item) {
        if (item.media_type) return item.media_type;
        if (item.title || item.release_date) return 'movie';
        if (item.name || item.first_air_date) return 'tv';
        return 'unknown';
    }

    // Add CSS styles for modal content
    addModalStyles() {
        if (document.getElementById('modal-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'modal-styles';
        styles.textContent = `
            .modal-body-content {
                display: flex;
                gap: 2rem;
                margin-bottom: 2rem;
            }
            
            .modal-poster-section {
                flex-shrink: 0;
            }
            
            .modal-poster {
                width: 200px;
                height: auto;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }
            
            .modal-info-section {
                flex: 1;
            }
            
            .modal-description h3 {
                margin-bottom: 1rem;
                color: var(--text-primary);
            }
            
            .modal-description p {
                line-height: 1.6;
                color: var(--text-secondary);
                margin-bottom: 2rem;
            }
            
            .modal-recommendations {
                border-top: 1px solid rgba(255,255,255,0.1);
                padding-top: 2rem;
                margin-top: 2rem;
            }
            
            .modal-recommendations h3 {
                margin-bottom: 1rem;
                color: var(--text-primary);
            }
            
            .recommendations-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 1rem;
            }
            
            .recommendation-card {
                cursor: pointer;
                transition: transform 0.3s ease;
                border-radius: 8px;
                overflow: hidden;
                background: var(--card-background);
            }
            
            .recommendation-card:hover {
                transform: translateY(-5px);
            }
            
            .recommendation-card img {
                width: 100%;
                height: 200px;
                object-fit: cover;
            }
            
            .recommendation-info {
                padding: 1rem;
            }
            
            .recommendation-info h4 {
                margin-bottom: 0.5rem;
                font-size: 0.9rem;
                color: var(--text-primary);
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            
            .recommendation-rating {
                font-size: 0.8rem;
                color: #ffd700;
            }
            
            .modal-loading {
                text-align: center;
                padding: 4rem;
            }
            
            .modal-loading .spinner {
                margin: 0 auto 1rem;
            }
            
            .modal-error {
                text-align: center;
                padding: 4rem;
            }
            
            .modal-error h2 {
                margin-bottom: 1rem;
                color: var(--accent-color);
            }
            
            .modal-error p {
                margin-bottom: 2rem;
                color: var(--text-secondary);
            }
            
            @media (max-width: 768px) {
                .modal-body-content {
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .modal-poster {
                    width: 150px;
                    margin: 0 auto;
                    display: block;
                }
                
                .recommendations-grid {
                    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                }
                
                .recommendation-card img {
                    height: 160px;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalManager;
} else {
    window.ModalManager = ModalManager;
}
