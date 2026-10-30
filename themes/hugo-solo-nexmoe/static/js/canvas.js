/*
 * Hugo Solo Nexmoe - A Hugo theme converted from solo-nexmoe.
 * Canvas background animation - static demo version
 */
!function() {
    function get_attribute(node, attr, default_value) {
        return node.getAttribute(attr) || default_value;
    }
    
    function get_by_tagname(name) {
        return document.getElementsByTagName(name);
    }
    
    var the_canvas = document.getElementById("c_n1");
    
    if (!the_canvas) {
        return;
    }
    
    var config = {
        z: -1,
        o: 0.5,
        c: "0,0,0",
        n: 99
    };
    
    var context = the_canvas.getContext("2d");
    var canvas_width, canvas_height;
    
    function set_canvas_size() {
        canvas_width = the_canvas.width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        canvas_height = the_canvas.height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    }
    
    var frame_func = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(func) {
        window.setTimeout(func, 1000 / 45);
    };
    
    var random = Math.random;
    var current_point = {
        x: null,
        y: null,
        max: 20000
    };
    
    var all_array;
    
    the_canvas.style.cssText = "position:fixed;top:0;left:0;z-index:" + config.z + ";opacity:" + config.o;
    
    set_canvas_size();
    window.onresize = set_canvas_size;
    
    window.onmousemove = function(e) {
        e = e || window.event;
        current_point.x = e.clientX;
        current_point.y = e.clientY;
    };
    
    window.onmouseout = function() {
        current_point.x = null;
        current_point.y = null;
    };
    
    var random_lines = [];
    for (var i = 0; config.n > i; i++) {
        var x = random() * canvas_width;
        var y = random() * canvas_height;
        var xa = 2 * random() - 1;
        var ya = 2 * random() - 1;
        random_lines.push({
            x: x,
            y: y,
            xa: xa,
            ya: ya,
            max: 6000
        });
    }
    
    all_array = random_lines.concat([current_point]);
    
    function draw_canvas() {
        context.clearRect(0, 0, canvas_width, canvas_height);
        var e, i, d, x_dist, y_dist, dist;
        
        random_lines.forEach(function(r, idx) {
            r.x += r.xa;
            r.y += r.ya;
            
            r.xa *= r.x > canvas_width || r.x < 0 ? -1 : 1;
            r.ya *= r.y > canvas_height || r.y < 0 ? -1 : 1;
            
            context.fillRect(r.x - 0.5, r.y - 0.5, 1, 1);
            
            for (i = idx + 1; i < all_array.length; i++) {
                e = all_array[i];
                
                if (null !== e.x && null !== e.y) {
                    x_dist = r.x - e.x;
                    y_dist = r.y - e.y;
                    dist = x_dist * x_dist + y_dist * y_dist;
                    
                    if (dist < e.max) {
                        if (e === current_point && dist >= e.max / 2) {
                            r.x -= 0.03 * x_dist;
                            r.y -= 0.03 * y_dist;
                        }
                        
                        d = (e.max - dist) / e.max;
                        context.beginPath();
                        context.lineWidth = d / 2;
                        context.strokeStyle = "rgba(" + config.c + "," + (d + 0.2) + ")";
                        context.moveTo(r.x, r.y);
                        context.lineTo(e.x, e.y);
                        context.stroke();
                    }
                }
            }
        });
        
        frame_func(draw_canvas);
    }
    
    setTimeout(function() {
        draw_canvas();
    }, 100);
}();
