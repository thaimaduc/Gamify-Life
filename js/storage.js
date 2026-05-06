// js/storage.js - Wrapper an toàn cho LocalStorage
var Storage = {
    save: function(key, data) {
        try {
            if (!key || typeof key !== 'string') return false;
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Storage.save error:', e);
            return false;
        }
    },
    load: function(key) {
        try {
            if (!key || typeof key !== 'string') return null;
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error('Storage.load error:', e);
            return null;
        }
    }
};