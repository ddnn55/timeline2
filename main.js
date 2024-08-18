import './style.css'
import javascriptLogo from './javascript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.js'
// import geocoder from 'local-reverse-geocoder';

// geocoder.init({}, function () {
//   console.log('geocoder ready');
// });

import './style.css';
import Map from 'ol/Map.js';
import OSM from 'ol/source/OSM.js';
import TileLayer from 'ol/layer/Tile.js';
import View from 'ol/View.js';
import Overlay from 'ol/Overlay.js';
// import VectorLayer from 'ol/layer/Vector.js';
import Feature from 'ol/Feature.js';
// import VectorSource from 'ol/source/Vector.js';
import Point from 'ol/geom/Point.js';
import LineString from 'ol/geom/LineString.js';
import RegularShape from 'ol/style/RegularShape.js';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj.js';
import {Style, Stroke, Fill} from 'ol/style.js';
import {transform} from 'ol/proj.js';

// log scaler
const logScaler = (x) => (Math.log(x / 1.24040238653 + 0.19381) / Math.log(2)) * Math.pow((x / 1.24040238653 - 0.80619), 4) + 1;

const infoElement = document.querySelector('.info');

const mapDiv = document.createElement('div');
document.body.appendChild(mapDiv);
mapDiv.style.position = 'absolute';
mapDiv.style.top = 0;
mapDiv.style.left = 0;
mapDiv.style.width = '100vw';
mapDiv.style.height = '100vh';

const map = new Map({
  target: mapDiv,
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
  ],
  view: new View({
    center: [0, 0],
    zoom: 2,
  }),
  controls: [] // Remove the buttons from the map
});

var mySlider = new rSlider({
  target: '#sampleSlider',
  values: {min: 0, max: 1},
  step: 0.001,
  range: true,
  tooltip: true,
  scale: true,
  labels: false,
  set: [0, 1],

  // this gets called once upon initialization (and also when the sliders are dragged of course)
  onChange: function (vals) {
    const [normalizedSelectedRangeMin, normalizedSelectedRangeMax] = vals.split(',').map(parseFloat);
    document.body.style.setProperty('--normalizedSelectedRangeMin', normalizedSelectedRangeMin);
    document.body.style.setProperty('--normalizedSelectedRangeMax', normalizedSelectedRangeMax);
  }
});

/**
 * schema of this according to `npx jsonls`:
 * 
 * [].endTime
 * [].startTime
 * [].visit.hierarchyLevel
 * [].visit.topCandidate.probability
 * [].visit.topCandidate.semanticType
 * [].visit.topCandidate.placeID
 * [].visit.topCandidate.placeLocation
 * [].visit.probability
 * [].activity.end - example "geo:34.099208,-118.259178"
 * [].activity.topCandidate.type
 * [].activity.topCandidate.probability
 * [].activity.distanceMeters
 * [].activity.start - example "geo:34.099208,-118.259178"
 * [].activity.probability
 * [].timelinePath[].point
 * [].timelinePath[].durationMinutesOffsetFromStartTime
 * [].timelineMemory.destinations[].identifier
 * [].timelineMemory.distanceFromOriginKms
 */
import data from '/mnt/c/Users/david/Downloads/location-history.json'
// console.log(data)

const activitiesData = data.filter(entry => entry.hasOwnProperty('activity')).sort((a, b) => a.startTime - b.startTime);
activitiesData.forEach(entry => {
  entry.startTime = new Date(entry.startTime);
  entry.endTime = new Date(entry.endTime);
});
console.log({activitiesData});

let vectorLineLayer;


const maxSpeed = Math.max(...activitiesData.map(entry => entry.activity.distanceMeters / (entry.endTime - entry.startTime)));
const timelineStartTime = new Date(Math.min(...activitiesData.map(entry => new Date(entry.startTime))));
// const timelineStartTime = new Date(timelineStartTimeStr);
const timelineEndTime = new Date(Math.max(...activitiesData.map(entry => new Date(entry.endTime))));
const timelineDurationMs = timelineEndTime.getTime() - timelineStartTime.getTime();

console.log({timelineStartTime, timelineEndTime, timelineDurationMs, maxSpeed});

const normalizedActivitiesData = activitiesData.map(entry => {
  const startTime = new Date(entry.startTime);
  const endTime = new Date(entry.endTime);
  const normalizedStartTime = (startTime.getTime() - timelineStartTime.getTime()) / timelineDurationMs;
  const normalizedEndTime = (endTime.getTime() - timelineStartTime.getTime()) / timelineDurationMs;
  const duration = entry.endTime - entry.startTime;
  const speed = entry.activity.distanceMeters / duration;
  const normalizedSpeed = speed/maxSpeed;
  return {
    ...entry,
    normalizedStartTime,
    normalizedEndTime,
    normalizedSpeed,
    speed,
    activity: entry.activity
  };
});

console.log({normalizedActivitiesData});

const minSize = '4px';

normalizedActivitiesData.forEach(entry => {
  const activityDiv = document.createElement('div');
  activityDiv.style.position = 'absolute';
  activityDiv.style.left = `
    calc(
      calc(
        calc(
          ${entry.normalizedStartTime} - var(--normalizedSelectedRangeMin)
        ) / var(--normalizedSelectedRangeWidth)
      ) * 100vw
    )
  `;
  const marginBottom = '0px';
  activityDiv.style.width = `max(${minSize}, ${(entry.normalizedEndTime - entry.normalizedStartTime) * 100}vw`;
  activityDiv.style.bottom = marginBottom;
  activityDiv.style.height = `max(${minSize}, calc(${logScaler(entry.normalizedSpeed)} * calc(100vh - ${marginBottom})))`;
  activityDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  document.body.appendChild(activityDiv);
  activityDiv.addEventListener('mouseover', (event) => {

    // const formattedStartTime = entry.startTime.toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });

    // const formattedStartTime = entry.startTime.toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
    const formattedEndTime = entry.endTime.toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
    const duration = Math.round((entry.endTime - entry.startTime) / (1000 * 60)); // duration in minutes

    infoElement.innerHTML = `
      Arrival time: ${formattedEndTime}<br/>
      Duration: ${duration} minutes<br/>
      Speed: ${Math.round(3600 * entry.speed)} km/h
    `;

    const [endLat, endLong] = entry.activity.end.split(':')[1].split(',').map(parseFloat);
    const [startLat, startLong] = entry.activity.start.split(':')[1].split(',').map(parseFloat);
    const startCoordinate = [startLong, startLat];
    const endCoordinate = [endLong, endLat];

    // const startMarker = new Overlay({
    //   position: startCoordinate,
    //   positioning: 'center-center',
    //   element: document.createElement('div'),
    //   stopEvent: false,
    // });
    // map.addOverlay(startMarker);

    // const endMarker = new Overlay({
    //   position: endCoordinate,
    //   positioning: 'center-center',
    //   element: document.createElement('div'),
    //   stopEvent: false,
    // });
    // map.addOverlay(endMarker);

    const startFeature = new Feature({
      geometry: new Point(fromLonLat(startCoordinate)),
    });
    const endFeature = new Feature({
      geometry: new Point(fromLonLat(endCoordinate)),
    });

    const vectorSource = new VectorSource({
      features: [startFeature, endFeature],
    });
    const lineFeature = new Feature({
      geometry: new LineString([startCoordinate, endCoordinate]),
    });

    const lineSource = new VectorSource({
      features: [lineFeature],
    });

    const lineLayer = new VectorLayer({
      source: lineSource,
    });
    lineLayer.setStyle(new Style({
      stroke: new Stroke({
        color: 'rgba(255, 0, 0, 1)',
        width: 8,
      }),
    }));
    map.addLayer(lineLayer);
    const vectorLayer = new VectorLayer({
      source: vectorSource,
    });

    // map.addLayer(vectorLayer);

    var points = [startCoordinate, endCoordinate];

    for (var i = 0; i < points.length; i++) {
        points[i] = transform(points[i], 'EPSG:4326', 'EPSG:3857');
    }
    
    var featureLine = new Feature({
        geometry: new LineString(points)
    });
    
    var vectorLine = new VectorSource({});
    vectorLine.addFeature(featureLine);
    
    if(vectorLineLayer) {
      map.removeLayer(vectorLineLayer);
    }
    vectorLineLayer = new VectorLayer({
      source: vectorLine,
      style: new Style({
      fill: new Fill({ color: 'rgba(255, 0, 0, 0.8)' }),
      stroke: new Stroke({ color: 'rgba(255, 0, 0, 1)', width: 4 }),
      }),
    });
    const destinationFeature = new Feature({
      geometry: new Point(fromLonLat(endCoordinate)),
    });
    const destinationStyle = new Style({
      fill: new Fill({ color: 'rgba(255, 0, 0, 0.8)' }),
      stroke: new Stroke({ color: 'rgba(255, 0, 0, 1)', width: 4 }),
      image: new RegularShape({
      fill: new Fill({ color: 'rgba(255, 0, 0, 0.8)' }),
      stroke: new Stroke({ color: 'rgba(255, 0, 0, 1)', width: 4 }), 
      points: 3,
      radius: 10,
      rotation: Math.PI / 4,
      }),
    });
    destinationFeature.setStyle(destinationStyle);
    vectorLine.addFeature(destinationFeature);
    map.addLayer(vectorLineLayer);

    const extent = vectorSource.getExtent();
    map.getView().fit(extent, { padding: [400, 400, 400, 400] });


  });
  
  activityDiv.addEventListener('mouseout', () => {
    // const tooltip = document.querySelector('.tooltip');
    // if (tooltip) {
    //   tooltip.remove();
    // }

  });
});


