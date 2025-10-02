// API Configuration and Functions for Movie/Series/Anime Website

class MovieAPI {
    constructor() {
        this.apiKey = '3281e998d7c40557d188dce2af90dd08'; // Replace with your actual TMDB API key
        this.baseURL = 'https://api.themoviedb.org/3';
        this.imageBaseURL = 'https://image.tmdb.org/t/p/w500';
        this.backdropBaseURL = 'https://image.tmdb.org/t/p/w1280';
        this.cache = new Map();
        this.requestQueue = [];
        this.isProcessing = false;
    }

    // Rate limiting to respect TMDB's 40 requests per 10 seconds limit
    async makeRequest(url) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ url, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.isProcessing || this.requestQueue.length === 0) return;
        
        this.isProcessing = true;
        
        while (this.requestQueue.length > 0) {
            const batch = this.requestQueue.splice(0, 35); // Leave some margin for rate limit
            
            const promises = batch.map(async ({ url, resolve, reject }) => {
                try {
                    // Check cache first
                    if (this.cache.has(url)) {
                        resolve(this.cache.get(url));
                        return;
                    }
                    
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    
                    // Cache the result
                    this.cache.set(url, data);
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            });
            
            await Promise.all(promises);
            
            // Wait 10 seconds before processing next batch
            if (this.requestQueue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }
        
        this.isProcessing = false;
    }

    // Get popular movies
    async getPopularMovies(page = 1) {
        const url = `${this.baseURL}/movie/popular?api_key=${this.apiKey}&page=${page}`;
        return await this.makeRequest(url);
    }

    // Get popular TV series
    async getPopularTVSeries(page = 1) {
        const url = `${this.baseURL}/tv/popular?api_key=${this.apiKey}&page=${page}`;
        return await this.makeRequest(url);
    }

    // Get trending content (movies, TV, anime)
    async getTrending(mediaType = 'all', timeWindow = 'week', page = 1) {
        const url = `${this.baseURL}/trending/${mediaType}/${timeWindow}?api_key=${this.apiKey}&page=${page}`;
        return await this.makeRequest(url);
    }

    // Search for content
    async searchMulti(query, page = 1) {
        const encodedQuery = encodeURIComponent(query);
        const url = `${this.baseURL}/search/multi?api_key=${this.apiKey}&query=${encodedQuery}&page=${page}`;
        return await this.makeRequest(url);
    }

    // Get movie details
    async getMovieDetails(movieId) {
        const url = `${this.baseURL}/movie/${movieId}?api_key=${this.apiKey}&append_to_response=videos,credits,recommendations`;
        return await this.makeRequest(url);
    }

    // Get TV series details
    async getTVDetails(tvId) {
        const url = `${this.baseURL}/tv/${tvId}?api_key=${this.apiKey}&append_to_response=videos,credits,recommendations`;
        return await this.makeRequest(url);
    }

    // Get movies by genre
    async getMoviesByGenre(genreId, page = 1, sortBy = 'popularity.desc') {
        const url = `${this.baseURL}/discover/movie?api_key=${this.apiKey}&with_genres=${genreId}&page=${page}&sort_by=${sortBy}`;
        return await this.makeRequest(url);
    }

    // Get TV series by genre
    async getTVByGenre(genreId, page = 1, sortBy = 'popularity.desc') {
        const url = `${this.baseURL}/discover/tv?api_key=${this.apiKey}&with_genres=${genreId}&page=${page}&sort_by=${sortBy}`;
        return await this.makeRequest(url);
    }

    // Get anime (TV series with Japanese origin)
    async getAnime(page = 1, sortBy = 'popularity.desc') {
        const url = `${this.baseURL}/discover/tv?api_key=${this.apiKey}&with_origin_country=JP&with_genres=16&page=${page}&sort_by=${sortBy}`;
        return await this.makeRequest(url);
    }

    // Get movie genres
    async getMovieGenres() {
        const url = `${this.baseURL}/genre/movie/list?api_key=${this.apiKey}`;
        return await this.makeRequest(url);
    }

    // Get TV genres
    async getTVGenres() {
        const url = `${this.baseURL}/genre/tv/list?api_key=${this.apiKey}`;
        return await this.makeRequest(url);
    }

    // Get top rated movies
    async getTopRatedMovies(page = 1) {
        const url = `${this.baseURL}/movie/top_rated?api_key=${this.apiKey}&page=${page}`;
        return await this.makeRequest(url);
    }

    // Get top rated TV series
    async getTopRatedTV(page = 1) {
        const url = `${this.baseURL}/tv/top_rated?api_key=${this.apiKey}&page=${page}`;
        return await this.makeRequest(url);
    }

    // Get upcoming movies
    async getUpcomingMovies(page = 1) {
        const url = `${this.baseURL}/movie/upcoming?api_key=${this.apiKey}&page=${page}`;
        return await this.makeRequest(url);
    }

    // Get now playing movies
    async getNowPlayingMovies(page = 1) {
        const url = `${this.baseURL}/movie/now_playing?api_key=${this.apiKey}&page=${page}`;
        return await this.makeRequest(url);
    }

    // Get poster URL
    getPosterURL(posterPath, size = 'w500') {
        if (!posterPath) return '/assets/images/no-poster.jpg';
        return `https://image.tmdb.org/t/p/${size}${posterPath}`;
    }

    // Get backdrop URL
    getBackdropURL(backdropPath, size = 'w1280') {
        if (!backdropPath) return '/assets/images/no-backdrop.jpg';
        return `https://image.tmdb.org/t/p/${size}${backdropPath}`;
    }

    // Get YouTube trailer URL
    getTrailerURL(videos) {
        if (!videos || !videos.results) return null;
        
        const trailer = videos.results.find(video => 
            video.type === 'Trailer' && 
            video.site === 'YouTube'
        );
        
        return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
    }

    // Format runtime
    formatRuntime(minutes) {
        if (!minutes) return 'Unknown';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }

    // Format release date
    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Format rating
    formatRating(voteAverage) {
        return voteAverage ? voteAverage.toFixed(1) : 'N/A';
    }

    // Get content type
    getContentType(item) {
        if (item.title || item.release_date) return 'movie';
        if (item.name || item.first_air_date) return 'tv';
        return 'unknown';
    }

    // Get display title
    getDisplayTitle(item) {
        return item.title || item.name || 'Unknown Title';
    }

    // Get display date
    getDisplayDate(item) {
        return item.release_date || item.first_air_date || '';
    }

    // Check if content is anime
    isAnime(item) {
        if (!item.genre_ids && !item.genres) return false;
        
        const genreIds = item.genre_ids || item.genres?.map(g => g.id) || [];
        const isAnimation = genreIds.includes(16); // Animation genre ID
        
        // Check if it's from Japan or has anime-related keywords
        const isJapanese = item.origin_country?.includes('JP') || 
                          item.original_language === 'ja';
        
        return isAnimation && isJapanese;
    }

    // Error handling wrapper
    async handleAPICall(apiCall, fallback = null) {
        try {
            return await apiCall();
        } catch (error) {
            console.error('API call failed:', error);
            if (fallback) return fallback;
            throw error;
        }
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
    }

    // Get cache size
    getCacheSize() {
        return this.cache.size;
    }
}

// Genre mapping for easier filtering
const GENRE_MAP = {
    // Movie genres
    action: 28,
    adventure: 12,
    animation: 16,
    comedy: 35,
    crime: 80,
    documentary: 99,
    drama: 18,
    family: 10751,
    fantasy: 14,
    history: 36,
    horror: 27,
    music: 10402,
    mystery: 9648,
    romance: 10749,
    'sci-fi': 878,
    thriller: 53,
    war: 10752,
    western: 37,
    
    // TV genres (some overlap with movies)
    'action-adventure': 10759,
    'soap': 10766,
    'talk': 10767,
    'war-politics': 10768,
    'reality': 10770,
    'news': 10763,
    'kids': 10762
};

// Sort options mapping
const SORT_OPTIONS = {
    popularity: 'popularity.desc',
    rating: 'vote_average.desc',
    release_date: 'release_date.desc',
    title: 'title.asc',
    revenue: 'revenue.desc'
};

// Export the API class and constants
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MovieAPI, GENRE_MAP, SORT_OPTIONS };
} else {
    window.MovieAPI = MovieAPI;
    window.GENRE_MAP = GENRE_MAP;
    window.SORT_OPTIONS = SORT_OPTIONS;
}
