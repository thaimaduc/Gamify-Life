/* quest.js - Phase 6.0 (Economy & Quests) */
var Quest = (function() {
    'use strict';
    
    var quests = [];
    var REWARD_CONFIG = {
        easy:   { baseExp: 25, statBonus: 10, gold: 10 },  // 💡 THÊM VÀNG
        medium: { baseExp: 50, statBonus: 25, gold: 30 },
        hard:   { baseExp: 90, statBonus: 45, gold: 600000 }
    };
    
    function load() {
        var saved = Storage.load('gamify_quests');
        quests = Array.isArray(saved) ? saved : [];
    }
    function save() { Storage.save('gamify_quests', quests); }
    
    function add(title, statTypesArray, difficulty, type) {
        var newQuest = {
            id: Date.now(),
            title: title.trim(),
            statTypes: statTypesArray,
            difficulty: difficulty,
            type: type || 'adhoc',
            done: false,
            createdAt: new Date().toISOString(),
            completedAt: null
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
                q.completedAt = new Date().toISOString();
                
                var reward = calcReward(q.difficulty);
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
        // 💡 TRẢ VỀ CẢ VÀNG
        return { baseExp: cfg.baseExp, statBonusExp: cfg.statBonus, gold: cfg.gold };
    }

    function checkDailyResets() {
        var changed = false;
        var todayString = new Date().toDateString();
        
        for (var i = 0; i < quests.length; i++) {
            var q = quests[i];
            if (q.type === 'daily' && q.done && q.completedAt) {
                var compDate = new Date(q.completedAt).toDateString();
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
        checkDailyResets: checkDailyResets
    };
})();