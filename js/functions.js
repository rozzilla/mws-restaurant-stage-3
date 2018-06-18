/**
 * Common functions for both index.html and restaurant.html files.
 */

// I register the SW only if the browser support this feature
if('serviceWorker' in navigator) {
	navigator.serviceWorker.register('/sw.js').then(function() {
		console.log("Service Worker Registered on /sw.js");
	});
}

function openIDB() {
	// Check for browser compatibility
	if (!('indexedDB' in window)) {
		console.log('IndexedDB is not supported on this browser');
		return;
	}

	return idb.open('dbRestaurant', 1, function(upgradeDb){
		switch(upgradeDb.oldVersion){
			case 0:
				upgradeDb.createObjectStore('osRestaurant',{keyPath:'id'});
				upgradeDb.createObjectStore('osReviews',{keyPath:'id'});
			default:
				break;
		}
	});
}

function convertDate(originalDate) {
	var convertedDate = new Date(originalDate).toLocaleDateString("en-US",{
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return convertedDate;
}

function getObjectStore(osName,connType,mainDb) {
	var tx = mainDb.transaction(osName,connType);
	var store = tx.objectStore(osName);
	return store;
}

function getObjectReview(idRev,nameRev,commRev,dateRev,rateRev,restIdRev) {
	var objReview = {};

	objReview.id = idRev;
	objReview.comments = commRev;
	objReview.date = dateRev;
	objReview.name = nameRev;
	objReview.rating = rateRev;
	objReview.restaurant_id = restIdRev;

	return objReview;
}