/*
 * Static demo version - simplified skin script
 */
var Skin = {
    init: function () {
        var navLinks = document.querySelectorAll('.header__nav a');
        navLinks.forEach(function(link) {
            if (link.href === location.href) {
                link.classList.add('active');
            }
            link.addEventListener('click', function() {
                navLinks.forEach(function(l) {
                    l.classList.remove('active');
                });
                if (this.href === location.href) {
                    this.classList.add('active');
                }
            });
        });
        
        Skin._initToc();
    },
    _initToc: function () {
        var tocContainer = document.querySelector('.post__toc');
        var articleToc = document.querySelector('.article__toc');
        
        if (!articleToc) {
            return;
        }
        
        var tocLinks = articleToc.querySelectorAll('a');
        tocLinks.forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                var targetId = this.getAttribute('href');
                var targetElement = document.querySelector(targetId);
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 20,
                        behavior: 'smooth'
                    });
                }
            });
        });
        
        if (tocContainer) {
            window.addEventListener('scroll', function() {
                if (window.scrollY > 72) {
                    tocContainer.style.display = 'block';
                } else {
                    tocContainer.style.display = 'none';
                }
            });
        }
    },
    initArticle: function () {
        Skin._initToc();
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Skin.init);
} else {
    Skin.init();
}