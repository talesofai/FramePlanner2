<script lang="ts">
  // IndexedDB分度ー塔贝ー定义储存名称和储存名称
  const dbName = 'fontHistoryDB';
  const storeName = 'fontHistory';

  let db;

  // IndexedDB的双曲正切值
  const openRequest = indexedDB.open(dbName, 1);

  openRequest.onupgradeneeded = (event) => {
    console.log('onupgradeneeded', event);
    const db = event.target.result;
    db.createObjectStore(storeName);
  };

  openRequest.onsuccess = (event) => {
    console.log('onsuccess', event);
    db = event.target.result;
  };

  export function add(fontname) {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    store.put(fontname, fontname);
  }

  export function remove(fontname) {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    store.delete(fontname);
  }

  export function getAll() {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    return store.getAll();
  }

  export async function isReady() {
    return new Promise((resolve) => {
      const timer = setInterval(() => {
        if (db) {
          clearInterval(timer);
          resolve(null);
        }
      }, 100);
    });
  }
</script>