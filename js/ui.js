/* ui.js - Phase 5 (New Stats Format + Radar Chart)
 * Render từ state mới: stats {level, exp}, characterLevel, allocPoints
 * Quy tắc: Chỉ đọc state, không gọi Storage, không tính business logic
 */
var UI = (function() {
    'use strict';
    
    // ===== DOM CACHE (lazy init - tránh null nếu DOM chưa ready) =====
    var _cache = {};
    function _getEl(id) {
        if (!_cache[id]) {
            _cache[id] = document.getElementById(id);
        }
        return _cache[id];
    }

    var avatarFrames = [
        { maxLevel: 29,  src: "images/frame/Level_1_Summoner_Icon_Border.png" },   // Cấp 1 - 29
        { maxLevel: 49,  src: "images/frame/Level_30_Summoner_Icon_Border.png" },  // Cấp 30 - 49
        { maxLevel: 74,  src: "images/frame/Level_50_Summoner_Icon_Border.png" },  // Cấp 50 - 74
        { maxLevel: 99,  src: "images/frame/Level_75_Summoner_Icon_Border.png" },  // Cấp 75 - 99
        { maxLevel: 124,  src: "images/frame/Level_100_Summoner_Icon_Border.png" },  // Cấp 75 - 99
        { maxLevel: 149,  src: "images/frame/Level_125_Summoner_Icon_Border.png" },  // Cấp 75 - 99
        { maxLevel: 174,  src: "images/frame/Level_150_Summoner_Icon_Border.png" },  // Cấp 75 - 99
        { maxLevel: 199,  src: "images/frame/Level_175_Summoner_Icon_Border.png" },  // Cấp 75 - 99
        { maxLevel: 224,  src: "images/frame/Level_200_Summoner_Icon_Border.png" },  // Cấp 75 - 99
        { maxLevel: 249,  src: "images/frame/Level_225_Summoner_Icon_Border.png" },  // Cấp 75 - 99
        { maxLevel: 274,  src: "images/frame/Level_250_Summoner_Icon_Border.png" },  // Cấp 75 - 99
        { maxLevel: 299,  src: "images/frame/Level_275_Summoner_Icon_Border.png" },  // Cấp 75 - 99
        { maxLevel: 324,  src: "images/frame/Level_300_Summoner_Icon_Border.png" },  // Cấp 75 - 99
        { maxLevel: 349,  src: "images/frame/Level_325_Summoner_Icon_Border.png" },  // Cấp 75 - 99
        { maxLevel: 374,  src: "images/frame/Level_350_Summoner_Icon_Border.png" },  // Cấp 75 - 99
        { maxLevel: 399,  src: "images/frame/Level_375_Summoner_Icon_Border.png" },  // Cấp 75 - 99
        { maxLevel: 424,  src: "images/frame/Level_400_Summoner_Icon_Border.png" },  // Cấp 75 - 99
        { maxLevel: 449,  src: "images/frame/Level_425_Summoner_Icon_Border.png" },  // Cấp 75 - 99
        { maxLevel: 474,  src: "images/frame/Level_450_Summoner_Icon_Border.png" },  // Cấp 75 - 99
        { maxLevel: 499,  src: "images/frame/Level_475_Summoner_Icon_Border.png" },  // Cấp 75 - 99
        { maxLevel: Infinity, src: "images/frame/Level_500_Summoner_Icon_Border.png" } // Cấp 100 trở lên
    ];

// Xử lý chuyển tab cho LoL-style nav (Đã tối ưu đồng bộ Desktop & Mobile)
    document.querySelectorAll('.lol-nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-target');
        if (!target) return;

        // Xóa class active khỏi TẤT CẢ các nút tab (cả bản desktop lẫn mobile)
        document.querySelectorAll('.lol-nav-tab').forEach(t => t.classList.remove('active'));
        
        // Bật active cho tất cả các nút có cùng data-target (giúp đồng bộ cả 2 giao diện)
        document.querySelectorAll('.lol-nav-tab[data-target="' + target + '"]').forEach(t => t.classList.add('active'));
        
        // Ẩn tất cả các khối nội dung tab
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
        });
        
        // Hiện chính xác nội dung của tab vừa click
        var targetContent = document.getElementById(target);
        if (targetContent) {
            targetContent.classList.add('active');
        }
        
        // Re-render icons nếu dùng Lucide
        if (window.lucide) lucide.createIcons();
      });
    });
    
    // ===== STAT CONFIG =====
    var statConfig = [
        { key: 'str', icon: '⚔️', label: 'STR', color: '#ff6b6b' },
        { key: 'agi', icon: '🪽', label: 'AGI', color: '#4ecdc4' },
        { key: 'int', icon: '🧠', label: 'INT', color: '#45b7d1' },
        { key: 'vit', icon: '❤️', label: 'VIT', color: '#f9ca24' },
        { key: 'lck', icon: '🍀', label: 'LCK', color: '#a0d2eb' }
    ];
    
 // ===== RENDER STATS (Dạng Vòng Tròn - Circular Progress) =====
    function renderStats(stats) {
        var container = _getEl('stats-container');
        if (!container || !stats) return;
        
        var html = '';
        for (var i = 0; i < statConfig.length; i++) {
            var cfg = statConfig[i];
            var stat = stats[cfg.key] || { level: 1, exp: 0, multiplier: 1.0 };
            var progress = (typeof State !== 'undefined' && State.getStatExpProgress) 
                ? State.getStatExpProgress(cfg.key) 
                : 0;
            
            // Xử lý hiển thị hệ số nhân (nếu > 1)
            var mult = stat.multiplier || 1.0;
            var multHtml = mult > 1.0 ? ' <span class="stat-mult">x' + mult.toFixed(1) + '</span>' : '';
            
            // 💡 Dùng CSS Variables (--progress, --stat-color) để truyền dữ liệu cho CSS vẽ vòng tròn
            html += '<div class="stat-card circular-card" id="stat-' + cfg.key + '" title="Click để nâng cấp hệ số EXP" style="--progress: ' + progress + '%; --stat-color: ' + cfg.color + ';">' +
                '<div class="stat-inner">' +
                    '<span class="stat-icon">' + cfg.icon + '</span>' +
                    '<div class="stat-label-small">' + cfg.label + multHtml + '</div>' +
                    '<div class="stat-value">Lv.' + stat.level + '</div>' +
                '</div>' +
                '</div>';
        }
        container.innerHTML = html;
    }
    
    // ===== RENDER XP BAR (character level system) =====
    function renderXP(level, currentExp, threshold, progressPercent) {
        var statsEl = _getEl('stats');
        if (!statsEl) return;
        
        var nextThreshold = (threshold === Infinity || threshold === undefined) ? 'MAX' : threshold;
        var allocPoints = (typeof State !== 'undefined' && State.getAllocPoints) ? State.getAllocPoints() : 0;
        
        statsEl.innerHTML = 
            '<p><span class="stat-label">Level:</span> <span class="stat-value">' + level + '</span></p>' +
            '<p><span class="stat-label">EXP:</span> <span class="stat-value">' + currentExp + ' / ' + nextThreshold + '</span></p>' +
            '<div class="progress-bar"><div class="progress-fill" style="width:' + progressPercent + '%"></div></div>' +
            '<p class="alloc-points-hint" style="margin-top:0.5rem;font-size:0.8rem;color:#a0a0b0">' +
                '💡 Click vào stat để dùng <span id="alloc-points" class="' + (allocPoints > 0 ? 'highlight' : '') + '">' + 
                allocPoints + '</span> điểm phân bổ' +
            '</p>';
    }
    
    // ===== RENDER AVATAR FRAME (Đổi khung LoL theo Level) =====
    function renderAvatarFrame(currentLevel) {
        var frameEl = _getEl('userFrame'); // Tận dụng hàm cache DOM có sẵn của bạn
        if (!frameEl) return;

        // Tìm khung phù hợp với level hiện tại
        var matchedFrame = null;
        for (var i = 0; i < avatarFrames.length; i++) {
            if (currentLevel <= avatarFrames[i].maxLevel) {
                matchedFrame = avatarFrames[i];
                break;
            }
        }

        // Nếu tìm thấy và link ảnh khác link hiện tại thì mới cập nhật (Tránh nạp lại ảnh liên tục)
        if (matchedFrame && frameEl.getAttribute('src') !== matchedFrame.src) {
            frameEl.setAttribute('src', matchedFrame.src);
        }
    }
    
    // ===== RENDER ALL (batch render để tránh nhấp nháy) =====
    function renderAll() {
        if (typeof State === 'undefined') return;
        var user = State.getUser();
        renderStats(user.stats);
        renderXP(user.characterLevel, user.totalExp, State.getTotalExpThreshold(), State.getTotalExpProgress());
        
    }
    
    // ✅ MỚI: Render Radar Chart
    function renderRadarChart(user) {
        var container = _getEl('radar-container');
        if (!container || !user || typeof Chart === 'undefined') return;
        
        // Gọi hàm vẽ từ chart.js và bơm HTML vào container
        container.innerHTML ='<div class="radar-title">📊 Chỉ số cơ bản</div>' + Chart.renderRadar(user.stats || user);
    }
    
    // ===== BADGES =====
    function renderBadges(userBadges) {
        var container = _getEl('badges-container');
        if (!container) return;
        
        // Safety check: nếu Reward chưa sẵn, hiển thị placeholder
        if (typeof Reward === 'undefined' || !Reward.getAllBadgesWithStatus) {
            container.innerHTML = '<div class="empty-state">🔄 Đang tải...</div>';
            return;
        }
        
        var allBadges = Reward.getAllBadgesWithStatus(userBadges || []);
        var html = '';
        for (var i = 0; i < allBadges.length; i++) {
            var b = allBadges[i];
            html += '<div class="badge-card ' + (b.unlocked ? 'unlocked' : 'locked') + '" title="' + (b.unlocked ? 'Đã mở khóa' : 'Chưa đạt') + '">' +
                '<span class="badge-icon">' + b.icon + '</span>' +
                '<div class="badge-name">' + b.name + '</div>' +
                '</div>';
        }
        container.innerHTML = html || '<div class="empty-state">🔒 Chưa mở badge nào</div>';
    }
    
    // ===== TOAST NOTIFICATION =====
    function showToast(message, type) {
        var container = _getEl('toast-container');
        if (!container) return;
        
        // Config mặc định + fallback nếu Reward chưa sẵn
        var defaultCfg = {
            levelup: { msg: 'Lên cấp mới!', icon: '🎉', duration: 3500, cls: 'levelup' },
            badge: { msg: 'Mở khóa thành tựu!', icon: '🏆', duration: 3000, cls: 'badge' },
            streak: { msg: 'Duy trì streak!', icon: '🔥', duration: 2500, cls: 'streak' },
            success: { msg: 'Hoàn thành!', icon: '✅', duration: 2000, cls: 'success' }
        };
        var config = (typeof Reward !== 'undefined' && Reward.getToastConfig) 
            ? Reward.getToastConfig(type) 
            : (defaultCfg[type] || defaultCfg.success);
        
        var toast = document.createElement('div');
        toast.className = 'toast ' + config.cls;
        toast.innerHTML = '<span class="toast-icon">' + config.icon + '</span><span>' + (config.msg || message) + '</span>';
        
        container.appendChild(toast);
        
        // Auto hide với cleanup an toàn
        var duration = config.duration || 3000;
        setTimeout(function() {
            toast.classList.add('hide');
            setTimeout(function() {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }
    
    // ===== LEVEL UP ANIMATION =====
    function showLevelUpAnimation(newLevel, title) {
        var overlay = _getEl('levelup-overlay');
        if (!overlay) return;
        
        var levelSpan = _getEl('levelup-new-level');
        var titleSpan = _getEl('levelup-title-text');
        
        if (levelSpan) levelSpan.textContent = newLevel;
        if (titleSpan) titleSpan.textContent = title || '';
        
        // Hiển thị overlay với animation
        overlay.classList.remove('hidden');
        void overlay.offsetWidth; // Force reflow để CSS transition hoạt động
        overlay.classList.add('active');
        
        // Setup close button
        var closeBtn = _getEl('close-levelup');
        var closeHandler = function() {
            overlay.classList.remove('active');
            setTimeout(function() { overlay.classList.add('hidden'); }, 300);
            if (closeBtn) closeBtn.removeEventListener('click', closeHandler);
        };
        if (closeBtn) {
            closeBtn.addEventListener('click', closeHandler);
        }
        
        // Auto close sau 4 giây
        setTimeout(function() {
            if (overlay.classList.contains('active')) {
                overlay.classList.remove('active');
                setTimeout(function() { overlay.classList.add('hidden'); }, 300);
            }
        }, 4000);
    }

    // ===== MOBILE MENU TOGGLE LOGIC =====
(function initMobileMenu() {
  var toggle = document.getElementById('mobile-menu-toggle');
  var dropdown = document.getElementById('mobile-tabs-dropdown');
  
  if (!toggle || !dropdown) return;
  
  // 1. Bấm nút menu → mở/đóng dropdown
  toggle.addEventListener('click', function(e) {
    e.stopPropagation();
    dropdown.classList.toggle('active');
    
    // Đổi icon menu ↔ close
    var icon = toggle.querySelector('.menu-icon');
    if (dropdown.classList.contains('active')) {
      icon.setAttribute('data-lucide', 'x');
    } else {
      icon.setAttribute('data-lucide', 'menu');
    }
    if (window.lucide) lucide.createIcons();
  });
  
  // 2. Bấm vào tab trong dropdown → chuyển tab + đóng menu
  dropdown.querySelectorAll('.mobile-tab-item').forEach(function(tab) {
    tab.addEventListener('click', function() {
      // Cập nhật active state cho cả desktop tabs (để đồng bộ)
      document.querySelectorAll('.lol-nav-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      var desktopTab = document.querySelector('.nav-tabs-container .lol-nav-tab[data-target="' + tab.dataset.target + '"]');
      if (desktopTab) desktopTab.classList.add('active');
      
      // Chuyển content
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      var target = tab.getAttribute('data-target');
      document.getElementById(target)?.classList.add('active');
      
      // Đóng dropdown + reset icon
      dropdown.classList.remove('active');
      var icon = toggle.querySelector('.menu-icon');
      icon.setAttribute('data-lucide', 'menu');
      if (window.lucide) lucide.createIcons();
    });
  });
  
  // 3. Bấm ra ngoài → đóng dropdown
  document.addEventListener('click', function(e) {
    if (dropdown.classList.contains('active') && 
        !dropdown.contains(e.target) && 
        !toggle.contains(e.target)) {
      dropdown.classList.remove('active');
      var icon = toggle.querySelector('.menu-icon');
      icon.setAttribute('data-lucide', 'menu');
      if (window.lucide) lucide.createIcons();
    }
  });
})();
    
    // ===== PUBLIC API =====
    return {
        renderStats: renderStats,
        renderXP: renderXP,
        renderAll: renderAll,
        renderRadarChart: renderRadarChart,
        renderBadges: renderBadges,
        showToast: showToast,
        showLevelUpAnimation: showLevelUpAnimation,
        renderAvatarFrame: renderAvatarFrame
    };

})();