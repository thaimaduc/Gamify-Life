/* main.js - Phase 7.0 (Dynamic Shop) */
(function() {
    'use strict';
    
    // ===== DOM CACHE =====
    var els = {};
    
    function cacheDOM() {
        els = {
            questList: document.getElementById('quest-list'),
            streakValue: document.getElementById('streak-value'),
            userTitle: document.getElementById('user-title'),
            closeLevelup: document.getElementById('close-levelup'),
            questForm: document.getElementById('quest-form'),
            questTitleInput: document.getElementById('quest-title'),
            questDiffSelect: document.getElementById('quest-difficulty'),
            toastContainer: document.getElementById('toast-container'),
            levelupOverlay: document.getElementById('levelup-overlay'),
            allocPointsDisplay: document.getElementById('alloc-points'),
            radarContainer: document.getElementById('radar-container'),
            goldDisplay: document.getElementById('gold-display'),
            navGoldDisplay: document.getElementById('nav-gold-display'),
            shopList: document.getElementById('shop-list'),
            shopFormAdd: document.getElementById('shop-form-add'), // 💡 MỚI
            habitList: document.getElementById('habit-list'),
            habitForm: document.getElementById('habit-form'),
            habitTitleInput: document.getElementById('habit-title'),
            habitDiffSelect: document.getElementById('habit-difficulty'),
            inventoryList: document.getElementById('inventory-list')
        };
    }
    
    // ===== STAT MAP =====
    var statMap = {
        str: { icon: '⚔️', label: 'STR', color: '#ff6b6b' },
        agi: { icon: '🪽', label: 'AGI', color: '#4ecdc4' },
        int: { icon: '🧠', label: 'INT', color: '#45b7d1' },
        vit: { icon: '❤️', label: 'VIT', color: '#f9ca24' },
        lck: { icon: '🍀', label: 'LCK', color: '#a0d2eb' }
    };
    
    // ===== RENDER BATCH =====
    function renderAllUI() {
        var user = State.getUser();
        
        UI.renderStats(user.stats);
        UI.renderXP(user.characterLevel, user.totalExp, State.getTotalExpThreshold(), State.getTotalExpProgress());
        UI.renderRadarChart(user.stats);
        UI.renderAvatarFrame(user.characterLevel);
        
        if (els.allocPointsDisplay) {
            els.allocPointsDisplay.textContent = user.allocPoints;
            els.allocPointsDisplay.className = user.allocPoints > 0 ? 'highlight' : '';
        }
        
        // 🛠️ SỬA KHU VỰC NÀY: Bọc hàm formatGold vào trước số tiền
        var goldString = formatGold(user.gold);
        
        if (els.goldDisplay) els.goldDisplay.textContent = goldString;       /* Tiền ở Chợ Đen */
        if (els.navGoldDisplay) els.navGoldDisplay.textContent = goldString; /* Tiền trên Nav PC */
        if (els.mobileGoldDisplay) els.mobileGoldDisplay.textContent = goldString; /* Tiền trong Menu Mobile (Nếu dùng Cách 3) */
        
        UI.renderBadges(State.getBadges());
        renderQuestList();
        renderShop(); // 💡 Render Shop động
        renderHabits(); // 🔁 Render Habits
        renderInventory(); // 🎒 Render Inventory
        
        if (els.streakValue) els.streakValue.textContent = State.getStreak();
        if (els.userTitle) els.userTitle.textContent = Reward.getTitleByLevel(user.characterLevel);
    }
    
    // ===== INIT =====
    function init() {
        console.log('🚀 App initializing (Phase 7.0: Dynamic Shop)...');
        cacheDOM();
        if (typeof State === 'undefined' || typeof UI === 'undefined') return;
        
        State.load();
        Quest.load();
        
        if(typeof Quest.checkDailyResets === 'function') Quest.checkDailyResets(); 
        
        renderAllUI();
        setupEventListeners();
    }
    
    // ===== RENDER QUEST LIST =====
    function renderQuestList() {
        if (!els.questList) return;
        var quests = Quest.getAll();
        
        if (quests.length === 0) {
            els.questList.innerHTML = '<li class="empty-state">📭 Bảng nhiệm vụ đang trống. Nhận việc đi nào!</li>';
            return;
        }
        
        var dailyQuests = quests.filter(function(q) { return q.type === 'daily'; });
        var adhocQuests = quests.filter(function(q) { return q.type !== 'daily'; });
        var html = '';
        
        function renderGroup(title, groupQuests, icon) {
            if (groupQuests.length === 0) return '';
            var groupHtml = '<div class="quest-category-title">' + icon + ' ' + title + '</div>';
            for (var i = 0; i < groupQuests.length; i++) {
                var q = groupQuests[i];
                var reward = Quest.calcReward(q.difficulty);
                var statsArray = q.statTypes || [q.statType]; 
                var statBadgesHtml = '';
                for (var j = 0; j < statsArray.length; j++) {
                    var stName = statsArray[j];
                    var st = statMap[stName] || { icon: '?', label: stName, color: '#aaa' };
                    statBadgesHtml += '<span class="quest-stat-badge" style="background:' + st.color + '20;color:' + st.color + '">' + 
                                      st.icon + ' ' + st.label + '</span>';
                }
                groupHtml += '<li class="quest-card ' + (q.done ? 'done' : '') + '" data-id="' + q.id + '">' +
                    '<div class="quest-header">' +
                        '<span class="quest-title">' + escapeHtml(q.title) + '</span>' +
                        '<div class="quest-meta">' + statBadgesHtml +
                            '<span class="quest-difficulty-badge ' + q.difficulty + '">' + capitalize(q.difficulty) + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="quest-reward">+' + reward.baseExp + ' EXP | +' + (reward.gold || 0) + ' 💰</div>' +
                    '<div class="quest-actions">' +
                        '<button class="btn-complete" data-id="' + q.id + '"' + (q.done ? ' disabled' : '') + '>✅ ' + (q.done ? 'Đã xong' : 'Hoàn thành') + '</button>' +
                        '<button class="btn-delete" data-id="' + q.id + '">🗑️</button>' +
                    '</div>' +
                '</li>';
            }
            return groupHtml;
        }
        
        html += renderGroup('Nhiệm vụ Hàng ngày', dailyQuests, '🔁');
        html += renderGroup('Nhiệm vụ 1 Lần', adhocQuests, '🎯');
        els.questList.innerHTML = html;
    }

    // ===== 💡 RENDER SHOP ĐỘNG =====
    function renderShop() {
        if (!els.shopList) return;
        var items = State.getShopItems();
        var html = '';
        
        if (items.length === 0) {
            html = '<li class="empty-state">🏪 Cửa hàng đang trống. Hãy thêm món mới ở phía trên!</li>';
        }

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            html += '<li class="quest-card" style="flex-direction: row; justify-content: space-between; align-items: center; border-left-color: #facc15;">' +
                        '<div style="display: flex; align-items: center; gap: 1rem;">' +
                            '<span style="font-size: 2rem;">' + item.icon + '</span>' +
                            '<div>' +
                                '<div style="font-weight: bold; font-size: 1rem; color: #eaeaea;">' + escapeHtml(item.name) + '</div>' +
                                '<div style="font-size: 0.85rem; color: #facc15;">Giá: ' + item.price + ' 💰</div>' +
                            '</div>' +
                        '</div>' +
                        '<div style="display: flex; gap: 8px;">' +
                            '<button class="btn-buy-item" data-price="' + item.price + '" data-name="' + escapeHtml(item.name) + '" data-icon="' + escapeHtml(item.icon) + '" ' +
                                'style="background: #facc15; color: #1a1a2e; font-weight: bold; padding: 0.5rem 1rem; border: none; border-radius: 6px; cursor: pointer; white-space: nowrap;">' +
                                'Mua' +
                            '</button>' +
                            '<button class="btn-delete-shop" data-id="' + item.id + '" title="Xóa vật phẩm" ' +
                                'style="background: rgba(255,255,255,0.05); color: #fff; padding: 0.5rem; border: none; border-radius: 6px; cursor: pointer; filter: grayscale(1);">🗑️</button>' +
                        '</div>' +
                    '</li>';
        }
        els.shopList.innerHTML = html;
    }

    // ===== 🔁 RENDER THÓI QUEN =====
    function renderHabits() {
        if (!els.habitList) return;
        var habits = State.getHabits();
        var html = '';
        
        if (habits.length === 0) {
            els.habitList.innerHTML = '<li class="empty-state">🔁 Chưa có thói quen nào được thiết lập. Hãy tạo thói quen ở trên!</li>';
            return;
        }

        for (var i = 0; i < habits.length; i++) {
            var h = habits[i];
            var reward = Quest.calcReward(h.difficulty);
            var statsArray = h.statTypes || []; 
            var statBadgesHtml = '';
            for (var j = 0; j < statsArray.length; j++) {
                var stName = statsArray[j];
                var st = statMap[stName] || { icon: '?', label: stName, color: '#aaa' };
                statBadgesHtml += '<span class="quest-stat-badge" style="background:' + st.color + '20;color:' + st.color + '">' + 
                                  st.icon + ' ' + st.label + '</span>';
            }
            html += '<li class="quest-card" style="border-left-color: #00d4aa;" data-id="' + h.id + '">' +
                '<div class="quest-header">' +
                    '<span class="quest-title">' + escapeHtml(h.title) + '</span>' +
                    '<div class="quest-meta">' + statBadgesHtml +
                        '<span class="quest-difficulty-badge ' + h.difficulty + '">' + capitalize(h.difficulty) + '</span>' +
                        '<span class="quest-stat-badge" style="background: rgba(0, 212, 170, 0.1); color: #00d4aa; font-weight: bold;">🔥 Đã làm: ' + (h.count || 0) + ' lần</span>' +
                    '</div>' +
                '</div>' +
                '<div class="quest-reward">+' + reward.baseExp + ' EXP | +' + (reward.gold || 0) + ' 💰</div>' +
                '<div class="quest-actions">' +
                    '<button class="btn-check-habit btn-complete" data-id="' + h.id + '">➕ Check-in</button>' +
                    '<button class="btn-delete-habit btn-delete" data-id="' + h.id + '">🗑️</button>' +
                '</div>' +
            '</li>';
        }
        els.habitList.innerHTML = html;
    }

    // ===== 🎒 RENDER KHO ĐỒ =====
    function renderInventory() {
        if (!els.inventoryList) return;
        var inventory = State.getInventory();
        var html = '';
        
        if (inventory.length === 0) {
            els.inventoryList.innerHTML = '<li class="empty-state">🎒 Kho đồ trống rỗng. Hãy chăm chỉ làm việc kiếm tiền sắm đồ nhé!</li>';
            return;
        }

        for (var i = 0; i < inventory.length; i++) {
            var item = inventory[i];
            html += '<li class="quest-card" style="flex-direction: row; justify-content: space-between; align-items: center; border-left-color: #a855f7;" data-id="' + item.id + '">' +
                        '<div style="display: flex; align-items: center; gap: 1rem;">' +
                            '<span style="font-size: 2rem;">' + escapeHtml(item.icon) + '</span>' +
                            '<div>' +
                                '<div style="font-weight: bold; font-size: 1rem; color: #eaeaea;">' + escapeHtml(item.name) + '</div>' +
                                '<div style="font-size: 0.8rem; color: #a0a0b0;">Mua lúc: ' + new Date(item.purchasedAt).toLocaleString('vi-VN') + '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div style="display: flex; gap: 8px;">' +
                            '<button class="btn-use-item" data-id="' + item.id + '" data-name="' + escapeHtml(item.name) + '" ' +
                                'style="background: #a855f7; color: #fff; font-weight: bold; padding: 0.5rem 1rem; border: none; border-radius: 6px; cursor: pointer; white-space: nowrap;">' +
                                'Sử dụng' +
                            '</button>' +
                        '</div>' +
                    '</li>';
        }
        els.inventoryList.innerHTML = html;
    }
    
    // ===== EVENT LISTENERS =====
    function setupEventListeners() {
        
        // 💡 Xử lý Submit Form Cửa Hàng
        if (els.shopFormAdd) {
            els.shopFormAdd.addEventListener('submit', function(e) {
                e.preventDefault();
                var name = document.getElementById('new-item-name').value.trim();
                var price = document.getElementById('new-item-price').value;
                var icon = document.getElementById('new-item-icon').value;
                
                if (name && price) {
                    State.addShopItem(name, price, icon);
                    renderAllUI(); // Render lại mà không cần tải lại trang
                    els.shopFormAdd.reset();
                    document.getElementById('new-item-icon').value = '🎁';
                    UI.showToast('✅ Đã thêm "' + name + '" vào chợ đen!', 'success');
                }
            });
        }

        // Xử lý Giao Nhiệm vụ
        if (els.questForm) {
            els.questForm.addEventListener('submit', function(e) {
                e.preventDefault();
                var title = els.questTitleInput.value.trim();
                var diff = els.questDiffSelect.value;
                var typeEl = document.getElementById('quest-type');
                var type = typeEl ? typeEl.value : 'adhoc';
                
                var statCheckboxes = document.querySelectorAll('#quest-stat-toggles input:checked');
                var statsArray = [];
                for (var k = 0; k < statCheckboxes.length; k++) {
                    statsArray.push(statCheckboxes[k].value);
                }
                if (statsArray.length === 0) statsArray = ['str'];
                
                if (title) {
                    Quest.add(title, statsArray, diff, type);
                    renderAllUI();
                    els.questTitleInput.value = '';
                    UI.showToast('✨ Nhiệm vụ đã được giao!', 'success');
                }
            });
        }
        
        // Xử lý Click trên Bảng Nhiệm Vụ
        if (els.questList) {
            els.questList.addEventListener('click', function(e) {
                var target = e.target;
                var card = target.closest('.quest-card');
                if (!card) return;
                var questId = parseInt(card.dataset.id);
                if (isNaN(questId)) return;
                
                if (target.classList.contains('btn-complete')) completeQuest(questId);
                if (target.classList.contains('btn-delete')) {
                    Quest.remove(questId);
                    renderAllUI();
                    UI.showToast('🗑️ Đã hủy nhiệm vụ', 'success');
                }
            });
        }
        
        // Đóng Level Up Modal
        if (els.closeLevelup && els.levelupOverlay) {
            els.closeLevelup.addEventListener('click', function() {
                els.levelupOverlay.classList.remove('active');
                setTimeout(function() { els.levelupOverlay.classList.add('hidden'); }, 300);
            });
        }
        
        // Tăng hệ số Stats
        var statsContainer = document.getElementById('stats-container');
        if (statsContainer) {
            statsContainer.addEventListener('click', function(e) {
                var statCard = e.target.closest('.stat-card');
                if (!statCard) return;
                var statName = statCard.id.replace('stat-', '');
                var user = State.getUser();
                if (user.allocPoints > 0) {
                    var result = State.spendAllocPoint(statName);
                    if (result.success) {
                        renderAllUI();
                        UI.showToast(statMap[statName].label + ' đã tăng hệ số EXP lên x' + result.newMultiplier + '! 📈', 'success');
                    } else if (result.reason === 'max') {
                        UI.showToast('⚠️ Hệ số nhân đã đạt mức TỐI ĐA (x3.0)!', 'streak');
                    }
                } else {
                    UI.showToast('Chưa có điểm phân bổ!', 'success');
                }
            });
        }

        // Logic Chuyển Tabs
        var navBtns = document.querySelectorAll('.nav-btn');
        var tabContents = document.querySelectorAll('.tab-content');
        if (navBtns.length > 0) {
            navBtns.forEach(function(btn) {
                btn.addEventListener('click', function() {
                    navBtns.forEach(function(b) { b.classList.remove('active'); });
                    tabContents.forEach(function(t) { t.classList.remove('active'); });
                    this.classList.add('active');
                    var targetId = this.getAttribute('data-target');
                    var targetTab = document.getElementById(targetId);
                    if (targetTab) targetTab.classList.add('active');
                });
            });
        }

        // 💡 Logic Mua & Xóa Item Trong Shop
        if (els.shopList) {
            els.shopList.addEventListener('click', function(e) {
                var target = e.target;
                
                if (target.classList.contains('btn-buy-item')) {
                    var price = parseInt(target.getAttribute('data-price'));
                    var name = target.getAttribute('data-name');
                    var icon = target.getAttribute('data-icon');
                    if (State.spendGold(price)) {
                        State.addToInventory(name, price, icon);
                        renderAllUI();
                        UI.showToast('Đã mua: ' + name + ' (-' + price + ' 💰) và cất vào Kho đồ!', 'success');
                    } else {
                        UI.showToast('⚠️ Nghèo quá, đi làm Quest kiếm thêm Vàng đi!', 'streak');
                    }
                }
                
                if (target.classList.contains('btn-delete-shop')) {
                    var id = parseInt(target.getAttribute('data-id'));
                    if (confirm('Bạn có chắc muốn xóa vật phẩm này khỏi cửa hàng không?')) {
                        State.removeShopItem(id);
                        renderAllUI(); // Refresh UI
                        UI.showToast('🗑️ Đã xóa vật phẩm', 'success');
                    }
                }
            });
        }

        // 🔁 Xử lý Thêm Thói quen
        if (els.habitForm) {
            els.habitForm.addEventListener('submit', function(e) {
                e.preventDefault();
                var title = els.habitTitleInput.value.trim();
                var diff = els.habitDiffSelect.value;
                
                var statCheckboxes = document.querySelectorAll('#habit-stat-toggles input:checked');
                var statsArray = [];
                for (var k = 0; k < statCheckboxes.length; k++) {
                    statsArray.push(statCheckboxes[k].value);
                }
                if (statsArray.length === 0) statsArray = ['str'];
                
                if (title) {
                    State.addHabit(title, statsArray, diff);
                    renderAllUI();
                    els.habitTitleInput.value = '';
                    UI.showToast('✨ Thói quen mới đã được thiết lập!', 'success');
                }
            });
        }

        // 🔁 Xử lý Tác vụ trên Bảng Thói quen (Check-in, Xóa)
        if (els.habitList) {
            els.habitList.addEventListener('click', function(e) {
                var target = e.target;
                var card = target.closest('.quest-card');
                if (!card) return;
                var habitId = card.dataset.id;
                
                if (target.classList.contains('btn-check-habit')) {
                    checkHabit(habitId);
                }
                
                if (target.classList.contains('btn-delete-habit')) {
                    if (confirm('Bạn có chắc chắn muốn xóa thói quen này không?')) {
                        State.removeHabit(habitId);
                        renderAllUI();
                        UI.showToast('🗑️ Đã xóa thói quen', 'success');
                    }
                }
            });
        }

        // 🎒 Xử lý Sử dụng Vật phẩm trong Kho đồ
        if (els.inventoryList) {
            els.inventoryList.addEventListener('click', function(e) {
                var target = e.target;
                if (target.classList.contains('btn-use-item')) {
                    var id = target.getAttribute('data-id');
                    var name = target.getAttribute('data-name');
                    if (confirm('Bạn có chắc chắn muốn sử dụng "' + name + '" không?')) {
                        if (State.removeFromInventory(id)) {
                            renderAllUI();
                            UI.showToast('🎉 Đã sử dụng "' + name + '"! Chúc bạn tận hưởng phần thưởng 🥰', 'levelup');
                        }
                    }
                }
            });
        }

        // Logic Backup Data
        var btnExport = document.getElementById('btn-export');
        if (btnExport) {
            btnExport.addEventListener('click', function() {
                var data = State.exportData();
                var blob = new Blob([data], { type: 'application/json' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'GamifyLife_Backup_' + new Date().toISOString().split('T')[0] + '.json';
                a.click();
                URL.revokeObjectURL(url);
                UI.showToast('📥 Đã tải file Backup về máy!', 'success');
            });
        }

        var btnImport = document.getElementById('btn-import');
        var importFile = document.getElementById('import-file');
        if (btnImport && importFile) {
            btnImport.addEventListener('click', function() {
                if (!importFile.files || importFile.files.length === 0) {
                    UI.showToast('⚠️ Vui lòng chọn file JSON trước!', 'streak');
                    return;
                }
                var reader = new FileReader();
                reader.onload = function(e) {
                    if (State.importData(e.target.result)) {
                        alert('Phục hồi dữ liệu thành công! Trang sẽ tải lại.');
                        location.reload();
                    } else {
                        UI.showToast('⚠️ File không hợp lệ hoặc bị lỗi!', 'streak');
                    }
                };
                reader.readAsText(importFile.files[0]);
            });
        }
    }
    
    // ===== COMPLETE QUEST =====
    function completeQuest(questId) {
        var reward = Quest.complete(questId);
        if (!reward) return;
        
        var charResult = State.addTotalExp(reward.baseExp);
        var statsArray = reward.statNames || [reward.statName]; 
        var statCount = statsArray.length;
        var expPerStat = Math.floor(reward.statBonusExp / statCount); 
        
        var goldEarned = reward.gold || 0;
        State.addGold(goldEarned);
        
        var leveledUpStats = [];
        var statToastDetails = [];
        for (var i = 0; i < statCount; i++) {
            var sName = statsArray[i];
            var sRes = State.addStatExp(sName, expPerStat);
            if (sRes.leveledUp) leveledUpStats.push(sName);
            statToastDetails.push(statMap[sName].label + ' +' + (sRes.addedExp || expPerStat));
        }
        
        State.incrementCompletedQuests();
        State.updateLastActive();
        
        var streakResult = Reward.calcStreak(State.getUser().lastActive);
        if (streakResult.reset) State.applyStreak(0);
        else if (streakResult.increment > 0) State.applyStreak(State.getStreak() + streakResult.increment);
        
        renderAllUI();
        
        if (charResult.leveledUp > 0) {
            var msg = charResult.leveledUp > 1 ? '🚀 Lên ' + charResult.leveledUp + ' cấp!' : '🎉 Level Up!';
            UI.showToast(msg + ' +' + charResult.newAllocPoints + ' điểm phân bổ', 'levelup');
            if (charResult.leveledUp === 1) {
                UI.showLevelUpAnimation(charResult.currentLevel, Reward.getTitleByLevel(charResult.currentLevel));
            }
            UI.renderAvatarFrame(charResult.currentLevel);
        }
        
        for (var j = 0; j < leveledUpStats.length; j++) {
            UI.showToast(statMap[leveledUpStats[j]].label + ' lên cấp! ⬆️', 'success');
        }
        
        var newBadges = Reward.checkBadges(State.getUser());
        for (var k = 0; k < newBadges.length; k++) {
            if (State.unlockBadge(newBadges[k].id)) {
                UI.showToast('🏆 ' + newBadges[k].name, 'badge');
            }
        }
        
        UI.showToast('Hoàn thành! +' + reward.baseExp + ' EXP | +' + goldEarned + ' 💰', 'success');
    }

    // ===== CHECK HABIT =====
    function checkHabit(habitId) {
        var habit = State.completeHabit(habitId);
        if (!habit) return;
        
        var reward = Quest.calcReward(habit.difficulty);
        var charResult = State.addTotalExp(reward.baseExp);
        var statsArray = habit.statTypes || ['str']; 
        var statCount = statsArray.length;
        var expPerStat = Math.floor(reward.statBonusExp / statCount); 
        
        var goldEarned = reward.gold || 0;
        State.addGold(goldEarned);
        
        var leveledUpStats = [];
        for (var i = 0; i < statCount; i++) {
            var sName = statsArray[i];
            var sRes = State.addStatExp(sName, expPerStat);
            if (sRes.leveledUp) leveledUpStats.push(sName);
        }
        
        State.updateLastActive();
        
        var streakResult = Reward.calcStreak(State.getUser().lastActive);
        if (streakResult.reset) State.applyStreak(0);
        else if (streakResult.increment > 0) State.applyStreak(State.getStreak() + streakResult.increment);
        
        renderAllUI();
        
        if (charResult.leveledUp > 0) {
            var msg = charResult.leveledUp > 1 ? '🚀 Lên ' + charResult.leveledUp + ' cấp!' : '🎉 Level Up!';
            UI.showToast(msg + ' +' + charResult.newAllocPoints + ' điểm phân bổ', 'levelup');
            if (charResult.leveledUp === 1) {
                UI.showLevelUpAnimation(charResult.currentLevel, Reward.getTitleByLevel(charResult.currentLevel));
            }
            UI.renderAvatarFrame(charResult.currentLevel);
        }
        
        for (var j = 0; j < leveledUpStats.length; j++) {
            UI.showToast(statMap[leveledUpStats[j]].label + ' lên cấp! ⬆️', 'success');
        }
        
        var newBadges = Reward.checkBadges(State.getUser());
        for (var k = 0; k < newBadges.length; k++) {
            if (State.unlockBadge(newBadges[k].id)) {
                UI.showToast('🏆 ' + newBadges[k].name, 'badge');
            }
        }
        
        UI.showToast('Rèn luyện tốt! +' + reward.baseExp + ' EXP | +' + goldEarned + ' 💰', 'success');
    }
    
    // ===== UTILS =====
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(text));
        return div.innerHTML;
    }
    
    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // 🛠️ THÊM HÀM NÀY: Hàm rút gọn số vàng chuẩn Client Game
    function formatGold(num) {
        if (!num || isNaN(num)) return '0';
        
        // Nếu vàng từ 1 Triệu trở lên (Ví dụ: 1.200.000 -> 1.2M)
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        }
        
        // Nếu vàng từ 1 Nghìn trở lên (Ví dụ: 606100 -> 606.1K, 606000 -> 606K)
        if (num >= 1000) {
            return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        }
        
        // Dưới 1000 thì giữ nguyên số gốc
        return num.toString();
    }
    
    // ===== START =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();