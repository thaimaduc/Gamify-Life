/* quest.js - Phase 5.5 (Multi-Stats + Daily Quests) */
var Quest = (function() {
    'use strict';
    
    var quests = [];
    var REWARD_CONFIG = {
        easy:   { baseExp: 25, statBonus: 10 },
        medium: { baseExp: 50, statBonus: 25 },
        hard:   { baseExp: 90, statBonus: 45 }
    };
    
    function load() {
        var saved = Storage.load('gamify_quests');
        quests = Array.isArray(saved) ? saved : [];
    }
    function save() { Storage.save('gamify_quests', quests); }
    
    // 💡 SỬA: Nhận mảng statTypes và thêm thông số type (daily/adhoc)
    function add(title, statTypesArray, difficulty, type) {
        var newQuest = {
            id: Date.now(),
            title: title.trim(),
            statTypes: statTypesArray, // Giờ là Array: ['str', 'int']
            difficulty: difficulty,
            type: type || 'adhoc',     // Loại nhiệm vụ
            done: false,
            createdAt: new Date().toISOString(),
            completedAt: null          // Lưu ngày hoàn thành để tính năng Reset hoạt động
        };
        quests.push(newQuest);
        save();
        return newQuest;
    }
    
    function complete(questId) {
        for (var i = 0; i < quests.length; i++) {
            var q = quests[i];
            if (q.id === questId && !q.done) {
                q.done = true;
                q.completedAt = new Date().toISOString(); // Đánh dấu thời điểm xong
                
                var reward = calcReward(q.difficulty);
                // 💡 SỬA: Trả về mảng statNames hoặc tương thích ngược với statType cũ
                reward.statNames = q.statTypes || [q.statType]; 
                save();
                return reward;
            }
        }
        return null;
    }
    
    function remove(questId) {
        for (var i = 0; i < quests.length; i++) {
            if (quests[i].id === questId) {
                quests.splice(i, 1);
                save();
                return true;
            }
        }
        return false;
    }
    
    function getAll() { return quests.slice(); }
    
    function calcReward(difficulty) {
        var cfg = REWARD_CONFIG[difficulty] || REWARD_CONFIG.easy;
        return { baseExp: cfg.baseExp, statBonusExp: cfg.statBonus };
    }

    // 💡 MỚI: Hàm kiểm tra qua ngày để Reset Daily Quest
    function checkDailyResets() {
        var changed = false;
        var todayString = new Date().toDateString();
        
        for (var i = 0; i < quests.length; i++) {
            var q = quests[i];
            // Nếu là Daily Task và đã làm xong
            if (q.type === 'daily' && q.done && q.completedAt) {
                var compDate = new Date(q.completedAt).toDateString();
                // Nếu ngày hoàn thành khác ngày hôm nay -> Reset về chưa làm!
                if (compDate !== todayString) {
                    q.done = false;
                    q.completedAt = null;
                    changed = true;
                }
            }
        }
        if (changed) save();
    }
    
    return {
        load: load, save: save, add: add, complete: complete, 
        remove: remove, getAll: getAll, calcReward: calcReward,
        checkDailyResets: checkDailyResets // Export hàm
    };
})();