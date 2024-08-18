var geocoder = require('local-reverse-geocoder');

console.log('will init')
geocoder.init({}, function () {
    console.log('did init')
  console.log(geocoder.lookup(37.7749295, -122.4194155));
});