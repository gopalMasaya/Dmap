// Required Mapbox Token
const mapboxToken = 'pk.eyJ1IjoiZ29wYWxtYXNheWEiLCJhIjoiY201MnVpMnl4MjkxNjJqc2Y1cnV0cTRyZCJ9.hTkz0YvubzEiZmtxQBRh-g'; 

// Mapbox Parameters
const canvasSize = 512; // Canvas size for p5.js
const initialLat = 32.4204056; // Latitude for map center
const initialLon = 34.9256168; // Longitude for map center
const zoomLevel = 12; // Initial map zoom
let map;
var angle = 40;
var style;
let userLocation = null;
let destinationSelect;   // <‑‑ new
let goButton;            // <‑‑ new




// Preload assets if needed
function preload() {}

// Setup function
function setup() {
  createCanvas(windowWidth, windowHeight).parent('canvas-container');

  // Create the style dropdown
  style = createSelect();
  style.style('width', '16%');
  style.style('height', '40px');
  style.style('z-index', '3');
  style.style('position', 'absolute');
  style.style('top', '0px');
  style.style('left', '5px');


    // Destination input
  const input = createInput('');
  input.attribute('placeholder', 'Enter destination...');
  input.style('width', '250px');
  input.style('height', '40px');
  input.style('font-size', '16px');
  input.style('position', 'absolute');
  input.style('top', '50px');
  input.style('left', '5px');
  input.style('z-index', '3');

  const button = createButton('Get Route');
  button.style('height', '40px');
  button.style('position', 'absolute');
  button.style('top', '50px');
  button.style('left', '270px');
  button.style('z-index', '3');
  button.style('background', 'rgba(192,192,192,0.7)');

    button.mousePressed(() => {
    const destination = input.value();
    if (destination && userLocation) {
      searchDestinationOptions(destination);
    }
  });

  destinationSelect = createSelect();
  destinationSelect.style('width', '250px');
  destinationSelect.style('height', '40px');
  destinationSelect.style('font-size', '16px');
  destinationSelect.style('position', 'absolute');
  destinationSelect.style('top', '100px');
  destinationSelect.style('left', '0px');
  destinationSelect.style('z-index', '3');
  destinationSelect.hide(); // Only show when needed

   goButton = createButton('Go');
  goButton.style('height', '40px');
  goButton.style('position', 'absolute');
  goButton.style('top', '100px');
  goButton.style('left', '260px');
  goButton.style('z-index', '3');
  goButton.hide();

  goButton.mousePressed(() => {
    const selected = destinationSelect.selected();
    if (selected) {
      const coords = JSON.parse(destinationSelect.value()); // Parse back to array
      getRouteToCoords(coords);
    }
  });

  const gasButton = createButton('Find Gas Stations');
  gasButton.style('position', 'absolute');
  gasButton.style('top', '150px');
  gasButton.style('left', '0px');
  gasButton.style('z-index', '3');
  gasButton.style('height', '40px');
  gasButton.mousePressed(findNearbyGasStations);

  
  // Add style options
  const styles = {
    'navigation night': 'mapbox://styles/mapbox/navigation-night-v1',
    'navigation day': 'mapbox://styles/mapbox/navigation-day-v1',
    'traffic-night': 'mapbox://styles/mapbox/traffic-night-v2',
    'traffic-day': 'mapbox://styles/mapbox/traffic-day-v2',
    'satellite-streets': 'mapbox://styles/mapbox/satellite-streets-v12',
    'satellite': 'mapbox://styles/mapbox/satellite-v9',
    'outdoors': 'mapbox://styles/mapbox/outdoors-v12'
  };

  for (let label in styles) {
    style.option(label);
  }

  // Dropdown change handler
  style.changed(() => {
    const selected = style.value();
    if (styles[selected]) {
      map.setStyle(styles[selected]);

      // Reapply 3D terrain & buildings after style load
      map.once('style.load', () => {
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 30
        });

        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

        map.addLayer({
          id: '3d-buildings',
          type: 'fill-extrusion',
          source: 'composite',
          'source-layer': 'building',
          paint: {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height']
          }
        });
      });
    }
  });

  // Try to get user location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;
        console.log(userLat);
        console.log(userLon);

        initializeMap(userLat, userLon); // call map init
      },
      () => {
        console.warn("Geolocation failed, using default location");
        initializeMap(initialLat, initialLon); // fallback
      }
    );
  } else {
    console.warn("Geolocation not available, using default location");
    initializeMap(initialLat, initialLon);
  }
}

async function findNearbyGasStations() {
  if (!userLocation) {
    alert("User location not available.");
    return;
  }

  const [lon, lat] = userLocation;
  const proximity = `${lon},${lat}`;
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/gas station.json?proximity=${proximity}&limit=10&types=poi&access_token=${mapboxToken}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.features.length) {
      alert("No gas stations found nearby.");
      return;
    }

    showGasStationsOnMap(data.features);
  } catch (error) {
    console.error("Error fetching gas stations:", error);
    alert("Failed to get gas station data.");
  }
}

function showGasStationsOnMap(gasStations) {
  gasStations.forEach(station => {
    const [lon, lat] = station.geometry.coordinates;
    const name = station.text;
    const address = station.place_name;
    const distance = getDistanceFromUser(lat, lon).toFixed(2);

    const marker = new mapboxgl.Marker({ color: 'green' })
      .setLngLat([lon, lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 20 })
          .setHTML(`<strong>${name}</strong><br>${address}<br>Distance: ${distance} km`)
      )
      .addTo(map);
  });
}

function getDistanceFromUser(destLat, destLon) {
  const [userLon, userLat] = userLocation;
  const R = 6371; // Earth radius in km
  const dLat = radians(destLat - userLat);
  const dLon = radians(destLon - userLon);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radians(userLat)) * Math.cos(radians(destLat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function radians(deg) {
  return deg * (Math.PI / 180);
}


async function getRouteToCoords(destCoords) {
  try {
    const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation[0]},${userLocation[1]};${destCoords[0]},${destCoords[1]}?steps=true&geometries=geojson&access_token=${mapboxToken}`;
    const directionsResponse = await fetch(directionsUrl);
    const directionsData = await directionsResponse.json();

    const route = directionsData.routes[0];
    const durationMinutes = Math.round(route.duration / 60);
    const distanceKm = (route.distance / 1000).toFixed(2);

    const routeGeoJSON = {
      type: 'Feature',
      geometry: route.geometry
    };

    if (map.getSource('route')) {
      map.getSource('route').setData(routeGeoJSON);
    } else {
      map.addSource('route', {
        type: 'geojson',
        data: routeGeoJSON
      });

      map.addLayer({
        id: 'route-layer',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#0074D9',
          'line-width': 6,
          'line-opacity': 0.8
        }
      });
    }

    map.flyTo({ center: destCoords, zoom: 12 });

    new mapboxgl.Popup()
      .setLngLat(destCoords)
      .setHTML(`${distanceKm} km<br>~${durationMinutes} min drive`)
      .addTo(map);
  } catch (err) {
    console.error('Directions error:', err);
    alert('Error getting route.');
  }
}


function showDestinationList(features) {
  destinationSelect.show();
  destinationSelect.elt.innerHTML = ''; // Clear previous options

  features.forEach((feature, index) => {
    const name = feature.place_name;
    const coords = feature.center;
    destinationSelect.option(name, JSON.stringify(coords)); // Save coords as value
  });

  goButton.show();
}

function initializeMap(lat, lon) {
    userLocation = [lon, lat]; // Save current location for routing

  map = new mapboxgl.Map({
    container: 'map-container',
    style: 'mapbox://styles/mapbox/outdoors-v12',
    center: [lon, lat],
    zoom: zoomLevel,
    pitch: angle,
    bearing: 0,
    antialias: true,
    accessToken: mapboxToken
  });

  map.on('load', () => {
    console.log("Map loaded");

    map.addSource('mapbox-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 30
    });

    map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

    map.addLayer({
      id: '3d-buildings',
      type: 'fill-extrusion',
      source: 'composite',
      'source-layer': 'building',
      paint: {
        'fill-extrusion-color': '#aaa',
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': ['get', 'min_height']
      }
    });

    // Add a red marker at the center
    const marker = new mapboxgl.Marker({ color: 'red' })
      .setLngLat([lon, lat])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setText(`Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}`))
      .addTo(map);
  });
}

async function searchDestinationOptions(destinationName) {
  try {
    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destinationName)}.json?access_token=${mapboxToken}`;
    const geoResponse = await fetch(geocodeUrl);
    const geoData = await geoResponse.json();

    if (!geoData.features.length) {
      alert('No matching places found.');
      return;
    }

    showDestinationList(geoData.features);
  } catch (err) {
    console.error('Geocoding error:', err);
    alert('Error finding destination.');
  }
}



// Draw function
function draw() {
  clear();

if(keyIsPressed){
  if (key == 'u') {
    angle+=0.1;
  }
  if (key == 'd') {
    angle-=0.1;
  }
  map.setPitch(angle);
 // console.log(angle);
}

  // Overlay some p5.js content
  stroke(255, 0, 0);
  strokeWeight(2);noFill();
  ellipse(width/2, height/2, 60, 60); // Example: center of canvas
line(width*0.5-60,height*0.5,width*0.5+60,height*0.5)
line(width*0.5,height*0.5-60,width*0.5,height*0.5+60)
}

function createArea(lat,lon,distance){

  const earthRadius = 6378137;

// Latitude offset (in degrees)
const latOffset = (distance / earthRadius) * (180 / Math.PI);

// Longitude offset (in degrees, corrected by latitude)
const lonOffset = (distance / (earthRadius * Math.cos((Math.PI / 180) * lat))) * (180 / Math.PI);

// Rectangle bounds
const north = lat + latOffset;
const south = lat - latOffset;
const east = lon + lonOffset;
const west = lon - lonOffset;

// Output rectangle points
console.log(lon);
console.log("North-East:"+ north+ " "+ east);
console.log("North-West:", north, west);
console.log("South-East:", south, east);
console.log("South-West:", south, west);

const rectangle = {
  'type': 'Feature',
  'geometry': {
      'type': 'Polygon',
      'coordinates': [[
          [north, east],
          [north, west],
          [south, east],
          [south, west],
          [north, east]
      ]]
  }
};

}


function mousePressed() {
  // Get the map container bounds
  const mapContainer = document.getElementById('map-container');
  const rect = mapContainer.getBoundingClientRect();
  
  // Check if click is within map bounds
  if (mouseX >= rect.left && mouseX <= rect.right && 
      mouseY >= rect.top && mouseY <= rect.bottom) {
    
    // Convert coordinates
    const x = mouseX;
    const y = mouseY - rect.top;
    const point = map.unproject([x, y]);
    
    console.log('Longitude:', point.lng, 'Latitude:', point.lat);
   if(keyIsPressed){
      if(key == 'c'){
    createCircle(point);
   }

   if(key == 's'){
    highlightFeatureAtPoint(mouseX, mouseY);
   }
    }
    
    return false;
  }
}



function highlightFeatureAtPoint(mouseX, mouseY) {
  const rect = map.getContainer().getBoundingClientRect();
  const point = map.unproject([
    mouseX - rect.left,
    mouseY - rect.top
  ]);
  
  // Query features at click point
  const features = map.queryRenderedFeatures([
    [mouseX - rect.left - 5, mouseY - rect.top - 5],
    [mouseX - rect.left + 5, mouseY - rect.top + 5]
  ]);

  // Remove previous highlight
  if (map.getLayer('highlight-feature')) {
    map.removeLayer('highlight-feature');
  }
  if (map.getSource('highlight-source')) {
    map.removeSource('highlight-source');
  }

  if (features.length > 0) {
    const feature = features[0]; // Get the top feature

    // Add highlight layer
    map.addSource('highlight-source', {
      'type': 'geojson',
      'data': feature
    });

    // Add appropriate highlight layer based on geometry type
    if (feature.geometry.type.includes('Point')) {
      map.addLayer({
        'id': 'highlight-feature',
        'type': 'circle',
        'source': 'highlight-source',
        'paint': {
          'circle-radius': 10,
          'circle-color': '#00ff00',
          'circle-opacity': 0.5,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#00ff00'
        }
      });
    } else {
      map.addLayer({
        'id': 'highlight-feature',
        'type': 'fill',
        'source': 'highlight-source',
        'paint': {
          'fill-color': '#00ff00',
          'fill-opacity': 0.5,
          'fill-outline-color': '#00ff00'
        }
      });
    }

    // Create popup content
    let popupContent = '<div style="max-width: 300px;">';
    popupContent += `<h3>Feature Information</h3>`;
    popupContent += `<p><strong>Type:</strong> ${feature.layer.type}</p>`;
    
    // Add all properties
    if (feature.properties) {
      popupContent += '<h4>Properties:</h4><ul>';
      for (const [key, value] of Object.entries(feature.properties)) {
        if (value && typeof value !== 'object') {
          popupContent += `<li><strong>${key}:</strong> ${value}</li>`;
        }
      }
      popupContent += '</ul>';
    }
    
    // Add layer information
    popupContent += `<h4>Layer Information:</h4>
      <ul>
        <li><strong>Layer ID:</strong> ${feature.layer.id}</li>
        <li><strong>Source:</strong> ${feature.source}</li>
        <li><strong>Source Layer:</strong> ${feature.sourceLayer || 'N/A'}</li>
      </ul>`;
    
    popupContent += '</div>';

    // Show popup
    new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '400px'
    })
    .setLngLat(point)
    .setHTML(popupContent)
    .addTo(map);

    // Log feature data to console
    console.log('Selected Feature:', feature);
  }
}

// Add this CSS for better popup styling
const setstyle = document.createElement('style');
setstyle.textContent = `
  .mapboxgl-popup-content {
    padding: 15px;
    max-height: 400px;
    overflow-y: auto;
  }

  .mapboxgl-popup-content h3 {
    margin: 0 0 10px 0;
    border-bottom: 1px solid #ccc;
    padding-bottom: 5px;
  }

  .mapboxgl-popup-content h4 {
    margin: 10px 0 5px 0;
  }

  .mapboxgl-popup-content ul {
    margin: 0;
    padding-left: 20px;
  }

  .mapboxgl-popup-content li {
    margin-bottom: 5px;
  }`;
