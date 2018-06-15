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
