/**
 * Common functions for both index.html and restaurant.html files.
 */

// I register the SW only if the browser support this feature
if('serviceWorker' in navigator) {
	navigator.serviceWorker.register('/sw.js').then(function() {
		console.log("Service Worker Registered on /sw.js");
	});
}

function openIDB()
{
	// Check for browser compatibility
	if (!('indexedDB' in window)) {
		console.log('IndexedDB is not supported on this browser');
		return;
	}

	return idb.open('dbRestaurant', 1, function(upgradeDb){
		switch(upgradeDb.oldVersion){
			case 0:
				var os = upgradeDb.createObjectStore('osRestaurant',{keyPath:'id'});
			default:
				break;
		}
	});
}