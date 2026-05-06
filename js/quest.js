/* quest.js - Phase 5 (New EXP System Compatible)
 * Reward format: { baseExp, statBonusExp, statName }
 * Base EXP cho character level, Bonus EXP cho stat tương ứng
 */
var Quest = (function() {
    'use strict';
    
    var quests = [];
    
    // ===== CONFIG: Cân bằng reward =====
    var REWARD_CONFIG = {
        easy:   { baseExp: 25, statBonus: 10 },   // Nhẹ nhàng, duy trì streak
        medium: { baseExp: 50, statBonus: 25 },   // Task tiêu chuẩn
        hard:   { baseExp: 90, statBonus: 45 }    // Thử thách lớn
    };
    
    function load() {
        var saved = Storage.load('gamify_quests');
        quests = Array.isArray(saved) ? saved : [];
    }
    
    function save() {
        Storage.save('gamify_quests', quests);
    }
    
    function add(title, statType, difficulty) {
        var newQuest = {
            id: Date.now(),
            title: title.trim(),
            statType: statType,
            difficulty: difficulty,
            done: false,
            createdAt: new Date().toISOString()
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
                var reward = calcReward(q.difficulty);
                reward.statName = q.statType; // Gắn stat để state.js biết cộng vào đâu
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
    
    function getAll() {
        return quests.slice(); // Trả bản sao, tránh modify trực tiếp
    }
    
    // Tính reward theo format mới
    function calcReward(difficulty) {
        var cfg = REWARD_CONFIG[difficulty] || REWARD_CONFIG.easy;
        return {
            baseExp: cfg.baseExp,        // Cộng vào character totalExp
            statBonusExp: cfg.statBonus  // Cộng vào stat tương ứng
            // statName sẽ được gán thêm ở hàm complete()
        };
    }
    
    // Public API
    return {
        load: load,
        save: save,
        add: add,
        complete: complete,
        remove: remove,
        getAll: getAll,
        calcReward: calcReward,
        // Export config cho debug
        getRewardConfig: function() { return JSON.parse(JSON.stringify(REWARD_CONFIG)); }
    };
})();