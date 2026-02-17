// Enhanced database.js with MySQL Sync Support
// Add this code to existing database.js for MySQL integration

// MySQL Sync Configuration
const SYNC_API_URL = 'api.php'; // Change this to your API URL if hosted remotely
let isSyncing = false;

// Auto-sync interval (in milliseconds) - Default: 5 minutes
const AUTO_SYNC_INTERVAL = 5 * 60 * 1000;

// Check if online
function isOnline() {
    return navigator.onLine;
}

// Update sync status indicator
function updateSyncStatus(status, message = '') {
    const statusElement = document.getElementById('syncStatus');
    if (status === 'online') {
        statusElement.className = 'status-online';
        statusElement.textContent = '● Online - Synced';
    } else if (status === 'syncing') {
        statusElement.className = 'status-warning';
        statusElement.textContent = '● Syncing...';
    } else if (status === 'error') {
        statusElement.className = 'status-offline';
        statusElement.textContent = '● Sync Error';
    } else {
        statusElement.className = 'status-offline';
        statusElement.textContent = '● Offline Mode';
    }
}

// Sync data to MySQL
async function syncToMySQL() {
    if (isSyncing) {
        console.log('Sync already in progress');
        return;
    }

    if (!isOnline()) {
        console.log('Cannot sync: Offline');
        updateSyncStatus('offline');
        return;
    }

    try {
        isSyncing = true;
        updateSyncStatus('syncing');

        // Export all data from IndexedDB
        const data = await exportAllData();

        // Send to MySQL
        const response = await fetch(`${SYNC_API_URL}?action=sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            console.log('Sync successful:', result.message);
            updateSyncStatus('online');
            
            // Save last sync time
            await setSetting('last_sync', new Date().toISOString());
            
            return true;
        } else {
            console.error('Sync failed:', result.message);
            updateSyncStatus('error');
            return false;
        }

    } catch (error) {
        console.error('Sync error:', error);
        updateSyncStatus('error');
        return false;
    } finally {
        isSyncing = false;
    }
}

// Sync data from MySQL to IndexedDB
async function syncFromMySQL() {
    if (!isOnline()) {
        console.log('Cannot sync: Offline');
        return;
    }

    try {
        updateSyncStatus('syncing');

        // Fetch data from MySQL
        const response = await fetch(`${SYNC_API_URL}?action=export`);
        const result = await response.json();

        if (result.success) {
            // Import to IndexedDB
            await importAllData(result.data);
            
            console.log('Data imported from MySQL successfully');
            updateSyncStatus('online');
            
            // Save last sync time
            await setSetting('last_sync', new Date().toISOString());
            
            return true;
        } else {
            console.error('Fetch failed:', result.message);
            updateSyncStatus('error');
            return false;
        }

    } catch (error) {
        console.error('Fetch error:', error);
        updateSyncStatus('error');
        return false;
    }
}

// Bi-directional sync
async function syncData() {
    if (!confirm('Do you want to sync data with MySQL server?')) {
        return;
    }

    const lastSync = await getSetting('last_sync');
    
    if (!lastSync) {
        // First sync - push local data to server
        const success = await syncToMySQL();
        if (success) {
            alert('Data synced successfully to server!');
        } else {
            alert('Sync failed. Check console for details.');
        }
    } else {
        // Regular sync - merge changes
        if (confirm('Upload local changes to server?')) {
            await syncToMySQL();
        }
        
        if (confirm('Download server data to local?')) {
            await syncFromMySQL();
        }
    }
}

// Auto-sync when online
window.addEventListener('online', () => {
    console.log('Connection restored');
    updateSyncStatus('online');
    syncToMySQL(); // Auto-sync when back online
});

window.addEventListener('offline', () => {
    console.log('Connection lost');
    updateSyncStatus('offline');
});

// Initialize sync status on load
window.addEventListener('load', () => {
    if (isOnline()) {
        updateSyncStatus('online');
    } else {
        updateSyncStatus('offline');
    }
});

// Auto-sync every 5 minutes if online
setInterval(() => {
    if (isOnline() && !isSyncing) {
        console.log('Auto-sync triggered');
        syncToMySQL();
    }
}, AUTO_SYNC_INTERVAL);

// Export functions for use in app.js
window.syncToMySQL = syncToMySQL;
window.syncFromMySQL = syncFromMySQL;
window.syncData = syncData;