/**
 * 照片网站交互脚本
 */

(function() {
    'use strict';

    // ========================================
    // 全局变量
    // ========================================
    let currentPhotoIndex = 0;
    let photos = [];
    let modal = null;
    let modalImage = null;
    let modalTitle = null;
    let modalDate = null;
    let modalExif = null;
    let currentZoom = 1;

    // ========================================
    // DOM 加载完成后初始化
    // ========================================
    document.addEventListener('DOMContentLoaded', function() {
        initNavigation();
        initPhotoGallery();
        initModal();
        initLazyLoading();
        initKeyboardNavigation();
        initThemeToggle();
    });

    // ========================================
    // 导航栏功能
    // ========================================
    function initNavigation() {
        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');

        if (navToggle && navMenu) {
            navToggle.addEventListener('click', function() {
                navMenu.classList.toggle('active');
                navToggle.classList.toggle('active');
            });

            // 点击菜单项后关闭菜单
            const navLinks = navMenu.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', function() {
                    navMenu.classList.remove('active');
                    navToggle.classList.remove('active');
                });
            });
        }

        // 滚动时隐藏/显示导航栏
        let lastScrollTop = 0;
        const navbar = document.querySelector('.navbar');

        window.addEventListener('scroll', function() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

            if (scrollTop > lastScrollTop && scrollTop > 100) {
                // 向下滚动
                navbar.style.transform = 'translateY(-100%)';
            } else {
                // 向上滚动
                navbar.style.transform = 'translateY(0)';
            }

            lastScrollTop = scrollTop;
        }, { passive: true });
    }

    // ========================================
    // 照片墙功能
    // ========================================
    function initPhotoGallery() {
        const photoGrid = document.getElementById('photo-grid');

        if (!photoGrid) return;

        // 获取所有照片元素
        const photoCards = photoGrid.querySelectorAll('.photo-card');
        photos = Array.from(photoCards);

        // 为每张照片添加点击事件
        photos.forEach((card, index) => {
            card.addEventListener('click', function() {
                openModal(index);
            });
        });

        // 初始化搜索功能
        initSearch();

        // 初始化点赞功能
        initLikes();
    }

    // ========================================
    // 点赞功能
    // ========================================
    function initLikes() {
        const likeBtns = document.querySelectorAll('.photo-like-btn');

        likeBtns.forEach(btn => {
            const photoId = btn.getAttribute('data-photo-id');
            const countEl = btn.querySelector('.like-count');

            // 加载保存的点赞数据
            const likes = getLikes();
            const isLiked = likes.likedPhotos.includes(photoId);
            const count = likes.counts[photoId] || 0;

            if (isLiked) {
                btn.classList.add('liked');
            }
            if (countEl) {
                countEl.textContent = count;
            }

            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleLike(photoId, btn, countEl);
            });
        });
    }

    function getLikes() {
        try {
            const data = localStorage.getItem('photoLikes');
            return data ? JSON.parse(data) : { likedPhotos: [], counts: {} };
        } catch (e) {
            return { likedPhotos: [], counts: {} };
        }
    }

    function saveLikes(likes) {
        try {
            localStorage.setItem('photoLikes', JSON.stringify(likes));
        } catch (e) {
            console.log('Failed to save likes:', e);
        }
    }

    function toggleLike(photoId, btn, countEl) {
        const likes = getLikes();
        const index = likes.likedPhotos.indexOf(photoId);

        if (index > -1) {
            // 取消点赞
            likes.likedPhotos.splice(index, 1);
            likes.counts[photoId] = Math.max(0, (likes.counts[photoId] || 0) - 1);
            btn.classList.remove('liked');
        } else {
            // 添加点赞
            likes.likedPhotos.push(photoId);
            likes.counts[photoId] = (likes.counts[photoId] || 0) + 1;
            btn.classList.add('liked');
        }

        saveLikes(likes);

        if (countEl) {
            countEl.textContent = likes.counts[photoId] || 0;
        }
    }

    // ========================================
    // 搜索功能
    // ========================================
    function initSearch() {
        const searchInput = document.getElementById('search-input');
        const searchStats = document.getElementById('search-stats');

        if (!searchInput || !searchStats) return;

        searchInput.addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase().trim();
            filterPhotos(query);
        });

        // 点击搜索按钮
        const searchBtn = document.querySelector('.search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', function() {
                const query = searchInput.value.toLowerCase().trim();
                filterPhotos(query);
            });
        }

        // 回车键搜索
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const query = e.target.value.toLowerCase().trim();
                filterPhotos(query);
            }
        });
    }

    function filterPhotos(query) {
        const photoGrid = document.getElementById('photo-grid');
        const searchStats = document.getElementById('search-stats');

        if (!photoGrid || !searchStats) return;

        const items = photoGrid.querySelectorAll('.masonry-item');
        let visibleCount = 0;

        items.forEach(item => {
            const card = item.querySelector('.photo-card');
            const img = item.querySelector('.photo-img');

            if (!card || !img) return;

            const title = (img.getAttribute('data-title') || '').toLowerCase();
            const date = (img.getAttribute('data-date') || '').toLowerCase();
            const album = (item.getAttribute('data-album') || '').toLowerCase();
            const filename = (img.getAttribute('src') || '').split('/').pop().toLowerCase();

            const match = query === '' ||
                title.includes(query) ||
                date.includes(query) ||
                album.includes(query) ||
                filename.includes(query);

            if (match) {
                item.style.display = 'block';
                item.style.opacity = '1';
                visibleCount++;
            } else {
                item.style.display = 'none';
                item.style.opacity = '0';
            }
        });

        if (query === '') {
            searchStats.textContent = `显示全部 ${visibleCount} 张照片`;
        } else {
            searchStats.textContent = `找到 ${visibleCount} 张匹配的照片`;
        }
    }

    // ========================================
    // 模态框功能
    // ========================================
    function initModal() {
        modal = document.getElementById('photo-modal');

        if (!modal) return;

        modalImage = document.getElementById('modal-image');
        modalTitle = document.getElementById('modal-title');
        modalDate = document.getElementById('modal-date');
        modalExif = document.getElementById('modal-exif');

        // 关闭按钮
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        // 上一张/下一张按钮
        const prevBtn = modal.querySelector('.modal-prev');
        const nextBtn = modal.querySelector('.modal-next');

        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                showPreviousPhoto();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                showNextPhoto();
            });
        }

        // 点击背景关闭
        modal.addEventListener('click', function(e) {
            if (e.target === modal || e.target.classList.contains('modal-content')) {
                closeModal();
            }
        });

        // 工具栏按钮
        const zoomInBtn = document.getElementById('modal-zoom-in');
        const zoomOutBtn = document.getElementById('modal-zoom-out');
        const resetBtn = document.getElementById('modal-reset');
        const downloadBtn = document.getElementById('modal-download');
        const shareBtn = document.getElementById('modal-share');

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                zoomIn();
            });
        }

        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                zoomOut();
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                resetZoom();
            });
        }

        if (downloadBtn) {
            downloadBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                downloadPhoto();
            });
        }

        if (shareBtn) {
            shareBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                sharePhoto();
            });
        }

        // 鼠标滚轮缩放
        modal.addEventListener('wheel', function(e) {
            if (!modal.classList.contains('active')) return;
            e.preventDefault();
            if (e.deltaY < 0) {
                zoomIn();
            } else {
                zoomOut();
            }
        }, { passive: false });
    }

    function openModal(index) {
        if (!modal || photos.length === 0) return;

        currentPhotoIndex = index;
        updateModalContent();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        if (!modal) return;

        modal.classList.remove('active');
        document.body.style.overflow = '';
        resetZoom();
    }

    // ========================================
    // 缩放功能
    // ========================================
    function zoomIn() {
        if (!modalImage) return;
        currentZoom = Math.min(currentZoom + 0.25, 3);
        applyZoom();
    }

    function zoomOut() {
        if (!modalImage) return;
        currentZoom = Math.max(currentZoom - 0.25, 0.25);
        applyZoom();
    }

    function resetZoom() {
        if (!modalImage) return;
        currentZoom = 1;
        applyZoom();
    }

    function applyZoom() {
        if (!modalImage) return;
        modalImage.style.transform = `scale(${currentZoom})`;

        const zoomLevel = document.querySelector('.modal-zoom-level');
        if (zoomLevel) {
            zoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;
        }
    }

    // ========================================
    // 下载功能
    // ========================================
    function downloadPhoto() {
        if (!modalImage || !modalImage.src) return;

        const link = document.createElement('a');
        link.href = modalImage.src;
        const filename = modalImage.src.split('/').pop();
        link.download = filename || 'photo.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ========================================
    // 分享功能
    // ========================================
    function sharePhoto() {
        if (!modalImage || !modalImage.src) return;

        const shareData = {
            title: document.title,
            text: modalTitle ? modalTitle.textContent : '',
            url: window.location.href
        };

        if (navigator.share) {
            navigator.share(shareData)
                .catch(err => {
                    console.log('Share cancelled:', err);
                });
        } else {
            copyLinkToClipboard();
        }
    }

    function copyLinkToClipboard() {
        navigator.clipboard.writeText(window.location.href)
            .then(() => {
                showToast('链接已复制到剪贴板');
            })
            .catch(err => {
                console.log('Copy failed:', err);
                showToast('复制失败，请手动复制链接');
            });
    }

    function showToast(message) {
        let toast = document.getElementById('modal-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'modal-toast';
            toast.className = 'modal-toast';
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.add('active');

        setTimeout(() => {
            toast.classList.remove('active');
        }, 2000);
    }

    function updateModalContent() {
        if (!modalImage || currentPhotoIndex < 0 || currentPhotoIndex >= photos.length) return;

        const photoCard = photos[currentPhotoIndex];
        const img = photoCard.querySelector('.photo-img');

        if (!img) return;

        // 更新图片
        const largeSrc = img.getAttribute('data-src');
        modalImage.src = largeSrc;
        modalImage.alt = img.alt;

        // 更新标题
        if (modalTitle) {
            const title = img.getAttribute('data-title');
            modalTitle.textContent = title || '';
        }

        // 更新日期
        if (modalDate) {
            const date = img.getAttribute('data-date');
            modalDate.textContent = formatDate(date) || '';
        }

        // 更新 EXIF 信息
        if (modalExif) {
            const exifJson = img.getAttribute('data-exif');
            try {
                const exif = JSON.parse(exifJson);
                displayExifInfo(exif);
            } catch (e) {
                modalExif.innerHTML = '';
            }
        }
    }

    function displayExifInfo(exif) {
        if (!modalExif) return;

        const exifItems = [];

        if (exif.camera) {
            exifItems.push(createExifItem('相机', exif.camera));
        }
        if (exif.lens) {
            exifItems.push(createExifItem('镜头', exif.lens));
        }
        if (exif.aperture) {
            exifItems.push(createExifItem('光圈', exif.aperture));
        }
        if (exif.shutter_speed) {
            exifItems.push(createExifItem('快门', exif.shutter_speed));
        }
        if (exif.iso) {
            exifItems.push(createExifItem('ISO', exif.iso));
        }
        if (exif.focal_length) {
            exifItems.push(createExifItem('焦距', exif.focal_length));
        }

        modalExif.innerHTML = exifItems.join('');
    }

    function createExifItem(label, value) {
        return `
            <div class="exif-item">
                <span class="exif-label">${label}:</span>
                <span>${value}</span>
            </div>
        `;
    }

    function showPreviousPhoto() {
        if (photos.length === 0) return;

        currentPhotoIndex--;
        if (currentPhotoIndex < 0) {
            currentPhotoIndex = photos.length - 1;
        }
        updateModalContent();
    }

    function showNextPhoto() {
        if (photos.length === 0) return;

        currentPhotoIndex++;
        if (currentPhotoIndex >= photos.length) {
            currentPhotoIndex = 0;
        }
        updateModalContent();
    }

    // ========================================
    // 懒加载功能
    // ========================================
    function initLazyLoading() {
        // 使用 Intersection Observer API 实现懒加载
        if ('IntersectionObserver' in window) {
            const lazyImages = document.querySelectorAll('img[loading="lazy"]');

            const imageObserver = new IntersectionObserver(function(entries, observer) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.src; // 触发加载
                        img.classList.add('fade-in');
                        observer.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.01
            });

            lazyImages.forEach(function(img) {
                imageObserver.observe(img);
            });
        }
    }

    // ========================================
    // 键盘导航
    // ========================================
    function initKeyboardNavigation() {
        document.addEventListener('keydown', function(e) {
            // 只在模态框打开时响应
            if (!modal || !modal.classList.contains('active')) return;

            switch (e.key) {
                case 'Escape':
                    closeModal();
                    break;
                case 'ArrowLeft':
                    showPreviousPhoto();
                    break;
                case 'ArrowRight':
                    showNextPhoto();
                    break;
            }
        });
    }

    // ========================================
    // 工具函数
    // ========================================
    function formatDate(dateStr) {
        if (!dateStr) return '';

        try {
            // EXIF 日期格式: YYYY:MM:DD HH:MM:SS
            const parts = dateStr.split(' ');
            if (parts.length >= 1) {
                const datePart = parts[0].replace(/:/g, '-');
                const date = new Date(datePart);

                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                }
            }
            return dateStr;
        } catch (e) {
            return dateStr;
        }
    }

    // ========================================
    // 触摸手势支持（移动端）
    // ========================================
    let touchStartX = 0;
    let touchEndX = 0;

    if (modal) {
        modal.addEventListener('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        modal.addEventListener('touchend', function(e) {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });
    }

    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // 向左滑动 - 下一张
                showNextPhoto();
            } else {
                // 向右滑动 - 上一张
                showPreviousPhoto();
            }
        }
    }

    // ========================================
    // 平滑滚动
    // ========================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ========================================
    // 主题切换功能
    // ========================================
    function initThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        const body = document.body;

        if (!themeToggle) return;

        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme) {
            body.classList.toggle('light-theme', savedTheme === 'light');
        } else if (!prefersDark) {
            body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
        }

        themeToggle.addEventListener('click', function() {
            const isLight = body.classList.toggle('light-theme');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
        });
    }

})();
