// In public/js/map.js

// Get the div we created in the EJS file
const mapDataElement = document.getElementById('map-data');

// Get the data-listing attribute, and parse it back into a JavaScript object
const listing = JSON.parse(mapDataElement.getAttribute('data-listing'));

// The rest of your map.js code can stay the same!
let mapData = null;

if (listing && listing.geometry && listing.geometry.coordinates && listing.geometry.coordinates.length > 0) {
    mapData = {
        coordinates: listing.geometry.coordinates,
        title: listing.title,
        location: listing.location,
        zoom: 12
    };
} else {
    mapData = {
        coordinates: [78.9629, 20.5937],
        title: "India",
        location: "India",
        zoom: 5
    };
    console.warn("Listing has no coordinates. Map will default to a view of India.");
}

const mapDiv = document.getElementById('map');
if (mapDiv) {
    const map = new maplibregl.Map({
        container: 'map',
        style: 'https://tiles.stadiamaps.com/styles/osm_bright.json',
        center: mapData.coordinates,
        zoom: mapData.zoom
    });

    const markerHtml = `<i class="fa-solid fa-location-arrow"></i>`;
    const popupContent = `<h3>${mapData.title}</h3><p>${mapData.location}</p>`;

    const el = document.createElement('div');
    el.innerHTML = markerHtml;
    el.className = 'custom-marker';

    const popup = new maplibregl.Popup({ offset: 25 }).setHTML(popupContent);

    new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat(mapData.coordinates)
        .setPopup(popup)
        .addTo(map);
}