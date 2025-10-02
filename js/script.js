// Main JavaScript for Movie/Series/Anime Website

class CineVerseApp {
    constructor() {
        this.api = new MovieAPI();
        this.watchlistManager = new WatchlistManager();
        this.modalManager = new ModalManager();
        this.currentContent = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.currentFilters = {
            genre: '',
            sort: 'popularity',
            type: '',
            query: ''
        };
        this.isLoading = false;
        
        this.init();
    }

    // Initialize the application
    async init() {
        this.checkAuthStatus();
        this.bindEvents();
        this.setupModalDependencies();
        await this.loadInitialContent();
        this.updateWatchlistUI();
    }

    // Check if user is logged in
    checkAuthStatus() {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (!isLoggedIn) {
            // Redirect to login page
            window.location.href = 'login.html';
            return;
        }

        // Update user UI
        const userEmail = localStorage.getItem('userEmail');
        const userName = localStorage.getItem('userName');
        
        if (userName || userEmail) {
            this.updateUserUI(userName || userEmail);
        }
    }

    // Update user interface elements
    updateUserUI(displayName) {
        const userBtn = document.getElementById('userBtn');
        if (userBtn) {
            userBtn.innerHTML = `👤 ${displayName.split('@')[0]}`;
            userBtn.addEventListener('click', () => this.showUserMenu());
        }
    }

    // Show user menu
    showUserMenu() {
        const existingMenu = document.querySelector('.user-menu');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        const userBtn = document.getElementById('userBtn');
        const menu = document.createElement('div');
        menu.className = 'user-menu';
        menu.innerHTML = `
            <div class="user-menu-item" onclick="app.showWatchlistStats()">
                📊 Watchlist Stats
            </div>
            <div class="user-menu-item" onclick="app.exportWatchlist()">
                📥 Export Watchlist
            </div>
            <div class="user-menu-item" onclick="app.importWatchlist()">
                📤 Import Watchlist
            </div>
            <div class="user-menu-item" onclick="app.logout()">
                🚪 Logout
            </div>
        `;

        // Position menu
        const rect = userBtn.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = (rect.bottom + 10) + 'px';
        menu.style.right = '20px';
        menu.style.background = 'var(--card-background)';
        menu.style.border = '1px solid rgba(255,255,255,0.1)';
        menu.style.borderRadius = '8px';
        menu.style.padding = '0.5rem';
        menu.style.zIndex = '1001';
        menu.style.minWidth = '150px';

        document.body.appendChild(menu);

        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target) && e.target !== userBtn) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 100);
    }

    // Setup modal dependencies
    setupModalDependencies() {
        this.modalManager.setDependencies(this.api, this.watchlistManager);
        window.modalManager = this.modalManager; // Make globally accessible
    }

    // Bind event listeners
    bindEvents() {
        // Search functionality
        const searchBtn = document.getElementById('searchBtn');
        const searchContainer = document.getElementById('searchContainer');
        const searchInput = document.getElementById('searchInput');
        const closeSearch = document.getElementById('closeSearch');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                searchContainer.classList.add('active');
                searchInput.focus();
            });
        }

        if (closeSearch) {
            closeSearch.addEventListener('click', () => {
                searchContainer.classList.remove('active');
                searchInput.value = '';
            });
        }

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(searchInput.value);
                    searchContainer.classList.remove('active');
                }
            });
        }

        // Mobile menu toggle
        const hamburger = document.getElementById('hamburger');
        const navMenu = document.querySelector('.nav-menu');

        if (hamburger) {
            hamburger.addEventListener('click', () => {
                hamburger.classList.toggle('active');
                navMenu.classList.toggle('active');
            });
        }

        // Filter events
        this.bindFilterEvents();
        
        // Pagination events
        this.bindPaginationEvents();

        // Explore button
        const exploreBtn = document.getElementById('exploreBtn');
        if (exploreBtn) {
            exploreBtn.addEventListener('click', () => {
                document.querySelector('.content-grid').scrollIntoView({ 
                    behavior: 'smooth' 
                });
            });
        }

        // Navigation links
        this.bindNavigationEvents();
    }

    // Bind filter events
    bindFilterEvents() {
        const genreFilter = document.getElementById('genreFilter');
        const sortFilter = document.getElementById('sortFilter');
        const typeFilter = document.getElementById('typeFilter');

        if (genreFilter) {
            genreFilter.addEventListener('change', (e) => {
                this.currentFilters.genre = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
            });
        }

        if (sortFilter) {
            sortFilter.addEventListener('change', (e) => {
                this.currentFilters.sort = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
            });
        }

        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.currentFilters.type = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
            });
        }
    }

    // Bind pagination events
    bindPaginationEvents() {
        const prevPage = document.getElementById('prevPage');
        const nextPage = document.getElementById('nextPage');

        if (prevPage) {
            prevPage.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.applyFilters();
                }
            });
        }

        if (nextPage) {
            nextPage.addEventListener('click', () => {
                if (this.currentPage < this.totalPages) {
                    this.currentPage++;
                    this.applyFilters();
                }
            });
        }
    }

    // Bind navigation events
    bindNavigationEvents() {
        const navLinks = document.querySelectorAll('.nav-list a');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                
                if (href === '#watchlist') {
                    this.showWatchlist();
                } else if (href === '#movies') {
                    this.currentFilters.type = 'movie';
                    this.currentPage = 1;
                    this.applyFilters();
                } else if (href === '#series') {
                    this.currentFilters.type = 'tv';
                    this.currentPage = 1;
                    this.applyFilters();
                } else if (href === '#anime') {
                    this.loadAnimeContent();
                } else if (href === '#home') {
                    this.loadInitialContent();
                }

                // Close mobile menu
                const navMenu = document.querySelector('.nav-menu');
                const hamburger = document.getElementById('hamburger');
                if (navMenu && hamburger) {
                    navMenu.classList.remove('active');
                    hamburger.classList.remove('active');
                }
            });
        });
    }

    // Load initial content
    async loadInitialContent() {
        this.showLoading(true);
        
        try {
            const [movies, tvSeries] = await Promise.all([
                this.api.getPopularMovies(1),
                this.api.getPopularTVSeries(1)
            ]);

            // Combine and shuffle the results
            const combined = [...movies.results, ...tvSeries.results];
            this.currentContent = this.shuffleArray(combined);
            this.totalPages = Math.max(movies.total_pages, tvSeries.total_pages);
            
            this.renderContent();
            this.updatePagination();
        } catch (error) {
            console.error('Error loading initial content:', error);
            this.showError('Failed to load content. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    // Apply filters and reload content
    async applyFilters() {
        this.showLoading(true);
        
        try {
            let response;
            
            if (this.currentFilters.query) {
                // Search query
                response = await this.api.searchMulti(this.currentFilters.query, this.currentPage);
            } else if (this.currentFilters.type === 'movie') {
                // Movies only
                if (this.currentFilters.genre) {
                    const genreId = GENRE_MAP[this.currentFilters.genre];
                    response = await this.api.getMoviesByGenre(
                        genreId, 
                        this.currentPage, 
                        SORT_OPTIONS[this.currentFilters.sort] || 'popularity.desc'
                    );
                } else {
                    response = await this.api.getPopularMovies(this.currentPage);
                }
            } else if (this.currentFilters.type === 'tv') {
                // TV series only
                if (this.currentFilters.genre) {
                    const genreId = GENRE_MAP[this.currentFilters.genre];
                    response = await this.api.getTVByGenre(
                        genreId, 
                        this.currentPage, 
                        SORT_OPTIONS[this.currentFilters.sort] || 'popularity.desc'
                    );
                } else {
                    response = await this.api.getPopularTVSeries(this.currentPage);
                }
            } else {
                // Mixed content
                const [movies, tvSeries] = await Promise.all([
                    this.api.getPopularMovies(this.currentPage),
                    this.api.getPopularTVSeries(this.currentPage)
                ]);
                
                response = {
                    results: this.shuffleArray([...movies.results, ...tvSeries.results]),
                    total_pages: Math.max(movies.total_pages, tvSeries.total_pages)
                };
            }

            this.currentContent = response.results || [];
            this.totalPages = response.total_pages || 1;
            
            // Apply client-side sorting if needed
            this.sortContent();
            
            this.renderContent();
            this.updatePagination();
        } catch (error) {
            console.error('Error applying filters:', error);
            this.showError('Failed to load content. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    // Load anime content specifically
    async loadAnimeContent() {
        this.showLoading(true);
        
        try {
            const response = await this.api.getAnime(this.currentPage);
            this.currentContent = response.results || [];
            this.totalPages = response.total_pages || 1;
            
            this.renderContent();
            this.updatePagination();
        } catch (error) {
            console.error('Error loading anime content:', error);
            this.showError('Failed to load anime content. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    // Perform search
    async performSearch(query) {
        if (!query.trim()) return;
        
        this.currentFilters.query = query.trim();
        this.currentFilters.type = '';
        this.currentFilters.genre = '';
        this.currentPage = 1;
        
        await this.applyFilters();
    }

    // Sort content client-side
    sortContent() {
        const sortBy = this.currentFilters.sort;
        
        this.currentContent.sort((a, b) => {
            switch (sortBy) {
                case 'rating':
                    return (b.vote_average || 0) - (a.vote_average || 0);
                case 'release_date':
                    const dateA = new Date(a.release_date || a.first_air_date || 0);
                    const dateB = new Date(b.release_date || b.first_air_date || 0);
                    return dateB - dateA;
                case 'title':
                    const titleA = (a.title || a.name || '').toLowerCase();
                    const titleB = (b.title || b.name || '').toLowerCase();
                    return titleA.localeCompare(titleB);
                default:
                    return (b.popularity || 0) - (a.popularity || 0);
            }
        });
    }

    // Render content grid
    renderContent() {
        const contentGrid = document.getElementById('contentGrid');
        if (!contentGrid) return;

        if (this.currentContent.length === 0) {
            contentGrid.innerHTML = `
                <div class="no-content">
                    <h3>No content found</h3>
                    <p>Try adjusting your filters or search terms.</p>
                </div>
            `;
            return;
        }

        contentGrid.innerHTML = this.currentContent.map(item => {
            const title = item.title || item.name || 'Unknown Title';
            const year = new Date(item.release_date || item.first_air_date || '').getFullYear() || '';
            const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
            const posterURL = this.api.getPosterURL(item.poster_path);
            const isInWatchlist = this.watchlistManager.isInWatchlist(item.id);

            return `
                <div class="content-card" data-id="${item.id}">
                    <div class="card-image">
                        <img src="${posterURL}" alt="${title}" loading="lazy" 
                             onerror="this.src='/assets/images/no-poster.jpg'">
                        <div class="card-overlay">
                            <button class="play-btn" onclick="app.openModal(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                                ▶️
                            </button>
                        </div>
                    </div>
                    <div class="card-content">
                        <h3 class="card-title">${title}</h3>
                        <div class="card-meta">
                            <div class="card-rating">
                                <span>⭐</span>
                                <span>${rating}</span>
                            </div>
                            <div class="card-year">${year}</div>
                        </div>
                        <div class="card-actions">
                            <button class="watchlist-btn ${isInWatchlist ? 'added' : ''}" 
                                    onclick="app.toggleWatchlist(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                                ${isInWatchlist ? '✓ In Watchlist' : '+ Watchlist'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add click events to cards
        contentGrid.querySelectorAll('.content-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't open modal if clicking buttons
                if (e.target.tagName === 'BUTTON') return;
                
                const itemId = card.dataset.id;
                const item = this.currentContent.find(item => item.id == itemId);
                if (item) {
                    this.openModal(item);
                }
            });
        });
    }

    // Update pagination UI
    updatePagination() {
        const prevPage = document.getElementById('prevPage');
        const nextPage = document.getElementById('nextPage');
        const pageNumbers = document.getElementById('pageNumbers');

        if (prevPage) {
            prevPage.disabled = this.currentPage <= 1;
        }

        if (nextPage) {
            nextPage.disabled = this.currentPage >= this.totalPages;
        }

        if (pageNumbers) {
            pageNumbers.innerHTML = this.generatePageNumbers();
        }
    }

    // Generate page numbers
    generatePageNumbers() {
        const maxVisible = 5;
        const start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        const end = Math.min(this.totalPages, start + maxVisible - 1);

        let html = '';
        
        for (let i = start; i <= end; i++) {
            html += `
                <button class="page-number ${i === this.currentPage ? 'active' : ''}" 
                        onclick="app.goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        return html;
    }

    // Go to specific page
    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        
        this.currentPage = page;
        this.applyFilters();
    }

    // Open modal
    openModal(item) {
        this.modalManager.open(item);
    }

    // Toggle watchlist
    toggleWatchlist(item) {
        const isInWatchlist = this.watchlistManager.isInWatchlist(item.id);
        
        if (isInWatchlist) {
            this.watchlistManager.removeFromWatchlist(item.id);
        } else {
            this.watchlistManager.addToWatchlist(item);
        }

        // Update UI
        this.updateWatchlistUI();
        this.renderContent(); // Re-render to update buttons
    }

    // Show watchlist
    showWatchlist() {
        const watchlist = this.watchlistManager.getWatchlist();
        this.currentContent = watchlist;
        this.totalPages = 1;
        this.currentPage = 1;
        
        this.renderContent();
        this.updatePagination();
        
        // Scroll to content
        document.querySelector('.content-grid').scrollIntoView({ 
            behavior: 'smooth' 
        });
    }

    // Update watchlist UI elements
    updateWatchlistUI() {
        const count = this.watchlistManager.getCount();
        
        // Update watchlist link
        const watchlistLink = document.querySelector('a[href="#watchlist"]');
        if (watchlistLink) {
            watchlistLink.innerHTML = `Watchlist ${count > 0 ? `(${count})` : ''}`;
        }
    }

    // Show watchlist statistics
    showWatchlistStats() {
        const stats = this.watchlistManager.getStatistics();
        
        alert(`Watchlist Statistics:
Total Items: ${stats.total}
Movies: ${stats.movies}
TV Series: ${stats.tv}
Anime: ${stats.anime}
Average Rating: ${stats.averageRating}
Recently Added: ${stats.recentlyAdded}`);
    }

    // Export watchlist
    exportWatchlist() {
        this.watchlistManager.exportWatchlist();
    }

    // Import watchlist
    importWatchlist() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.watchlistManager.importWatchlist(file);
                this.updateWatchlistUI();
            }
        };
        
        input.click();
    }

    // Logout
    logout() {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        window.location.href = 'login.html';
    }

    // Show/hide loading
    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            if (show) {
                loading.classList.add('active');
                this.isLoading = true;
            } else {
                loading.classList.remove('active');
                this.isLoading = false;
            }
        }
    }

    // Show error message
    showError(message) {
        // Simple error display - could be enhanced with a toast system
        alert(message);
    }

    // Utility: Shuffle array
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CineVerseApp();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.app) {
        // Refresh watchlist UI when page becomes visible
        window.app.updateWatchlistUI();
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    console.log('Back online');
});

window.addEventListener('offline', () => {
    console.log('Gone offline');
});
