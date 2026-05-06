/* main.js - Phase 5.5 (Multi-Stats, Task Types & Shared EXP)
 * Flow: Complete quest → Chia đều EXP cho Stats → Check level-up → Render 1 lần
 */
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
            questDiffSelect: document.getElementById('quest-difficulty'), // Đã xóa questStatSelect cũ
            toastContainer: document.getElementById('toast-container'),
            levelupOverlay: document.getElementById('levelup-overlay'),
            allocPointsDisplay: document.getElementById('alloc-points'),
            radarContainer: document.getElementById('radar-container')
        };
    }
    
    // ===== RENDER BATCH =====
    function renderAllUI() {
        var user = State.getUser();
        
        UI.renderStats(user.stats);
        UI.renderXP(user.characterLevel, user.totalExp, State.getTotalExpThreshold(), State.getTotalExpProgress());
        UI.renderRadarChart(user.stats);
        
        if (els.allocPointsDisplay) {
            els.allocPointsDisplay.textContent = user.allocPoints;
            els.allocPointsDisplay.className = user.allocPoints > 0 ? 'highlight' : '';
        }
        
        UI.renderBadges(State.getBadges());
        renderQuestList();
        
        if (els.streakValue) els.streakValue.textContent = State.getStreak();
        if (els.userTitle) els.userTitle.textContent = Reward.getTitleByLevel(user.characterLevel);
    }
    
    // ===== STAT MAP =====
    var statMap = {
        str: { icon: '⚔️', label: 'STR', color: '#ff6b6b' },
        agi: { icon: '🪽', label: 'AGI', color: '#4ecdc4' },
        int: { icon: '🧠', label: 'INT', color: '#45b7d1' },
        vit: { icon: '❤️', label: 'VIT', color: '#f9ca24' },
        lck: { icon: '🍀', label: 'LCK', color: '#a0d2eb' }
    };
    
    // ===== INIT =====
    function init() {
        console.log('🚀 App initializing (Phase 5.5)...');
        cacheDOM();
        if (typeof State === 'undefined' || typeof UI === 'undefined') return;
        
        State.load();
        Quest.load();
        
        // 💡 Kích hoạt kiểm tra qua ngày để hồi sinh Daily Quest
        if(typeof Quest.checkDailyResets === 'function') {
            Quest.checkDailyResets(); 
        }
        
        renderAllUI();
        setupEventListeners();
    }
    
    // ===== RENDER QUEST LIST (Phân nhóm thông minh) =====
    function renderQuestList() {
        if (!els.questList) return;
        var quests = Quest.getAll();
        
        if (quests.length === 0) {
            els.questList.innerHTML = '<li class="empty-state">📭 Bảng nhiệm vụ đang trống. Nhận việc đi nào!</li>';
            return;
        }
        
        // 💡 Chia nhóm Task
        var dailyQuests = quests.filter(function(q) { return q.type === 'daily'; });
        var adhocQuests = quests.filter(function(q) { return q.type !== 'daily'; });
        
        var html = '';
        
        // 💡 Hàm phụ để render từng nhóm Quest
        function renderGroup(title, groupQuests, icon) {
            if (groupQuests.length === 0) return '';
            
            var groupHtml = '<div class="quest-category-title">' + icon + ' ' + title + '</div>';
            
            for (var i = 0; i < groupQuests.length; i++) {
                var q = groupQuests[i];
                var reward = Quest.calcReward(q.difficulty);
                
                // Lấy danh sách Stats đã chọn
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
                        '<div class="quest-meta">' + 
                            statBadgesHtml +
                            '<span class="quest-difficulty-badge ' + q.difficulty + '">' + capitalize(q.difficulty) + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="quest-reward">+' + reward.baseExp + ' EXP Tổng | Chia đều +' + reward.statBonusExp + ' Stat EXP</div>' +
                    '<div class="quest-actions">' +
                        '<button class="btn-complete" data-id="' + q.id + '"' + (q.done ? ' disabled' : '') + '>✅ ' + (q.done ? 'Đã xong' : 'Hoàn thành') + '</button>' +
                        '<button class="btn-delete" data-id="' + q.id + '">🗑️</button>' +
                    '</div>' +
                '</li>';
            }
            return groupHtml;
        }
        
        // Render nhóm Daily trước, Adhoc sau
        html += renderGroup('Nhiệm vụ Hàng ngày', dailyQuests, '🔁');
        html += renderGroup('Nhiệm vụ 1 Lần', adhocQuests, '🎯');
        
        els.questList.innerHTML = html;
    }
    
    // ===== EVENT LISTENERS =====
    function setupEventListeners() {
        if (els.questForm) {
            els.questForm.addEventListener('submit', function(e) {
                e.preventDefault();
                var title = els.questTitleInput.value.trim();
                var diff = els.questDiffSelect.value;
                
                // 💡 Lấy Loại Task
                var typeEl = document.getElementById('quest-type');
                var type = typeEl ? typeEl.value : 'adhoc';
                
                // 💡 Gom tất cả các checkbox Stat đang được tick
                var statCheckboxes = document.querySelectorAll('#quest-stat-toggles input:checked');
                var statsArray = [];
                for (var k = 0; k < statCheckboxes.length; k++) {
                    statsArray.push(statCheckboxes[k].value);
                }
                // Nếu người dùng quên tick, mặc định chọn STR để tránh lỗi
                if (statsArray.length === 0) statsArray = ['str'];
                
                if (title) {
                    Quest.add(title, statsArray, diff, type);
                    renderAllUI();
                    els.questTitleInput.value = '';
                    UI.showToast('✨ Nhiệm vụ đã được giao!', 'success');
                }
            });
        }
        
        if (els.questList) {
            els.questList.addEventListener('click', function(e) {
                var target = e.target;
                var card = target.closest('.quest-card');
                if (!card) return;
                
                var questId = parseInt(card.dataset.id);
                if (isNaN(questId)) return;
                
                if (target.classList.contains('btn-complete')) {
                    completeQuest(questId);
                }
                if (target.classList.contains('btn-delete')) {
                    Quest.remove(questId);
                    renderAllUI();
                    UI.showToast('🗑️ Đã hủy nhiệm vụ', 'success');
                }
            });
        }
        
        if (els.closeLevelup && els.levelupOverlay) {
            els.closeLevelup.addEventListener('click', function() {
                els.levelupOverlay.classList.remove('active');
                setTimeout(function() { els.levelupOverlay.classList.add('hidden'); }, 300);
            });
        }
        
        // AllocPoints: Click thẻ vòng tròn để nâng hệ số Multiplier
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
                    }
                } else {
                    UI.showToast('Chưa có điểm phân bổ!', 'success');
                }
            });
        }
    }
    
    // ===== COMPLETE QUEST (CHIA ĐỀU EXP) =====
    function completeQuest(questId) {
        var reward = Quest.complete(questId);
        if (!reward) return;
        
        // BƯỚC 1: Cộng EXP Tổng nhân vật
        var charResult = State.addTotalExp(reward.baseExp);
        
        // BƯỚC 2: Chia đều EXP cho các Stats được chọn
        var statsArray = reward.statNames || [reward.statName]; // Fallback
        var statCount = statsArray.length;
        var expPerStat = Math.floor(reward.statBonusExp / statCount); // Thuật toán chia đều
        
        var leveledUpStats = [];
        var statToastDetails = [];
        
        for (var i = 0; i < statCount; i++) {
            var sName = statsArray[i];
            var sRes = State.addStatExp(sName, expPerStat);
            
            if (sRes.leveledUp) leveledUpStats.push(sName);
            // Ghi nhận lượng EXP thực tế sau khi nhân Multiplier để báo cáo UI
            statToastDetails.push(statMap[sName].label + ' +' + (sRes.addedExp || expPerStat));
        }
        
        // BƯỚC 3: Cập nhật Gamification (Streak)
        State.incrementCompletedQuests();
        State.updateLastActive();
        
        var streakResult = Reward.calcStreak(State.getUser().lastActive);
        if (streakResult.reset) State.applyStreak(0);
        else if (streakResult.increment > 0) State.applyStreak(State.getStreak() + streakResult.increment);
        
        // BƯỚC 4: Render lại UI
        renderAllUI();
        
        // BƯỚC 5: Xả thông báo (Toasts)
        if (charResult.leveledUp > 0) {
            var msg = charResult.leveledUp > 1 
                ? '🚀 Lên ' + charResult.leveledUp + ' cấp!' 
                : '🎉 Level Up!';
            UI.showToast(msg + ' +' + charResult.newAllocPoints + ' điểm phân bổ', 'levelup');
            
            if (charResult.leveledUp === 1) {
                UI.showLevelUpAnimation(charResult.currentLevel, Reward.getTitleByLevel(charResult.currentLevel));
            }
        }
        
        // Báo cáo nếu có Stat lên cấp (có thể nhiều stat lên cấp cùng lúc)
        for (var j = 0; j < leveledUpStats.length; j++) {
            UI.showToast(statMap[leveledUpStats[j]].label + ' lên cấp! ⬆️', 'success');
        }
        
        // Kiểm tra mở khóa huy hiệu (Badges)
        var newBadges = Reward.checkBadges(State.getUser());
        for (var k = 0; k < newBadges.length; k++) {
            if (State.unlockBadge(newBadges[k].id)) {
                UI.showToast('🏆 ' + newBadges[k].name, 'badge');
            }
        }
        
        // Báo cáo tóm tắt lượng EXP cày được
        UI.showToast('Hoàn thành! Tổng +' + reward.baseExp + ' EXP | ' + statToastDetails.join(', '), 'success');
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
    
    // ===== START =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();