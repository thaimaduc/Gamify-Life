/* state.js - Phase 7.0 (Dynamic Shop System) */
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
    
    // Default schema với hệ thống EXP mới, Tiền tệ & Shop
    var DEFAULTS = { 
        totalExp: 0,
        characterLevel: 1,
        allocPoints: 0,
        gold: 0,
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
        completedQuests: 0,
        habits: [],
        inventory: [],
        // 💡 Khởi tạo Shop mặc định
        shopItems: [
            { id: 1, name: '1 Giờ chơi Game/Giải trí', price: 500, icon: '🎮' },
            { id: 2, name: 'Mua 1 ly Trà Sữa/Cà phê', price: 300, icon: '🧋' },
            { id: 3, name: 'Lướt MXH vô tri 30p', price: 200, icon: '📱' },
            { id: 4, name: 'Xem 1 tập Phim/Anime', price: 250, icon: '🎬' }
        ]
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
            if (saved.gold !== undefined) user.gold = saved.gold;
            
            // Xử lý dữ liệu cũ chuyển đổi (nếu có)
            if (saved.xp !== undefined && saved.totalExp === undefined) {
                user.totalExp = saved.xp;
                user.characterLevel = _calculateLevelFromExp(saved.xp);
            } else if (saved.level !== undefined && saved.characterLevel === undefined) {
                user.characterLevel = saved.level;
            }
            
            var statKeys = ['str','agi','int','vit','lck'];
            for (var i = 0; i < statKeys.length; i++) {
                var key = statKeys[i];
                if (saved.stats && saved.stats[key]) {
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
            // 💡 Load Shop Items (Nếu chưa có thì dùng DEFAULTS)
            if (Array.isArray(saved.shopItems)) user.shopItems = saved.shopItems.slice();
            if (Array.isArray(saved.habits)) user.habits = saved.habits.slice();
            if (Array.isArray(saved.inventory)) user.inventory = saved.inventory.slice();
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
        return JSON.parse(JSON.stringify(user));
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
        if ((stat.multiplier || 1.0) >= 3.0) {
            return { success: false, reason: 'max', current: stat.multiplier };
        }
        
        stat.multiplier = (stat.multiplier || 1.0) + 0.1;
        stat.multiplier = Math.round(stat.multiplier * 10) / 10;
        user.allocPoints -= 1;
        _markSave();
        return { success: true, newMultiplier: stat.multiplier.toFixed(1) };
    }

    // ===== HỆ THỐNG KINH TẾ (VÀNG) =====
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

    // ===== 💡 HỆ THỐNG SHOP ĐỘNG (MỚI) =====
    function getShopItems() {
        return user.shopItems || [];
    }

    function addShopItem(name, price, icon) {
        var newItem = {
            id: Date.now(), // Tạo ID ngẫu nhiên không đụng hàng
            name: name,
            price: parseInt(price) || 0,
            icon: icon || '🎁'
        };
        if (!user.shopItems) user.shopItems = [];
        user.shopItems.push(newItem);
        _markSave();
        return newItem;
    }

    function removeShopItem(id) {
        if (!user.shopItems) return;
        user.shopItems = user.shopItems.filter(function(item) { return item.id !== id; });
        _markSave();
    }

    // ===== HỆ THỐNG THÓI QUEN (HABITS) =====
    function getHabits() {
        return user.habits || [];
    }

    function addHabit(title, statTypesArray, difficulty) {
        if (!user.habits) user.habits = [];
        var newHabit = {
            id: Date.now() + Math.random().toString(36).substr(2, 5),
            title: title.trim(),
            statTypes: statTypesArray,
            difficulty: difficulty,
            count: 0,
            createdAt: new Date().toISOString(),
            lastCompleted: null
        };
        user.habits.push(newHabit);
        _markSave();
        return newHabit;
    }

    function completeHabit(habitId) {
        if (!user.habits) return null;
        for (var i = 0; i < user.habits.length; i++) {
            var h = user.habits[i];
            if (h.id === habitId) {
                h.count = (h.count || 0) + 1;
                h.lastCompleted = new Date().toISOString();
                _markSave();
                return h;
            }
        }
        return null;
    }

    function removeHabit(habitId) {
        if (!user.habits) return false;
        var lenBefore = user.habits.length;
        user.habits = user.habits.filter(function(h) { return h.id !== habitId; });
        var success = user.habits.length < lenBefore;
        if (success) _markSave();
        return success;
    }

    // ===== HỆ THỐNG KHO ĐỒ (INVENTORY) =====
    function getInventory() {
        return user.inventory || [];
    }

    function addToInventory(name, price, icon) {
        if (!user.inventory) user.inventory = [];
        var newItem = {
            id: Date.now() + Math.random().toString(36).substr(2, 5),
            name: name,
            price: price,
            icon: icon || '🎁',
            purchasedAt: new Date().toISOString()
        };
        user.inventory.push(newItem);
        _markSave();
        return newItem;
    }

    function removeFromInventory(id) {
        if (!user.inventory) return false;
        var lenBefore = user.inventory.length;
        user.inventory = user.inventory.filter(function(item) { return item.id !== id; });
        var success = user.inventory.length < lenBefore;
        if (success) _markSave();
        return success;
    }

    // ===== HỆ THỐNG BACKUP DỮ LIỆU =====
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
        addGold: addGold, spendGold: spendGold, 
        getShopItems: getShopItems, addShopItem: addShopItem, removeShopItem: removeShopItem, // 💡 EXPORT SHOP API
        getHabits: getHabits, addHabit: addHabit, completeHabit: completeHabit, removeHabit: removeHabit, // 💡 HABITS API
        getInventory: getInventory, addToInventory: addToInventory, removeFromInventory: removeFromInventory, // 💡 INVENTORY API
        exportData: exportData, importData: importData,
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