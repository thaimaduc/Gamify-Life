/* main.js - Phase 5 (New EXP System + Radar Chart)
 * Flow: Complete quest → Cộng EXP kép → Check level-up → Render 1 lần
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
            questStatSelect: document.getElementById('quest-stat'),
            questDiffSelect: document.getElementById('quest-difficulty'),
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
        console.log('🚀 App initializing (Phase 5)...');
        cacheDOM();
        
        if (typeof State === 'undefined' || typeof UI === 'undefined') {
            console.error('❌ Module chưa load đúng thứ tự!');
            return;
        }
        
        State.load();
        Quest.load();
        renderAllUI();
        setupEventListeners();
        console.log('✅ Ready. Quests:', Quest.getAll().length);
    }
    
    // ===== RENDER QUEST LIST =====
    function renderQuestList() {
        if (!els.questList) return;
        var quests = Quest.getAll();
        
        if (quests.length === 0) {
            els.questList.innerHTML = '<li class="empty-state">📭 Chưa có quest nào. Tạo quest đầu tiên nhé!</li>';
            return;
        }
        
        var html = '';
        for (var i = 0; i < quests.length; i++) {
            var q = quests[i];
            var reward = Quest.calcReward(q.difficulty);
            var stat = statMap[q.statType] || { icon: '?', label: q.statType, color: '#aaa' };
            
            html += '<li class="quest-card ' + (q.done ? 'done' : '') + '" data-id="' + q.id + '">' +
                '<div class="quest-header">' +
                    '<span class="quest-title">' + escapeHtml(q.title) + '</span>' +
                    '<div class="quest-meta">' +
                        '<span class="quest-stat-badge" style="background:' + stat.color + '20;color:' + stat.color + '">' + 
                            stat.icon + ' ' + stat.label + '</span>' +
                        '<span class="quest-difficulty-badge ' + q.difficulty + '">' + capitalize(q.difficulty) + '</span>' +
                    '</div>' +
                '</div>' +
                '<div class="quest-reward">+' + reward.baseExp + ' EXP nhân vật | +' + reward.statBonusExp + ' ' + stat.label + '</div>' +
                '<div class="quest-actions">' +
                    '<button class="btn-complete" data-id="' + q.id + '"' + (q.done ? ' disabled' : '') + '>✅ ' + (q.done ? 'Đã xong' : 'Hoàn thành') + '</button>' +
                    '<button class="btn-delete" data-id="' + q.id + '">🗑️</button>' +
                '</div>' +
            '</li>';
        }
        els.questList.innerHTML = html;
    }
    
    // ===== EVENT LISTENERS =====
    function setupEventListeners() {
        if (els.questForm) {
            els.questForm.addEventListener('submit', function(e) {
                e.preventDefault();
                var title = els.questTitleInput.value.trim();
                var stat = els.questStatSelect.value;
                var diff = els.questDiffSelect.value;
                
                if (title) {
                    Quest.add(title, stat, diff);
                    renderAllUI();
                    els.questTitleInput.value = '';
                    UI.showToast('✨ Quest đã thêm!', 'success');
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
                    UI.showToast('🗑️ Đã xóa quest', 'success');
                }
            });
        }
        
        if (els.closeLevelup && els.levelupOverlay) {
            els.closeLevelup.addEventListener('click', function() {
                els.levelupOverlay.classList.remove('active');
                setTimeout(function() { els.levelupOverlay.classList.add('hidden'); }, 300);
            });
        }
        
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
    } // Đã fix thiếu dấu ngoặc ở đây
    
    // ===== COMPLETE QUEST (NEW EXP FLOW) =====
    function completeQuest(questId) {
        var reward = Quest.complete(questId);
        if (!reward) return;
        
        var charResult = State.addTotalExp(reward.baseExp);
        var statResult = State.addStatExp(reward.statName, reward.statBonusExp);
        
        State.incrementCompletedQuests();
        State.updateLastActive();
        
        var streakResult = Reward.calcStreak(State.getUser().lastActive);
        if (streakResult.reset) State.applyStreak(0);
        else if (streakResult.increment > 0) State.applyStreak(State.getStreak() + streakResult.increment);
        
        renderAllUI();
        
        if (charResult.leveledUp > 0) {
            var msg = charResult.leveledUp > 1 
                ? '🚀 Lên ' + charResult.leveledUp + ' cấp!' 
                : '🎉 Level Up!';
            UI.showToast(msg + ' +' + charResult.newAllocPoints + ' điểm phân bổ', 'levelup');
            
            if (charResult.leveledUp === 1) {
                UI.showLevelUpAnimation(charResult.currentLevel, Reward.getTitleByLevel(charResult.currentLevel));
            }
        }
        
        if (statResult.leveledUp) {
            var label = statMap[reward.statName].label;
            UI.showToast(label + ' lên Lv.' + statResult.newLevel + '! ⬆️', 'success');
        }
        
        var newBadges = Reward.checkBadges(State.getUser());
        for (var i = 0; i < newBadges.length; i++) {
            if (State.unlockBadge(newBadges[i].id)) {
                UI.showToast('🏆 ' + newBadges[i].name, 'badge');
            }
        }
        
        var actualStatExp = statResult.addedExp || reward.statBonusExp;
        UI.showToast('Hoàn thành! Tổng +' + reward.baseExp + ' EXP | ' + statMap[reward.statName].label + ' +' + actualStatExp + ' EXP', 'success');
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