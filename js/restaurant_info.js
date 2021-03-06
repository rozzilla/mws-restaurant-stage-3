let restaurant;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      self.map.addListener('tilesloaded', function(){
        const title = "Map of the restaurant " + restaurant.name + " in " + restaurant.address;
        document.querySelector('#map').querySelector('iframe').setAttribute('title',title);
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  var metaList = document.getElementsByTagName("META");
  metaList[2].setAttribute("content","Reviews of the " + restaurant.name + " restaurant in " + restaurant.address);

  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.setAttribute("class","color-green");
  address.innerHTML = restaurant.address;

  const favorites = document.getElementById('add-favorites-box');

  const picture = document.getElementById('restaurant-picture');

  const source950px = document.createElement('source');
  source950px.setAttribute("media","(min-width: 950px)");
  source950px.setAttribute("srcset",DBHelper.imageUrlForRestaurant(restaurant));
  picture.appendChild(source950px);

  const source750px = document.createElement('source');
  source750px.setAttribute("media","(min-width: 750px)");
  source750px.setAttribute("srcset",DBHelper.imageUrlForRestaurantExtension(restaurant,"w550"));
  picture.appendChild(source750px);

  const source550px = document.createElement('source');
  source550px.setAttribute("media","(min-width: 550px)");
  source550px.setAttribute("srcset",DBHelper.imageUrlForRestaurantExtension(restaurant,"w450"));
  picture.appendChild(source550px);

  const image = document.createElement('img');
  image.setAttribute("id","restaurant-img");
  image.className = 'restaurant-img'
  image.alt = restaurant.name + " (" + restaurant.cuisine_type + " restaurant)"
  image.src = DBHelper.imageUrlForRestaurantExtension(restaurant,"w265");
  picture.appendChild(image);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  openIDB().then(function(db) {
    var storeRo= getObjectStore(DBHelper.FAV_RESTAURANTS_OS,'readonly',db);
    storeRo.get(restaurant.id)
    .then(idbData=>{
      if(idbData) {
        const divFav = document.createElement('div');
        divFav.innerHTML = `<strong>${restaurant.name}</strong> added to favorites ❤`;
        divFav.setAttribute("class","color-white backg-black font-center");
        favorites.append(divFav)
      }
      else
      {
        const aFav = document.createElement('a');
        aFav.innerHTML = '❤ Add to favorites!';
        aFav.setAttribute("onclick",`addToFavorites(${restaurant.id})`);
        aFav.setAttribute("id","addto-favorites");
        aFav.setAttribute("href","#restaurant-container");
        aFav.setAttribute("class","color-white backg-green font-center");
        aFav.setAttribute("title","Add the " + restaurant.name + " restaurant to your favorites!");
        favorites.append(aFav)
      }
    });
  });

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  getAllReviews();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Get the reviews checking firstly on the os (offline and online).
 * If the IDB is empty, fetch reviews from network and add to the IDB.
 */
getAllReviews = () => {
  openIDB().then(function(db) {
    var storeRo = getObjectStore(DBHelper.MAIN_REVIEWS_OS,'readonly',db);
    var indexStoreRo = storeRo.index("restaurant_id").getAll(self.restaurant.id);

    indexStoreRo.then(idbData => {
      // If there are JSON reviews already present in IDB
      if(idbData && idbData.length > 0) {
        // I firstly check for any offline reviews
        var offlineStoreRo = getObjectStore(DBHelper.OFFLINE_REVIEWS_OS,'readonly',db);
        offlineStoreRo.index("restaurant_id").getAll(self.restaurant.id).then(offlineIdbData=>{
          for(var singleData in offlineIdbData) {
            idbData.push(offlineIdbData[singleData]);
          }

          fillReviewsHTML(idbData);
        });
      } else {
        getReviewsPromise(self.restaurant.id).then(reviewsData=>{
          var storeRw = getObjectStore(DBHelper.MAIN_REVIEWS_OS,'readwrite',db);

          reviewsData.forEach(jsonElement => {
            // Put every data of the JSON in the IDB
            storeRw.put(jsonElement);
          });

          var indexStoreRw = storeRw.index("restaurant_id").getAll(self.restaurant.id);

          indexStoreRw.then(idbData => {
            // Get the data from the IDB now
            fillReviewsHTML(idbData);
          })
        }).catch(e=>console.log(e))
      }
    });
  });
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
function fillReviewsHTML(reviews) {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  title.setAttribute("class","color-green font-center");
  title.setAttribute("tabindex","0");
  container.appendChild(title);

  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('article');
  li.setAttribute("class","single-review");
  const nameDate = document.createElement('div');
  nameDate.setAttribute("class","name-date backg-black color-white");
  li.appendChild(nameDate);
  const name = document.createElement('div');
  name.setAttribute("class","name-review");
  name.innerHTML = review.name;
  nameDate.appendChild(name);

  const date = document.createElement('div');
  date.setAttribute("class","date-review");
  date.innerHTML = review.date;
  nameDate.appendChild(date);

  const rating = document.createElement('div');
  rating.setAttribute("class","rating-review backg-green color-white");
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('div');
  comments.setAttribute("class","comments-review");
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li.setAttribute("aria-current","page");
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Get reviews data of single restaurant from JSON request.
 */
const getReviewsPromise = (idRest) => {
  return new Promise((resolve,reject) => {
    fetch(DBHelper.REVIEWS_URL + "?restaurant_id=" + idRest)
    .then(res=> res.json())
    .then(jsonRes=>{
      reviewsData = [];
      jsonRes.forEach(elem => {
        var revObj = getObjectReview(elem.id,elem.name,elem.comments,convertDate(elem.createdAt),elem.rating,elem.restaurant_id);
        reviewsData.push(revObj);
      })
      resolve(reviewsData);
    })
    .catch(e=>{
      reject(Error("Error on fetch review function. " + e));
    })
  })
}

function addToFavorites(idRes) {
  if(navigator.onLine) {
    var fetchReviewsOption = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      }
    }

    fetch(DBHelper.getFavoritePutUrl(idRes),fetchReviewsOption)
    .then(response=> response.json())
    .then(jsonData=>{
      openIDB().then(function(db) {
        var storeRw = getObjectStore(DBHelper.FAV_RESTAURANTS_OS,'readwrite',db);
        storeRw.put({
          id: idRes
        });
      });
    }).then(location.reload())
    .catch(e=>{
      console.log("Error on the review POST function. " + e)
    })
  }
}

document.getElementById("post-review-btn").addEventListener("click", function(){
    var reviewForm = document.getElementById("reviews-form");
    var reviewFormErr = document.getElementById("reviews-form-error");

    var idRestaurant = getParameterByName('id');
    var revName = reviewForm.elements[0].value;
    var revRating = reviewForm.elements[1].value;
    var revComments = reviewForm.elements[2].value;

    // Form control
    if(!revName || !revRating || !revComments) {
      reviewFormErr.textContent = "All fields are required";
    } else {
      // Control form passed
      reviewFormErr.textContent = "";
      reviewForm.reset();

      if(navigator.onLine) {
        var fetchReviewsOption = {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            "restaurant_id": idRestaurant,
            "name": revName,
            "rating": revRating,
            "comments": revComments
          })
        }

        // If I'm online I do a POST request
        fetch(DBHelper.REVIEWS_URL,fetchReviewsOption)
        .then(response=> response.json())
        .then(jsonData=>{
          openIDB().then(function(db) {
            // Then I connect do the os and I use the return id and createdAt JSON data to store the information on the os
            var storeRw = getObjectStore(DBHelper.MAIN_REVIEWS_OS,'readwrite',db);
            var objectRev = getObjectReview(jsonData.id,revName,revComments,convertDate(jsonData.createdAt),revRating,idRestaurant);

            storeRw.put(objectRev);
          }).then(location.reload());
        })
        .catch(e=>{
          console.log("Error on the review POST function. " + e)
        })
      } else {
        // I'm offline
        openIDB().then(function(db) {
          var storeRw = getObjectStore(DBHelper.OFFLINE_REVIEWS_OS,'readwrite',db);

          // So, I add this review data to the offline os
          storeRw.count().then(numRows=>{
            var objectRev = getObjectReview(numRows,revName,revComments,convertDate(new Date()),revRating,idRestaurant);
            storeRw.put(objectRev);
          });
        }).then(location.reload());
      }
    }
});

document.getElementById("show-map").addEventListener("click", function(){
  document.querySelector(".skip-link").style.display = "block";
  document.getElementById("map").style.display = "block";
  document.getElementById("show-map").style.display = "none";
});