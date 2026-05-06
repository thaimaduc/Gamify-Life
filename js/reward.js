/* Reward module: Gamification logic - streak, badges, level up */
var Reward = (function() {
    'use strict';
    
    // Danh sách badge định nghĩa
    var badgesDef = [
        { id: 'newbie', name: 'Newbie', icon: '🌱', condition: function(u) { return u.level >= 1; }},
        { id: 'hard_worker', name: 'Hard Worker', icon: '⚒️', condition: function(u) { return u.completedQuests >= 10; }},
        { id: 'str_master', name: 'STR Master', icon: '💪', condition: function(u) { return u.str >= 10; }},
        { id: 'int_scholar', name: 'INT Scholar', icon: '🧠', condition: function(u) { return u.int >= 10; }},
        { id: 'streak_7', name: 'Streak 7', icon: '🔥', condition: function(u) { return u.streak >= 7; }},
        { id: 'level_5', name: 'Level 5', icon: '⭐', condition: function(u) { return u.level >= 5; }}
    ];
    
    // Kiểm tra level up
    function checkLevelUp(oldLevel, newLevel) {
        if (newLevel > oldLevel) {
            return {
                levelUp: true,
                newLevel: newLevel,
                title: getTitleByLevel(newLevel)
            };
        }
        return { levelUp: false, newLevel: newLevel, title: '' };
    }
    
    // Tính streak: <24h: giữ nguyên, 24-48h: +1, >48h: reset
    function calcStreak(lastActiveDate) {
        if (!lastActiveDate) return { increment: 1, reset: false };
        
        var last = new Date(lastActiveDate);
        var now = new Date();
        var diffHours = (now - last) / (1000 * 60 * 60);
        
        if (diffHours > 48) return { increment: 0, reset: true };  // Reset về 0
        if (diffHours >= 24) return { increment: 1, reset: false }; // Tăng thêm 1
        return { increment: 0, reset: false }; // Giữ nguyên
    }
    
    // Kiểm tra badge mới mở
    function checkBadges(user) {
        var newBadges = [];
        for (var i = 0; i < badgesDef.length; i++) {
            var badge = badgesDef[i];
            // Kiểm tra điều kiện + chưa có trong badges[]
            if (badge.condition(user) && user.badges.indexOf(badge.id) === -1) {
                newBadges.push(badge);
            }
        }
        return newBadges;
    }
    
    // Tiêu đề theo level
    function getTitleByLevel(level) {
        if (level >= 7) return 'Trưởng Nhóm';
        if (level >= 5) return 'Cao Cấp';
        if (level >= 3) return 'Chính Thức';
        return 'Tập Sự';
    }
    
    // Cấu hình toast
    function getToastConfig(type) {
        var cfg = {
            levelup: { msg: 'Lên cấp mới!', icon: '🎉', duration: 3500, cls: 'levelup' },
            badge: { msg: 'Mở khóa thành tựu!', icon: '🏆', duration: 3000, cls: 'badge' },
            streak: { msg: 'Duy trì streak!', icon: '🔥', duration: 2500, cls: 'streak' },
            success: { msg: 'Hoàn thành!', icon: '✅', duration: 2000, cls: 'success' }
        };
        return cfg[type] || cfg.success;
    }
    
    // Trả badge với status cho UI render
    function getAllBadgesWithStatus(userBadges) {
        return badgesDef.map(function(b) {
            return {
                id: b.id, name: b.name, icon: b.icon,
                unlocked: userBadges.indexOf(b.id) !== -1
            };
        });
    }
    
    return {
        checkLevelUp: checkLevelUp,
        calcStreak: calcStreak,
        checkBadges: checkBadges,
        getTitleByLevel: getTitleByLevel,
        getToastConfig: getToastConfig,
        getAllBadgesWithStatus: getAllBadgesWithStatus
    };
})();