class Record {
  constructor(data) {
    this.oid = data.oid;
    this.cid = data.cid;
    this.tna = data.tna;
    this.rnk = data.rnk;
    this.tid = data.tid;
    this.oei = data.oei;
    this.eag = data.eag;
    this.lag = data.lag;
    this.rid = data.rid;
    this.lng = parseFloat(data.lng); // Convert to float
    this.lat = parseFloat(data.lat); // Convert to float
    this.sfm = data.sfm;
    this.img = "https://images.phylopic.org/images/9e470bbd-0227-40eb-b9de-fd2ad13ec933/raster/1024x637.png?v=1515e2ed66e";

    // Splitting taxonomic name into genus and species
    const taxonomicNameParts = this.tna.split(' ');
    this.genus = taxonomicNameParts[0];
    this.species = taxonomicNameParts.slice(1).join(' ');
  }
}

// Function to fetch records from the URL
async function fetchRecords(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.records) {
      const records = data.records.map(recordData => new Record(recordData));
      console.log(`Number of records retrieved: ${records.length}`);
      return records;
    } else {
      console.error("No records found in the response.");
      return [];
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
}

// Initialize the map with the initial view centered in the northern hemisphere
const map = L.map('map').setView([45, 0], 2);

// Slider event listener
const slider = document.getElementById('slider');
var sliderValue = document.getElementById("slider-value");
slider.addEventListener('input', updateMapOverlay);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri, HERE, Garmin, OpenStreetMap contributors'
}).addTo(map);

// Image overlay layer
let imageOverlay = null;
function updateMapOverlay() {
  const year = parseInt(slider.value); // Assuming the slider value represents the year
  const imagePath = `images/${year}.png`;

  // Set the bounds for the image overlay (adjust these values as needed)
  const bounds = [[-45, -190], [0, -100]]; // Adjust latitude and longitude values

  // Create a custom overlay pane for the image
  const imagePane = map.createPane('imagePane');
  imagePane.style.zIndex = 600; // Ensure it's above other map layers

  // Add the new image overlay with options to prevent stretching
  imageOverlay = L.imageOverlay(imagePath, bounds, { interactive: false, crossOrigin: true, pane: 'imagePane' }).addTo(map);

  // Update other map features based on the slider value if needed
  updateMarkersVisibility();
}

// Initialize an empty array for markers
const markers = [];

// Function to update the visibility of markers based on slider value
function updateMarkersVisibility() {
  sliderValue.textContent = "AGE: " + slider.value + " Ma";
  const currentTime = parseFloat(slider.value);

  markers.forEach(marker => {
      const record = marker.recordData

      const siteAgeStart = parseFloat(record.eag);
      const siteAgeEnd = parseFloat(record.lag);
      const speciationTransition = 2;
      const extinctionTransition = 2;

      let opacity = calculateOpacity(currentTime, siteAgeStart, siteAgeEnd, speciationTransition, extinctionTransition);

      // Set the calculated opacity
      marker.getElement().style.opacity = opacity;

      // Toggle the tooltip based on visibility
      if (opacity > 0.05) {
        marker.unbindTooltip(); // Unbind tooltip if already bound
        marker.bindTooltip(`<strong>${record.genus} ${record.species}</strong><br>Coordinates: ${record.lat} : ${record.lng}<br>Age: ${record.eag}-${record.lag} million years <br> Epoch: ${record.oei}`, { direction: 'top' });
      } else {
        marker.unbindTooltip(); // Unbind tooltip
      }
  });
}

function calculateOpacity(currentTime, siteAgeStart, siteAgeEnd, speciationTransition, extinctionTransition) {
  let opacity = 0;
  
  if (currentTime > (siteAgeStart - speciationTransition) && currentTime < siteAgeStart) {
    const timePassed = currentTime - (siteAgeStart - speciationTransition);
    opacity = timePassed / speciationTransition;
    opacity = Math.max(opacity, 0);
    return opacity;
  }
  if (currentTime > siteAgeStart && currentTime < siteAgeEnd) {
    opacity = 1;
    return opacity;
  } 
  if (currentTime > siteAgeEnd && currentTime < siteAgeEnd + extinctionTransition) {
    const timePassed = currentTime - siteAgeEnd;
    opacity = 1 - timePassed / extinctionTransition;
    // Ensure opacity doesn't go below 0
    opacity = Math.max(opacity, 0);
    return opacity;
  }

  return opacity;
}

// Function to generate a color based on the genus with variations for each species
function generateColor(genus, species) {
  // Simple hash function to generate a unique base color for each genus
  let hash = 0;
  for (let i = 0; i < genus.length; i++) {
    hash = genus.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert the hash to a base hue value
  const baseHue = (hash % 360 + 360) % 360; // Ensure the hue is between 0 and 360

  // Use a constant saturation
  const saturation = 70; // Adjust as needed

  // Fixed lightness value to ensure brighter colors
  const lightness = 55; // Adjust as needed

  // Calculate a unique hue for each species based on the base hue
  const speciesHash = species ? species.charCodeAt(0) + ((species.charCodeAt(1) << 5) - species.charCodeAt(1)) : 0;
  const speciesHue = (speciesHash % 60 + 60) % 60; // Adjust as needed

  // Combine the base hue and species hue to get the final hue
  const finalHue = (baseHue + speciesHue) % 360;

  // Convert HSL to RGB
  const rgbColor = hslToRgb(finalHue / 360, saturation / 100, lightness / 100);

  // Convert RGB to hexadecimal color code
  const fullColor = rgbToHex(rgbColor.r, rgbColor.g, rgbColor.b);

  return fullColor;
}

// Helper function to convert HSL to RGB
function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

// Helper function to convert RGB to hexadecimal color code
function rgbToHex(r, g, b) {
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

// Function to get the PBDB URL based on the input
function getPBDBurl() {
  const inputElement = document.getElementById("speciesInput");
  let inputValue = inputElement.value.trim();
  const defaultGenus = "Mammuthus";
  const defaultSpecies = "primigenius";

  // Check if the input is in the correct format (Genus Species)
  const inputRegex1 = /^[a-zA-Z]+\s[a-zA-Z]+$/;
  // Check if the input is in the correct format (Genus) alone
  const inputRegex2 = /^[a-zA-Z]+$/;

  if (inputRegex1.test(inputValue)) {
    // If the input is in the correct format, extract genus and species
    let [genus, species] = inputValue.split(' ');
    return `https://paleobiodb.org/data1.2/occs/list.json?base_name=${genus}%20${species}&show=coords,strat,stratext,lith,lithext`;
  } else if (inputRegex2.test(inputValue)) {
    genus = inputValue;
    return `https://paleobiodb.org/data1.2/occs/list.json?base_name=${genus}&show=coords,strat,stratext,lith,lithext`
  }else {
    // If the input is not empty but not in the correct format, return default values for genus and species
    alert("Please enter a valid Genus or Genus and Species name in the format 'Genus' or 'Genus species'. Using default value.");
    return `https://paleobiodb.org/data1.2/occs/list.json?base_name=${defaultGenus}%20${defaultSpecies}&show=coords,strat,stratext,lith,lithext`;
  }
}
function getImageUrl(genus, species) {
  // Define a dictionary (key-value pairs) for genus and image paths
  const imagesDict = {
    "Homo": "images/hand.png",
    "Mammuthus": "images/mammoth.png"
    // Add more entries as needed
  };

  // Check if the genus is in the dictionary
  if (genus in imagesDict) {
    // Return the associated image path
    return imagesDict[genus];
  }

  // If the genus is not found, you can return a default image path or handle it as needed
  return "images/fossil2.png";
}

// Function to capitalize the first letter of a string
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Function to clear existing markers from the map
function clearMarkers() {
  markers.forEach(marker => {
    map.removeLayer(marker);
  });

  // Clear the markers array
  markers.length = 0;
}

// Function to initialize marker data with custom icons
async function initMarkers() {
  const PBDBapiUrl = getPBDBurl();

  try {
      const records = await fetchRecords(PBDBapiUrl);

      // Clear existing markers
      clearMarkers();

      records.forEach(record => {
          const backgroundColor = generateColor(record.genus, record.species);
          record.img = getImageUrl(record.genus, record.species);

          const initialOpacity = parseInt(slider.value) >= parseInt(record.oei) && parseInt(slider.value) <= parseInt(record.lag) ? 1 : 0;

          const customIcon = L.divIcon({
              className: 'custom-marker',
              iconSize: [50, 50],
              iconAnchor: [20, 20],
              html: `<div style="background-color: ${backgroundColor}; border: 3px solid; border-color: ${backgroundColor}; border-radius: 50%;  display: flex; align-items: center; justify-content: center; width: 25px; height: 25px;">
                          <img src="${record.img}" alt="${record.tna}" class="marker-image" style="border-radius: 50%; width: 25px; height: 25px; style="opacity: ${initialOpacity}; "/>
                      </div>`
          });

          const marker = L.marker([record.lat, record.lng], {
              icon: customIcon,
          });

          marker.recordData = record;

          // Add a tooltip to the marker with detailed information about the fossil site
          marker.bindTooltip(`<strong>${record.genus} ${record.species}</strong><br>coordinates: ${record.lat} : ${record.lng}<br>Age: ${record.eag}-${record.lag} million years <br> Epoch: ${record.oei}`, { direction: 'top' });
          //marker.bindTooltip(`<strong>${record.species ? `${record.genus} ${record.species}` : record.genus}</strong><br>Latitude: ${record.lat}<br>Longitude: ${record.lng}<br>Age: ${record.eag}-${record.lag} million years <br>formation context: ${record.sfm} <br> Epoch: ${record.oei}`, { direction: 'top' });
          marker.addTo(map);
          markers.push(marker);
      });
    // Initial image overlay based on the initial slider value
    updateMapOverlay();
  } catch (error) {
      console.error('Error fetching data:', error);
      // Handle error, show a message to the user, etc.
  }
}

document.getElementById("searchButton").addEventListener("click", initMarkers);

// Call the function to initialize marker data
initMarkers();