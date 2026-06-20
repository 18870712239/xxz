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

    // ========================================
    // DOM 加载完成后初始化
    // ========================================
    document.addEventListener('DOMContentLoaded', function() {
        initNavigation();
        initPhotoGallery();
        initModal();
        initLazyLoading();
        initKeyboardNavigation();
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

})();
