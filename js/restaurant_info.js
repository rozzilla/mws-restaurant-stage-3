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

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
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
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = () => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  title.setAttribute("class","color-green font-center");
  title.setAttribute("tabindex","0");
  container.appendChild(title);

  getReviewsPromise(self.restaurant.id).then(reviews=>{
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
  }).catch(e=>console.log(e))
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

document.getElementById("post-review-btn").addEventListener("click", function(){
    var reviewForm = document.getElementById("reviews-form");
    var reviewFormErr = document.getElementById("reviews-form-error");

    var idRestaurant = getParameterByName('id');
    var revName = reviewForm.elements[0].value;
    var revRating = reviewForm.elements[1].value;
    var revComments = reviewForm.elements[2].value;

    if(!revName || !revRating || !revComments) {
      reviewFormErr.textContent = "All fields are required";
    } else {
      reviewFormErr.textContent = "";
      reviewForm.reset();

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

      fetch(DBHelper.REVIEWS_URL,fetchReviewsOption)
      .then(response=> response.json())
      .then(jsonData=>{
        document.getElementById("reviews-list").innerHTML = "";
        fillReviewsHTML();
      })
      .catch(e=>{
        console.log("Error on the review POST function. " + e)
      })
    }
});

const getReviewsPromise = (idRest) => {
  return new Promise((resolve,reject) => {
    fetch(DBHelper.REVIEWS_URL + "?restaurant_id=" + idRest)
    .then(res=> res.json())
    .then(jsonRes=>{
      reviewsData = [];
      jsonRes.forEach(elem => {

        var convertedDate = new Date(elem.createdAt).toLocaleDateString("en-US",{ year: 'numeric', month: 'long', day: 'numeric' });

        reviewsData.push({
          comments: elem.comments,
          date: convertedDate,
          name: elem.name,
          rating: elem.rating
        })
      })
      resolve(reviewsData);
    })
    .catch(e=>{
      reject(Error("Error on fetch review function. " + e));
    })
  })
}