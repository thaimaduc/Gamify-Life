// js/chart.js - Radar Chart Module (Phase 5)
// Vanilla SVG renderer cho biểu đồ 5 stats
(function(){
    'use strict';
    
    window.Chart = window.Chart || {};
    
    Chart.renderRadar = function(stats) {
        // ⚙️ 1. MỞ RỘNG KHUNG VẼ ĐỂ KHÔNG BỊ CẮT ICON
        var size = 260;           // Tăng từ 200 lên 260
        var center = size / 2;    // Tâm giờ là 130
        var radius = 80;          // Bán kính lưới giữ nguyên
        var axes = ['str', 'agi', 'int', 'vit', 'lck'];
        var icons = ['⚔️', '🪽', '🧠', '❤️', '🍀'];
        
        // 🧮 2. SCALE ĐỘNG CHO STATS (Fix lỗi teo biểu đồ)
        // Lấy danh sách các level hiện tại
        var currentLevels = axes.map(function(axis) {
            var statData = stats[axis];
            return (statData && typeof statData === 'object') ? statData.level : (statData || 0);
        });
        var highestLevel = Math.max.apply(null, currentLevels);
        
        // Tự động scale: Bèo nhất chart hiển thị khung 15, trần là 100.
        // Giúp level 1-10 vẫn nhìn rõ hình đa giác, nhưng khi max thì chạm đỉnh 100.
        var maxStat = Math.min(100, Math.max(15, highestLevel));
        
        // Helper: tính tọa độ điểm trên đường tròn
        function getPoint(angle, distance) {
            return {
                x: center + distance * Math.cos(angle),
                y: center + distance * Math.sin(angle)
            };
        }
        
        var points = [];
        for (var i = 0; i < axes.length; i++) {
            var angle = (Math.PI * 2 * i / 5) - Math.PI / 2;
            var value = Math.min(currentLevels[i], 100); // Kịch kim level 100
            var ratio = value / maxStat;
            var pos = getPoint(angle, radius * ratio);
            var axisEnd = getPoint(angle, radius);
            
            points.push({
                x: pos.x, y: pos.y,
                axisX: axisEnd.x, axisY: axisEnd.y,
                icon: icons[i],
                value: value
            });
        }
        
        // 🕸️ Vẽ lưới nền
        var grid = '';
        for (var r = radius * 0.33; r <= radius; r += radius * 0.33) {
            grid += '<circle cx="' + center + '" cy="' + center + '" r="' + r + '" fill="none" stroke="#0f3460" stroke-width="1" opacity="0.4"/>';
        }
        
        // 📏 Vẽ trục
        var axesLines = '';
        for (var i = 0; i < points.length; i++) {
            var p = points[i];
            axesLines += '<line x1="' + center + '" y1="' + center + '" x2="' + p.axisX + '" y2="' + p.axisY + '" stroke="#0f3460" stroke-width="1" opacity="0.3"/>';
        }
        
        // 🔷 Vẽ đa giác dữ liệu
        var polyPoints = points.map(function(p) { return p.x + ',' + p.y; }).join(' ');
        var dataPolygon = '<polygon points="' + polyPoints + '" fill="#00d4ff" fill-opacity="0.3" stroke="#00d4ff" stroke-width="2.5" stroke-linejoin="round"/>';
        
        // 🔘 Vẽ chấm + nhãn tại các đỉnh
        var vertices = '';
        for (var i = 0; i < points.length; i++) {
            var p = points[i];
            
            // Đẩy offset xa hơn (28) để vừa vặn icon lớn
            var labelOffset = 28;
            var labelAngle = (Math.PI * 2 * i / 5) - Math.PI / 2;
            var labelX = center + (radius + labelOffset) * Math.cos(labelAngle);
            var labelY = center + (radius + labelOffset) * Math.sin(labelAngle);
            
            // Dot nhỏ
            vertices += '<circle cx="' + p.x + '" cy="' + p.y + '" r="3" fill="#16213e" stroke="#00d4ff" stroke-width="2"/>';
            
            // Icon to + Số (căn chỉnh chính giữa)
            vertices += '<text x="' + labelX + '" y="' + labelY + '" text-anchor="middle" dominant-baseline="central">' +
                            '<tspan font-size="22">' + p.icon + '</tspan>' +
                            '<tspan font-size="13" fill="#00d4ff" font-weight="bold" dx="6" dy="-2">' + p.value + '</tspan>' +
                        '</text>';
        }
        
        return '<div class="radar-wrapper">' +
            '<svg viewBox="0 0 ' + size + ' ' + size + '" class="radar-chart">' +
                grid + axesLines + dataPolygon + vertices +
            '</svg>' +
            '</div>';
    };
    
})();