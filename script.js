let musicFiles = [];
let currentSongIndex = 0;
let isPlaying = false;
const audioPlayer = document.getElementById('audioPlayer');

const playlists = [
    {
        id: 1,
        name: "Favorites",
        description: "Your favorite tracks",
        songs: []
    },
    {
        id: 2,
        name: "Recently Played",
        description: "Recently played tracks",
        songs: []
    },
    {
        id: 3,
        name: "Most Played",
        description: "Your most played tracks",
        songs: []
    },
    {
        id: 4,
        name: "Hypixel Skyblock",
        description: "NoteBlock tracks",
        songs: []
    }
];

let currentPlaylist = null;

if ('Notification' in window) {
    Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    fetchMusicList();
    initializeEventListeners();
});

function notifyIfUnfocused(message) {
    if ('Notification' in window) {
        if (Notification.permission === 'granted') {
            try {
                const notification = new Notification('Aurora Music Player', {
                    body: message,
                    icon: 'default-album.webp',
                    silent: false,
                    tag: 'aurora-music-' + Date.now(),
                    requireInteraction: false
                });

                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };

                setTimeout(() => {
                    if (notification) notification.close();
                }, 5000);

            } catch (error) {
                console.error('Notification error:', error);
            }
        }
    }
}

function initializeEventListeners() {
    const playBtn = document.getElementById('playBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const volumeControl = document.getElementById('volume');
    const progressBar = document.querySelector('.progress-bar');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');

    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', playPrevious);
    nextBtn.addEventListener('click', playNext);
    volumeControl.addEventListener('input', updateVolume);
    progressBar.addEventListener('click', seekTo);
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', () => playNext());
    
    audioPlayer.addEventListener('play', () => {
        const currentSong = currentPlaylist?.songs[currentSongIndex];
        if (currentSong) {
            const songTitle = currentSong.metadata?.title || currentSong.name.replace(/\.(mp3|m4a|wav)$/i, '');
            const artistName = currentSong.metadata?.artist || 'Unknown Artist';
            notifyIfUnfocused(`▶️ Now Playing\n${songTitle}\nby ${artistName}`);
        }
    });

    audioPlayer.addEventListener('pause', () => {
        const currentSong = currentPlaylist?.songs[currentSongIndex];
        if (currentSong) {
            const songTitle = currentSong.metadata?.title || currentSong.name.replace(/\.(mp3|m4a|wav)$/i, '');
            notifyIfUnfocused(`⏸️ Paused\n${songTitle}`);
        }
    });

    audioPlayer.addEventListener('loadstart', () => {
        if (currentPlaylist && currentPlaylist.songs[currentSongIndex]) {
            const song = currentPlaylist.songs[currentSongIndex];
            const songTitle = song.metadata?.title || song.name.replace(/\.(mp3|m4a|wav)$/i, '');
            const artistName = song.metadata?.artist || 'Unknown Artist';
            notifyIfUnfocused(`🎵 New Track\n${songTitle}\nby ${artistName}`);
        }
    });
    
    let isMenuOpen = false;
    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent document click from interfering
        isMenuOpen = !isMenuOpen;
        sidebar.classList.toggle('show');
        menuToggle.innerHTML = isMenuOpen ? 
            '<i class="fas fa-times"></i>' : 
            '<i class="fas fa-bars"></i>';
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (isMenuOpen && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
            isMenuOpen = false;
            sidebar.classList.remove('show');
            menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        }
    });
    document.addEventListener('fullscreenchange', updateFullscreenButton);
}

async function fetchMusicList() {
    try {
        const response = await fetch('http://localhost:3000/music');
        musicFiles = await response.json();
        playlists[0].songs = musicFiles;
        playlists[1].songs = musicFiles.slice(0, 5);
        playlists[2].songs = musicFiles.slice().sort(() => 0.5 - Math.random()).slice(0, 8);
        playlists[3].songs = musicFiles.filter(file => file.name.toLowerCase().includes('note block'));
        displayPlaylists();
        selectPlaylist(playlists[0]);
    } catch (error) {
        console.error('Error fetching music:', error);
    }
}

function displayPlaylists() {
    const playlistsList = document.getElementById('playlistsList');
    playlistsList.innerHTML = '';
    playlists.forEach(playlist => {
        const li = document.createElement('li');
        li.className = 'playlist-item';
        li.textContent = playlist.name;
        li.onclick = () => selectPlaylist(playlist);
        playlistsList.appendChild(li);
    });
}

function selectPlaylist(playlist) {
    currentPlaylist = playlist;
    document.getElementById('currentPlaylistName').textContent = playlist.name;
    document.getElementById('playlistDescription').textContent = playlist.description;
    document.querySelectorAll('.playlist-item').forEach(item => {
        item.classList.toggle('active', item.textContent === playlist.name);
    });
    displaySongs(playlist.songs);
}

function displaySongs(songs) {
    const playlistSongs = document.getElementById('playlistSongs');
    playlistSongs.innerHTML = '';
    songs.forEach((song, index) => {
        const li = document.createElement('li');
        li.className = 'song-row';
        if (currentPlaylist && currentPlaylist.songs[currentSongIndex] === song && isPlaying) {
            li.classList.add('playing');
        }
        const songTitle = song.metadata.title || song.name.replace(/\.(mp3|m4a|wav)$/i, '');
        li.innerHTML = `
            <span class="song-number">${index + 1}</span>
            <span class="song-title">${songTitle}</span>
            <span class="song-artist">${song.metadata.artist || 'Unknown Artist'}</span>
            <span class="song-duration">-:--</span>
        `;
        li.onclick = () => playSong(index);
        playlistSongs.appendChild(li);
    });
}

function playSong(index) {
    currentSongIndex = index;
    const song = currentPlaylist.songs[index];
    
    document.querySelectorAll('.song-row').forEach(row => {
        row.classList.remove('playing');
    });
    
    const songRows = document.querySelectorAll('.song-row');
    if (songRows[index]) {
        songRows[index].classList.add('playing');
    }
    
    audioPlayer.src = `http://localhost:3000/music/${song.name}`;
    const songTitle = song.metadata.title || song.name.replace(/\.(mp3|m4a|wav)$/i, '');
    
    document.getElementById('currentSong').textContent = songTitle;
    document.getElementById('artistName').textContent = song.metadata.artist || 'Unknown Artist';
    document.getElementById('currentSongName').textContent = songTitle;
    document.getElementById('currentArtistName').textContent = song.metadata.artist || 'Unknown Artist';
    
    if (song.metadata.picture) {
        const artSrc = `data:${song.metadata.picture.format};base64,${song.metadata.picture.data}`;
        document.getElementById('albumArt').src = artSrc;
        document.getElementById('currentAlbumArt').src = artSrc;
    } else {
        document.getElementById('albumArt').src = 'default-album.webp';
        document.getElementById('currentAlbumArt').src = 'default-album.webp';
    }
    
    audioPlayer.play();
    isPlaying = true;
    updatePlayButton();
}

function togglePlay() {
    if (audioPlayer.src) {
        if (isPlaying) {
            audioPlayer.pause();
        } else {
            audioPlayer.play();
        }
        isPlaying = !isPlaying;
        updatePlayButton();
    }
}

function updatePlayButton() {
    const playBtn = document.getElementById('playBtn');
    playBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
}

function playPrevious() {
    if (currentSongIndex > 0) {
        playSong(currentSongIndex - 1);
    }
}

function playNext() {
    if (currentSongIndex < currentPlaylist.songs.length - 1) {
        playSong(currentSongIndex + 1);
    }
}

function updateVolume() {
    const volume = document.getElementById('volume').value;
    audioPlayer.volume = volume;
}

function updateProgress() {
    const progress = document.querySelector('.progress');
    const currentTime = document.getElementById('current');
    const duration = document.getElementById('duration');
    
    const currentMinutes = Math.floor(audioPlayer.currentTime / 60);
    const currentSeconds = Math.floor(audioPlayer.currentTime % 60);
    const durationMinutes = Math.floor(audioPlayer.duration / 60);
    const durationSeconds = Math.floor(audioPlayer.duration % 60);
    
    currentTime.textContent = `${currentMinutes}:${currentSeconds.toString().padStart(2, '0')}`;
    duration.textContent = `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`;
    
    const progressPercent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progress.style.width = `${progressPercent}%`;
}

function seekTo(e) {
    const progressBar = document.querySelector('.progress-bar');
    const clickPosition = (e.offsetX / progressBar.offsetWidth);
    audioPlayer.currentTime = clickPosition * audioPlayer.duration;
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

function updateFullscreenButton() {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (document.fullscreenElement) {
        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
    } else {
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    }
}




