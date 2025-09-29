/* ------------------------------ SERVICE WORKER ------------------------------ */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(() => console.log('WeatherNow SW registered'))
    .catch(err => console.error('SW registration failed:', err));
}

/* ------------------------------ CONSTANTS ------------------------------ */
const API_KEY = "1f23c94e3ac6734d533e484a409d6fad"; 
let weatherChart = null;
const $ = id => document.getElementById(id);

/* ------------------------------ DESIGN ICONS ------------------------------ */
const design1Icons = {
  // Common weather icons (can use shared folder if you want)
  "01d":"icons/01d.png","01n":"icons/01n.png","02d":"icons/02d.png","02n":"icons/02n.png",
  "03d":"icons/03d.png","03n":"icons/03n.png","04d":"icons/04d.png","04n":"icons/04n.png",
  "09d":"icons/09d.png","09n":"icons/09n.png","10d":"icons/10d.png","11d":"icons/11d.png",
  "11n":"icons/11n.png","50d":"icons/50d.png","50n":"icons/50n.png","13d":"icons/snowfall.png","13n":"icons/snowfall.png",
  "moon": "icons/moon.png","sun":"icons/sun.png",

  // Uncommon icons inside design1 folder
  "location": "design1/icons/location-icon.png",
  "humidity":"design1/icons/humidity.png",
  "wind":"design1/icons/wind.png",
  "pressure":"design1/icons/pressure.png",
  "uvi":"design1/icons/uvi.png",
  "sunrise":"design1/icons/sunrise.png",
  "sunset":"design1/icons/sunset.png",
  "high":"design1/icons/high-temperature.png",
  "low":"design1/icons/low-temperature.png",
  "visibility":"design1/icons/visibility.png",
  "thinking":"design1/icons/thinking.png",

  // Location icons (shared folder)
  "location":"icons/location-icon.png",
  "locations":"icons/location.png"
};

const design2Icons = {
  // Common weather icons (can use shared folder if you want)
  "01d":"icons/01d.png","01n":"icons/01n.png","02d":"icons/02d.png","02n":"icons/02n.png",
  "03d":"icons/03d.png","03n":"icons/03n.png","04d":"icons/04d.png","04n":"icons/04n.png",
  "09d":"icons/09d.png","09n":"icons/09n.png","10d":"icons/10d.png","11d":"icons/11d.png",
  "11n":"icons/11n.png","50d":"icons/50d.png","50n":"icons/50n.png","13d":"icons/snowfall.png","13n":"icons/snowfall.png",

  // Uncommon icons inside design2 folder
  "location": "design2/icons/location-icon.png",
  "humidity":"design2/icons/humidity.png",
  "wind":"design2/icons/wind.png",
  "pressure":"design2/icons/pressure.png",
  "uvi":"design2/icons/uvi.png",
  "sunrise":"design2/icons/sunrise.png",
  "sunset":"design2/icons/sunset.png",
  "high":"design2/icons/high-temperature.png",
  "low":"design2/icons/low-temperature.png",
  "visibility":"design2/icons/visibility.png",
  "thinking":"design2/icons/thinking.png",

  // Location icons (shared folder)
  "location":"icons/location-icon.png",
  "locations":"icons/location.png"
};

// Default theme (dark)
window.ICONS = design1Icons;


/* ------------------------------ LEAFLET MAP INIT ------------------------------ */
const map = L.map("map", { zoomControl: false }).setView([51.5074, -0.1278], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: ""
}).addTo(map);

map.attributionControl.setPrefix(false);
let mapMarker;

/* ------------------------------ WEATHER FUNCTIONS ------------------------------ */
function hourLabelFromUnix(ts) { 
  return new Date(ts * 1000).getHours() + ":00"; 
}

async function getWeather(city = "London") {
    try {
        // Fetch current weather
        const curRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`);
        const cur = await curRes.json();
        if(cur.cod && cur.cod !== 200) { alert(cur.message || "City not found"); return; }
        const { lat, lon } = cur.coord;

        // Fetch forecast
        const fRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`);
        const forecast = await fRes.json();

        // Fetch daily data
        const omRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,uv_index_max,weathercode&timezone=auto`);
        const dailyData = await omRes.json();

        // ✅ Save to localStorage for offline use
        localStorage.setItem('weatherNow_cur', JSON.stringify(cur));
        localStorage.setItem('weatherNow_forecast', JSON.stringify(forecast));
        localStorage.setItem('weatherNow_daily', JSON.stringify(dailyData));

        renderCurrent(cur);
        renderStats(cur, dailyData);
        renderSunTimes(cur, dailyData);
        renderHourly(forecast);
        renderDaily(dailyData);
        renderChart(forecast);

        addWeatherMarker(lat, lon);

    } catch(err) {
        console.error(err);

        // ❌ If offline or fetch failed, load cached data
        const cur = JSON.parse(localStorage.getItem('weatherNow_cur'));
        const forecast = JSON.parse(localStorage.getItem('weatherNow_forecast'));
        const dailyData = JSON.parse(localStorage.getItem('weatherNow_daily'));

        if(cur && forecast && dailyData){
            alert("Offline: showing last fetched weather data");
            renderCurrent(cur);
            renderStats(cur, dailyData);
            renderSunTimes(cur, dailyData);
            renderHourly(forecast);
            renderDaily(dailyData);
            renderChart(forecast);
            addWeatherMarker(cur.coord.lat, cur.coord.lon);
        } else {
            alert("No cached weather data available offline.");
        }
    }
}


/* ------------------------------ RENDER FUNCTIONS ------------------------------ */
function renderCurrent(cur) {
    const c = $('currentWeather');
    const icon = cur.weather?.[0]?.icon || '01d';
    c.innerHTML = `
        <div class="current-city">${cur.name}, ${cur.sys.country}</div>
        <div class="current-meta">${new Date().toLocaleString(undefined,{weekday:'long',month:'short',day:'numeric'})}</div>
        <div class="current-icon"><img src="${ICONS[icon]}" alt=""></div>
        <div class="current-temp">${Math.round(cur.main.temp)}°C</div>
        <div class="current-desc">${cur.weather[0]?.description || ''}</div>
    `;
}

function renderStats(cur, daily) {
  const c = $('statsGrid');
  const feels = Math.round(cur.main.feels_like),
        humidity = cur.main.humidity,
        wind = cur.wind.speed,
        pressure = cur.main.pressure,
        visibility = cur.visibility ? (cur.visibility/1000).toFixed(1) + ' km' : '—',
        uv = daily?.daily?.uv_index_max ? [daily.daily.uv_index_max[0]] : '—';

  c.innerHTML = `
    <div class="stat">
      <div class="label">Feels Like</div>
      <img src="${ICONS["thinking"]}" alt="">
      <div class="value">${feels}°C</div>
    </div>
    <div class="stat">
      <div class="label">Humidity</div>
      <img src="${ICONS["humidity"]}" alt="">
      <div class="value">${humidity}%</div>
    </div>
    <div class="stat">
      <div class="label">Wind</div>
      <img src="${ICONS["wind"]}" alt="">
      <div class="value">${wind} m/s</div>
    </div>
    <div class="stat">
      <div class="label">Pressure</div>
      <img src="${ICONS["pressure"]}" alt="">
      <div class="value">${pressure} hPa</div>
    </div>
    <div class="stat">
      <div class="label">Visibility</div>
      <img src="${ICONS["visibility"]}" alt="">
      <div class="value">${visibility}</div>
    </div>
    <div class="stat">
      <div class="label">UV Index</div>
      <img src="${ICONS["uvi"]}" alt="">
      <div class="value">${uv}</div>
    </div>
  `;
}

function renderSunTimes(cur, daily) {
  const el = $('sunGrid');
  const sunrise = new Date(cur.sys.sunrise*1000).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  const sunset = new Date(cur.sys.sunset*1000).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  const todayMax = daily?.daily?.temperature_2m_max ? [Math.round(daily.daily.temperature_2m_max[0])+'°C'] : '—';
  const todayMin = daily?.daily?.temperature_2m_min ? [Math.round(daily.daily.temperature_2m_min[0])+'°C'] : '—';

  el.innerHTML = `
    <div class="sun-tile">
      <div class="label">Sunrise</div>
      <img src="${ICONS["sunrise"]}" alt="">
      <div class="value">${sunrise}</div>
    </div>
    <div class="sun-tile">
      <div class="label">Sunset</div>
      <img src="${ICONS["sunset"]}" alt="">
      <div class="value">${sunset}</div>
    </div>
    <div class="sun-tile">
      <div class="label">High / Low</div>
      <img src="${ICONS["high"]}" alt="">
      <div class="value">${todayMax} / ${todayMin}</div>
    </div>
  `;
}


function renderHourly(forecast) {
    const el = $('hourlyForecast');
    if(!forecast?.list) { el.innerHTML=''; return; }
    const html = forecast.list.slice(0,12).map(i => `
        <div class="forecast-tile">
            <div class="muted">${hourLabelFromUnix(i.dt)}</div>
            <img src="${ICONS[i.weather[0].icon]||ICONS["01d"]}" alt="">
            <div class="bold">${Math.round(i.main.temp)}°</div>
        </div>
    `).join('');
    el.innerHTML = `<h4 class="section-title">Hourly Forecast</h4><div class="forecast-grid">${html}</div>`;
}

function renderDaily(dailyData) {
    const el = $('dailyForecast');
    if(!dailyData?.daily) { el.innerHTML=''; return; }
    const html = dailyData.daily.time.slice(0,7).map((d,i) => `
        <div class="forecast-tile">
            <div class="muted">${new Date(d).toLocaleDateString(undefined,{weekday:'short'})}</div>
            <img src="${ICONS["01d"]}" alt="">
            <div class="bold">${Math.round(dailyData.daily.temperature_2m_max[i])}° / ${Math.round(dailyData.daily.temperature_2m_min[i])}°</div>
        </div>
    `).join('');
    el.innerHTML = `<h4 class="section-title">Daily Forecast</h4><div class="forecast-grid">${html}</div>`;
}

function renderChart(forecast){ 
  const ctx = $('weatherChart').getContext('2d');
  const labels = forecast.list.slice(0,12).map(i => hourLabelFromUnix(i.dt)); 
  const temps = forecast.list.slice(0,12).map(i => Math.round(i.main.temp)); 
  const hums = forecast.list.slice(0,12).map(i => i.main.humidity); 
  const pressure = forecast.list.slice(0,12).map(i => i.main.pressure); 

  if(weatherChart) weatherChart.destroy();

  weatherChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels,
        datasets: [
            {
                label: 'Temp °C',
                data: temps,
                borderColor: '#ff6b6b',
                backgroundColor: 'rgba(255,107,107,0.08)',
                tension: 0.3,
                pointRadius: 2
            },
            {
                label: 'Humidity %',
                data: hums,
                borderColor: '#4dabf7',
                backgroundColor: 'rgba(77,171,247,0.06)',
                tension: 0.3,
                pointRadius: 2
            },
            {
                label: 'Pressure hPa',
                data: pressure,
                borderColor: '#9b59b6',
                backgroundColor: 'rgba(155,89,182,0.08)',
                tension: 0.3,
                pointRadius: 2
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                display: false, // hide default legend
            },
            tooltip: {
                enabled: true, // show label on hover
                mode: 'index',
                intersect: false
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        },
        scales: {
            x: { ticks: { color: '#bcd6e8' }, grid: { display: false } },
            y: { ticks: { color: '#bcd6e8' }, grid: { color: 'rgba(255,255,255,0.02)' } }
        }
    }
  });
}

/* ------------------------------ UI EVENTS ------------------------------ */
$('searchBtn').addEventListener('click', () => {
    const q = $('cityInput').value.trim();
    if(q) getWeather(q);
});

$('geoBtn').addEventListener('click', () => {
    if(!navigator.geolocation) return alert('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(pos => {
        const { latitude, longitude } = pos.coords;
        (async () => {
            try {
                const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`);
                const data = await res.json();
                if(data?.name){ $('cityInput').value = data.name; getWeather(data.name); }
                else getWeatherByCoords(latitude, longitude);
            } catch(e) { console.error(e); getWeatherByCoords(latitude, longitude); }
        })();
    }, err => alert('Unable to get location'));
});

/* ------------------------------ WEATHER MARKER ------------------------------ */
async function addWeatherMarker(lat, lon, zoom = 8) {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
    const data = await res.json();
    if(!data || !data.weather || !data.weather[0]) return;

    if(mapMarker) map.removeLayer(mapMarker);

    const customIcon = L.icon({
      iconUrl: ICONS["locations"],
      iconSize: [40,40],
      iconAnchor: [20,40],
      popupAnchor: [0,-40]
    });

    mapMarker = L.marker([lat, lon], { icon: customIcon, riseOnHover: true })
      .addTo(map)
      .bindPopup(`
          <b>${data.name || "Unknown Location"}</b><br>
          Temp: ${Math.round(data.main.temp)}°C<br>
          Feels like: ${Math.round(data.main.feels_like)}°C<br>
          Humidity: ${data.main.humidity}%<br>
          Wind: ${data.wind.speed} m/s<br>
          <i>${data.weather[0].description || ""}</i>
      `).openPopup();

    map.setView([lat, lon], zoom, { animate:true });
  } catch(err) { console.error("Weather marker error:", err); }
}

/* ------------------------------ THEME TOGGLE ------------------------------ */
const themeBtn = document.getElementById('themeBtn');
const themeIcon = document.getElementById('themeIcon');
const themeCSS = document.getElementById('themeCSS');
const favicon = document.getElementById('favicon');

let isDark = true; // default dark theme

function applyTheme(dark) {
    const timestamp = new Date().getTime(); // prevent favicon caching

    if (dark) {
        // Dark theme (design1)
        themeCSS.href = 'design1/style.css';
        window.ICONS = design1Icons;

        // Favicon = moon, toggle icon = sun
        if (favicon) favicon.href = `icons/moon.png?${timestamp}`;
        themeIcon.src = 'icons/sun.png';

    } else {
        // Light theme (design2)
        themeCSS.href = 'design2/style.css';
        window.ICONS = design2Icons;

        // Favicon = sun, toggle icon = moon
        if (favicon) favicon.href = `icons/sun.png?${timestamp}`;
        themeIcon.src = 'icons/moon.png';
    }

    // Reload weather with current city to update icons
    const city = document.getElementById('cityInput')?.value || 'London';
    getWeather(city);
}

// Apply default theme after DOM loads
document.addEventListener('DOMContentLoaded', () => {
    applyTheme(isDark);
});

// Toggle button click event
themeBtn.addEventListener('click', () => {
    isDark = !isDark;
    applyTheme(isDark);
});


/* ------------------------------ DEFAULT ------------------------------ */
getWeather('London');

