/* state.js - Phase 6.0 (New EXP System + Alloc Points + Economy & Backup) */
var State = (function() {
    'use strict';
    
    // ===== CONSTANTS: Cân bằng game =====
    var CONFIG = {
        MAX_LEVEL: 100,              // Giới hạn level
        BASE_TOTAL_EXP: 100,         // EXP base cho character level 1→2
        TOTAL_EXP_GROWTH: 1.2,       // Hệ số tăng trưởng EXP tổng
        BASE_STAT_EXP: 50,           // EXP base cho stat level 1→2
        STAT_EXP_GROWTH: 30,         // Mỗi stat level tăng thì cần thêm 30 EXP
        ALLOC_POINT_PER_LEVEL: 1     // Điểm phân bổ khi lên cấp character
    };
    
    // Default schema với hệ thống EXP mới & Tiền tệ
    var DEFAULTS = { 
        totalExp: 0,
        characterLevel: 1,
        allocPoints: 0,
        gold: 0,                     // 💡 THÊM: Tiền tệ Vàng
        stats: {
            str: { level: 1, exp: 0, multiplier: 1.0 },
            agi: { level: 1, exp: 0, multiplier: 1.0 },
            int: { level: 1, exp: 0, multiplier: 1.0 },
            vit: { level: 1, exp: 0, multiplier: 1.0 },
            lck: { level: 1, exp: 0, multiplier: 1.0 }
        },
        streak: 0,
        lastActive: null,
        badges: [],
        completedQuests: 0
    };
    
    var user = {};
    var _savePending = false;
    
    function _calcTotalExpThreshold(level) {
        if (level >= CONFIG.MAX_LEVEL) return Infinity;
        return Math.floor(CONFIG.BASE_TOTAL_EXP * Math.pow(CONFIG.TOTAL_EXP_GROWTH, level - 1));
    }
    
    function _calcStatExpThreshold(statLevel) {
        if (statLevel >= CONFIG.MAX_LEVEL) return Infinity;
        return CONFIG.BASE_STAT_EXP + (statLevel * CONFIG.STAT_EXP_GROWTH);
    }
    
    function _calcExpProgress(currentExp, threshold) {
        return Math.min(100, Math.floor((currentExp / threshold) * 100));
    }
    
    function _doSave() {
        if (typeof Storage !== 'undefined' && Storage.save) {
            Storage.save('gamify_user', user);
        }
        _savePending = false;
    }
    
    function _markSave() {
        _savePending = true;
        setTimeout(_doSave, 0);
    }
    
    function load() {
        user = JSON.parse(JSON.stringify(DEFAULTS));
        var saved = (typeof Storage !== 'undefined' && Storage.load) ? Storage.load('gamify_user') : null;
        
        if (saved && typeof saved === 'object') {
            if (saved.totalExp !== undefined) user.totalExp = saved.totalExp;
            if (saved.characterLevel !== undefined) user.characterLevel = saved.characterLevel;
            if (saved.allocPoints !== undefined) user.allocPoints = saved.allocPoints;
            if (saved.gold !== undefined) user.gold = saved.gold; // 💡 Load Vàng

            if (saved.xp !== undefined && saved.totalExp === undefined) {
                user.totalExp = saved.xp;
                user.characterLevel = _calculateLevelFromExp(saved.xp);
            } else if (saved.level !== undefined && saved.characterLevel === undefined) {
                user.characterLevel = saved.level;
            }
            
            var statKeys = ['str','agi','int','vit','lck'];
            for (var i = 0; i < statKeys.length; i++) {
                var key = statKeys[i];
                if (typeof saved[key] === 'number') {
                    var oldVal = saved[key];
                    user.stats[key].level = Math.min(oldVal, CONFIG.MAX_LEVEL);
                    user.stats[key].exp = (oldVal - 1) * 80;
                } else if (saved.stats && saved.stats[key]) {
                    user.stats[key] = {
                        level: Math.min(saved.stats[key].level || 1, CONFIG.MAX_LEVEL),
                        exp: saved.stats[key].exp || 0,
                        multiplier: saved.stats[key].multiplier || 1.0
                    };
                }
            }
            
            if (saved.streak !== undefined) user.streak = saved.streak;
            if (saved.lastActive !== undefined) user.lastActive = saved.lastActive;
            if (Array.isArray(saved.badges)) user.badges = saved.badges.slice();
            if (saved.completedQuests !== undefined) user.completedQuests = saved.completedQuests;
        }
        return user;
    }
    
    function _calculateLevelFromExp(totalExp) {
        var level = 1;
        while (level < CONFIG.MAX_LEVEL) {
            var threshold = _calcTotalExpThreshold(level);
            if (totalExp < threshold) break;
            level++;
        }
        return Math.max(1, level - 1);
    }
    
    function save() { _markSave(); }
    
    function getUser() {
        var copy = {
            totalExp: user.totalExp,
            characterLevel: user.characterLevel,
            allocPoints: user.allocPoints,
            gold: user.gold || 0, // 💡 Kèm Vàng vào User object
            streak: user.streak,
            lastActive: user.lastActive,
            badges: user.badges.slice(),
            completedQuests: user.completedQuests,
            stats: {}
        };
        for (var key in user.stats) {
            copy.stats[key] = {
                level: user.stats[key].level,
                exp: user.stats[key].exp,
                multiplier: user.stats[key].multiplier || 1.0
            };
        }
        return copy;
    }
    
    function addTotalExp(amount) {
        if (user.characterLevel >= CONFIG.MAX_LEVEL) {
            return { leveledUp: 0, newAllocPoints: 0, currentLevel: CONFIG.MAX_LEVEL };
        }
        user.totalExp += amount;
        var leveledUp = 0;
        var newAllocPoints = 0;
        
        while (user.characterLevel < CONFIG.MAX_LEVEL) {
            var threshold = _calcTotalExpThreshold(user.characterLevel);
            if (user.totalExp >= threshold) {
                user.totalExp -= threshold;
                user.characterLevel += 1;
                leveledUp++;
                newAllocPoints += CONFIG.ALLOC_POINT_PER_LEVEL;
            } else {
                break;
            }
        }
        
        if (leveledUp > 0) {
            user.allocPoints += newAllocPoints;
            _markSave();
        }
        return { leveledUp: leveledUp, newAllocPoints: newAllocPoints, currentLevel: user.characterLevel, remainingExp: user.totalExp };
    }
    
    function addStatExp(statName, amount) {
        var validStats = ['str','agi','int','vit','lck'];
        if (validStats.indexOf(statName) === -1 || !user.stats[statName]) {
            return { leveledUp: false, newLevel: null };
        }
        
        var stat = user.stats[statName];
        if (stat.level >= CONFIG.MAX_LEVEL) {
            return { leveledUp: false, newLevel: CONFIG.MAX_LEVEL, remainingExp: stat.exp };
        }
        
        var mult = stat.multiplier || 1.0;
        var finalAmount = Math.floor(amount * mult);
        stat.exp += finalAmount;
        
        var leveledUp = false;
        var threshold = _calcStatExpThreshold(stat.level);
        
        if (stat.exp >= threshold && stat.level < CONFIG.MAX_LEVEL) {
            stat.exp -= threshold; 
            stat.level += 1;
            leveledUp = true;
            _markSave();
        }
        return { leveledUp: leveledUp, newLevel: stat.level, remainingExp: stat.exp, addedExp: finalAmount };
    }
    
    function spendAllocPoint(statName) {
        if (user.allocPoints <= 0) return { success: false };
        var validStats = ['str','agi','int','vit','lck'];
        if (validStats.indexOf(statName) === -1) return { success: false };
        
        var stat = user.stats[statName];
        
        // 💡 VÁ LỖI LẠM PHÁT: Giới hạn multiplier max = 3.0
        if ((stat.multiplier || 1.0) >= 3.0) {
            return { success: false, reason: 'max', current: stat.multiplier };
        }
        
        stat.multiplier = (stat.multiplier || 1.0) + 0.1;
        
        // Đảm bảo không bị lỗi dấu phẩy động (VD: 3.0000000004)
        stat.multiplier = Math.round(stat.multiplier * 10) / 10;
        
        user.allocPoints -= 1;
        _markSave();
        return { success: true, newMultiplier: stat.multiplier.toFixed(1) };
    }

    // ===== 💡 HỆ THỐNG KINH TẾ (VÀNG) =====
    function addGold(amount) {
        user.gold = (user.gold || 0) + amount;
        _markSave();
        return user.gold;
    }

    function spendGold(amount) {
        if ((user.gold || 0) >= amount) {
            user.gold -= amount;
            _markSave();
            return true;
        }
        return false;
    }

    // ===== 💡 HỆ THỐNG BACKUP DỮ LIỆU =====
    function exportData() {
        return JSON.stringify(getUser());
    }

    function importData(jsonString) {
        try {
            var data = JSON.parse(jsonString);
            if (data && data.stats && data.characterLevel) {
                user = data;
                _markSave();
                return true;
            }
        } catch(e) { console.error("Lỗi Import:", e); }
        return false;
    }
    
    function getTotalExpThreshold() { return _calcTotalExpThreshold(user.characterLevel); }
    function getTotalExpProgress() { return _calcExpProgress(user.totalExp, _calcTotalExpThreshold(user.characterLevel)); }
    function getStatExpThreshold(statName) { return user.stats[statName] ? _calcStatExpThreshold(user.stats[statName].level) : 0; }
    function getStatExpProgress(statName) { return user.stats[statName] ? _calcExpProgress(user.stats[statName].exp, _calcStatExpThreshold(user.stats[statName].level)) : 0; }
    function getAllocPoints() { return user.allocPoints; }
    function getCharacterLevel() { return user.characterLevel; }
    function getStatLevel(statName) { return user.stats[statName] ? user.stats[statName].level : 1; }
    function getStatExp(statName) { return user.stats[statName] ? user.stats[statName].exp : 0; }
    function updateLastActive() { user.lastActive = new Date().toISOString(); _markSave(); }
    function applyStreak(val) { user.streak = val; _markSave(); }
    function unlockBadge(badgeId) {
        if (!badgeId || typeof badgeId !== 'string') return false;
        if (user.badges.indexOf(badgeId) === -1) {
            user.badges.push(badgeId); _markSave(); return true;
        }
        return false;
    }
    function getBadges() { return user.badges.slice(); }
    function getStreak() { return user.streak; }
    function incrementCompletedQuests() { user.completedQuests += 1; _markSave(); }
    function getCONFIG() { return JSON.parse(JSON.stringify(CONFIG)); }
    
    return {
        load: load, save: save, getUser: getUser,
        addTotalExp: addTotalExp, addStatExp: addStatExp, spendAllocPoint: spendAllocPoint,
        addGold: addGold, spendGold: spendGold, exportData: exportData, importData: importData, // 💡 EXPORT CÁC HÀM MỚI
        getTotalExpThreshold: getTotalExpThreshold, getTotalExpProgress: getTotalExpProgress,
        getStatExpThreshold: getStatExpThreshold, getStatExpProgress: getStatExpProgress,
        getAllocPoints: getAllocPoints, getCharacterLevel: getCharacterLevel,
        getStatLevel: getStatLevel, getStatExp: getStatExp,
        updateLastActive: updateLastActive, applyStreak: applyStreak,
        unlockBadge: unlockBadge, getBadges: getBadges,
        getStreak: getStreak, incrementCompletedQuests: incrementCompletedQuests,
        CONFIG: CONFIG, getCONFIG: getCONFIG, _calcTotalExpThreshold: _calcTotalExpThreshold
    };
})();