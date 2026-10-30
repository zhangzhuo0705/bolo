/*
 * Static demo version - app script
 */
document.addEventListener('DOMContentLoaded', function() {
    var tables = document.querySelectorAll('table');
    tables.forEach(function(table) {
        if (table.querySelector('img')) {
            table.classList.add('nexmoe-album');
        }
    });
    
    var images = document.querySelectorAll('#nexmoe-content img');
    images.forEach(function(img) {
        var src = img.getAttribute('src');
        if (src) {
            img.setAttribute('data-src', src);
            img.classList.add('lazyload');
        }
    });
    
    var sidebarLinks = document.querySelectorAll('#nexmoe-sidebar a');
    sidebarLinks.forEach(function(link) {
        link.classList.add('mdui-ripple');
    });
    
    if (typeof mdui !== 'undefined' && mdui.mutation) {
        mdui.mutation();
    }
});