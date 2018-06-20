/**
 * Common functions for both index.html and restaurant.html files.
 */

// I register the SW only if the browser support this feature
if('serviceWorker' in navigator) {
	navigator.serviceWorker.register('/sw.js').then(function() {
		console.log("Service Worker Registered on /sw.js");
	});

	navigator.serviceWorker.ready.then(function(swRegistration) {
	  return swRegistration.sync.register('backgSync');
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
				upgradeDb.createObjectStore('osOfflineReviews',{keyPath:'id'});
				var objStoReviews = upgradeDb.createObjectStore('osReviews',{keyPath:'id'});
				objStoReviews.createIndex('restaurant_id','restaurant_id',{unique: false});
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

	objReview.id = parseInt(idRev);
	objReview.comments = commRev;
	objReview.date = dateRev;
	objReview.name = nameRev;
	objReview.rating = parseInt(rateRev);
	objReview.restaurant_id = parseInt(restIdRev);

	return objReview;
}