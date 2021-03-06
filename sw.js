self.importScripts("js/common.min.js");

self.addEventListener('fetch', function(event) {
	if(event.request.url.startsWith(self.registration.scope))
	{
		// If the fetched resource comes from the same domain of the SW, I'll add it to the cache
		caches.open('restaurantReview').then(function(cache) {
			return cache.add(event.request.url);
		})
	}

	event.respondWith(
		caches.match(event.request).then(function(response) {
			// Get the requested element from the cache, or (if not found) fetch it from the network
			return response || fetch(event.request);
		})
		);
});

self.addEventListener('sync', function(event) {
	if (event.tag == 'backgSync') {
		event.waitUntil(updateOfflineReviews());
	}
});

function updateOfflineReviews() {
	if(navigator.onLine) {
		openIDB().then(function(db) {
			var storeRo = getObjectStore(DBHelper.OFFLINE_REVIEWS_OS,'readonly',db);

			// Check if offline os has rows
			storeRo.count().then(numRows=>{
				if(numRows>0) {
					storeRo.getAll().then(idbData=>{
						for(var idx in idbData) {
							var fetchReviewsOption = {
								method: "POST",
								headers: {
									"Content-Type": "application/json"
								},
								body: JSON.stringify({
									"restaurant_id": idbData[idx].restaurant_id,
									"name": idbData[idx].name,
									"rating": idbData[idx].rating,
									"comments": idbData[idx].comments
								})
							}

							// For each rows in the offline os, create POST request
							fetch(DBHelper.REVIEWS_URL,fetchReviewsOption)
							.then(response=> response.json())
							.then(jsonData=>{
								openIDB().then(function(db) {
									// Save the row on the main reviews os, so I can view the review after that the offline os is clear
									var mainStoreRw = getObjectStore(DBHelper.MAIN_REVIEWS_OS,'readwrite',db);
									var objectRev = getObjectReview(jsonData.id,jsonData.name,jsonData.comments,convertDate(jsonData.createdAt),jsonData.rating,jsonData.restaurant_id);

									mainStoreRw.put(objectRev);
								});
							})
							.catch(e=>{
								console.log("Error on the review POST function. " + e)
							})
						}
					})
				}
			});
		})
		.then(()=>{
			openIDB().then(function(db){
				// Delete data from offline os when I'm online and I've done the POST request
				var delStoreRw = getObjectStore(DBHelper.OFFLINE_REVIEWS_OS,'readwrite',db);
				delStoreRw.clear();
			});
		});
	}
}