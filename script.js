document.addEventListener("DOMContentLoaded", () => {
  // API Keys
  const API_KEY = "1f1c02f556ae48f290d82912251108";
  const BASE_URL = "https://api.weatherapi.com/v1";

  // DOM Elements
  const $ = (id) => document.getElementById(id);
  const DOM = {
    cityInput: $("cityInput"),
    currentWeather: $("currentWeather"),
    forecastContainer: $("forecastContainer"),
    weatherDetails: $("weatherDetails"),
    errorMessage: $("errorMessage"),
    unitToggle: $("unitToggle"),
    searchBtn: $("searchBtn"),
    locationBtn: $("locationBtn"),
  };

  // App State
  let currentUnit = "C";
  let weatherData = null;

  // Event listeners
  DOM.unitToggle.addEventListener("change", toggleUnits);
  DOM.searchBtn.addEventListener("click", searchCity);
  DOM.cityInput.addEventListener(
    "keyup",
    (e) => e.key === "Enter" && searchCity()
  );
  DOM.locationBtn.addEventListener("click", useCurrentLocation);

  // Location check
  checkSavedLocation();

  // Toggle between Celsius and Fahrenheit
  function toggleUnits() {
    currentUnit = DOM.unitToggle.checked ? "F" : "C";
    if (weatherData) displayWeather(weatherData);
  }

  // Location handling
  function checkSavedLocation() {
    const coords = localStorage.getItem("userLocation");
    const permission = localStorage.getItem("locationPermission");

    if (permission === "granted" && coords) {
      const { latitude, longitude } = JSON.parse(coords);
      fetchWeatherByCoords(latitude, longitude);
    } else if (permission !== "denied") {
      requestLocation();
    } else {
      showError("Location permission denied. Please search for a city.");
    }
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      showError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        saveLocation(coords);
        fetchWeatherByCoords(coords.latitude, coords.longitude);
      },
      handleLocationDenied,
      { timeout: 10000 }
    );
  }

  function saveLocation({ latitude, longitude }) {
    localStorage.setItem("locationPermission", "granted");
    localStorage.setItem(
      "userLocation",
      JSON.stringify({ latitude, longitude })
    );
  }

  function handleLocationDenied() {
    localStorage.setItem("locationPermission", "denied");
    showError("Location permission denied. Please search for a city.");
    clearDisplay();
  }

  function useCurrentLocation() {
    requestLocation();
  }

  // Weather data fetching
  async function fetchWeather(query) {
    try {
      showSkeleton();
      const res = await fetch(
        `${BASE_URL}/forecast.json?key=${API_KEY}&q=${query}&days=7`
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "Location not found");
      }

      const data = await res.json();
      weatherData = data;
      DOM.cityInput.value = data.location.name;
      displayWeather(data);
    } catch (err) {
      showError(err.message);
      clearDisplay();
    }
  }

  function fetchWeatherByCity(city) {
    fetchWeather(encodeURIComponent(city));
  }

  function fetchWeatherByCoords(lat, lon) {
    fetchWeather(`${lat},${lon}`);
  }

  function searchCity() {
    const city = DOM.cityInput.value.trim();
    if (!city) {
      showError("Please enter a city name");
      return;
    }
    fetchWeatherByCity(city);
  }

  // Display functions
  function displayWeather(data) {
    displayCurrent(data);
    displayForecast(data);
    displayDetails(data);
    clearError();
  }

  // Today Weather
  function displayCurrent({ location, current }) {
    const temp = currentUnit === "C" ? current.temp_c : current.temp_f;
    const feels =
      currentUnit === "C" ? current.feelslike_c : current.feelslike_f;

    const icon = current.condition.icon.startsWith("//")
      ? "https:" + current.condition.icon
      : current.condition.icon;

    DOM.currentWeather.innerHTML = `
      <div class="flex flex-col md:flex-row justify-between items-center gap-6">
        <div class="flex flex-col text-center md:text-left">
          <h2 class="text-2xl font-bold text-gray-800">
            ${location.name}, ${location.country}
          </h2>
          <p class="text-gray-600">
            ${new Date(location.localtime).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}
          </p>
        </div>
        <div class="flex items-center gap-4">
          <img src="${icon}" alt="${current.condition.text}" class="w-16 h-16" loading="lazy" />
          <div class="flex flex-col">
            <div class="text-5xl font-light text-gray-800">
              ${Math.round(temp)}°${currentUnit}
            </div>
            <div class="text-gray-500 text-sm md:text-base -mt-1">
              Feels like ${Math.round(feels)}°${currentUnit}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 7-Day Forecast
  function displayForecast({ forecast }) {
    const allDays = forecast.forecastday;
    const todayIndex = 1;
    const result = [];

    for (let i = 1; i <= 7; i++) {
      const index = (todayIndex + i) % allDays.length;
      result.push(allDays[index]);
    }

    DOM.forecastContainer.innerHTML = result
      .map((day) => {
        const date = new Date(day.date);
        const maxTemp = Math.round(
          currentUnit === "C" ? day.day.maxtemp_c : day.day.maxtemp_f
        );
        const minTemp = Math.round(
          currentUnit === "C" ? day.day.mintemp_c : day.day.mintemp_f
        );
        const icon = day.day.condition.icon.startsWith("//")
          ? "https:" + day.day.condition.icon
          : day.day.condition.icon;

        return `
        <div class="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-3 text-center border border-white/50 transition-all hover:shadow-md">
          <h3 class="font-medium text-xs uppercase tracking-wider text-gray-500 mb-1">
            ${date.toLocaleDateString("en-US", { weekday: "short" })}
          </h3>
          <img src="${icon}" alt="${day.day.condition.text}" 
               class="w-10 h-10 mx-auto my-1" loading="lazy" />
          <div class="flex justify-center items-baseline gap-1">
            <span class="text-lg font-semibold text-gray-800">${maxTemp}</span>
            <span class="text-gray-400">/</span>
            <span class="text-gray-500">${minTemp}°</span>
          </div>
          <p class="text-xs text-gray-500 mt-1 truncate">
            ${day.day.condition.text}
          </p>
        </div>
      `;
      })
      .join("");
  }

  // Weather details
  function displayDetails({ current, forecast }) {
    const today = forecast.forecastday[0].day;
    const wind =
      currentUnit === "C"
        ? `${current.wind_kph} km/h`
        : `${current.wind_mph} mph`;
    const pressure =
      currentUnit === "C"
        ? `${current.pressure_mb} mb`
        : `${current.pressure_in} in`;

    const details = [
      {
        icon: "fa-wind text-blue-500",
        label: "Wind",
        value: wind,
        description: current.wind_dir,
      },
      {
        icon: "fa-tint text-blue-400",
        label: "Humidity",
        value: `${current.humidity}%`,
        description: getHumidityLevel(current.humidity),
      },
      {
        icon: "fa-tachometer-alt text-blue-600",
        label: "Pressure",
        value: pressure,
        description: getPressureTrend(current.pressure_mb),
      },
      {
        icon: "fa-sun text-yellow-500",
        label: "UV Index",
        value: current.uv,
        description: getUvDescription(current.uv),
        extraClass: `uv-bg-${getUvLevel(current.uv)}`,
      },
      {
        icon: "fa-cloud-rain text-blue-500",
        label: "Precipitation",
        value: `${today.daily_chance_of_rain}%`,
        description:
          today.totalprecip_mm > 0
            ? `${currentUnit === "C"
              ? today.totalprecip_mm + "mm"
              : today.totalprecip_in + "in"
            }`
            : "",
      },
    ];

    DOM.weatherDetails.innerHTML = details
      .map(
        (d) => `
      <div class="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-3 text-center border border-white/50 transition-all hover:shadow-md ${d.extraClass || ""
          }">
        <div class="flex flex-col items-center h-full space-y-1">
          <i class="fas ${d.icon} text-xl mb-1"></i>
          <h3 class="font-medium text-xs text-gray-600">${d.label}</h3>
          <p class="text-base font-semibold text-gray-800">${d.value}</p>
          ${d.description
            ? `<p class="text-xs text-gray-500 mt-0.5">${d.description}</p>`
            : ""
          }
        </div>
      </div>
    `
      )
      .join("");
  }

  // Helper functions
  function getUvDescription(uv) {
    if (uv < 3) return "Low";
    if (uv < 6) return "Moderate";
    if (uv < 8) return "High";
    if (uv < 11) return "Very High";
    return "Extreme";
  }
  function getUvLevel(uv) {
    if (uv < 3) return "low";
    if (uv < 6) return "moderate";
    if (uv < 8) return "high";
    if (uv < 11) return "very-high";
    return "extreme";
  }
  function getHumidityLevel(humidity) {
    if (humidity < 30) return "Dry";
    if (humidity < 60) return "Comfortable";
    if (humidity < 80) return "Moderate";
    return "High";
  }
  function getPressureTrend(pressure) {
    if (pressure < 1000) return "Low";
    if (pressure > 1020) return "High";
    return "Normal";
  }

  // UI helper functions
  function showSkeleton() {
    DOM.currentWeather.innerHTML = `
      <div class="animate-pulse">
        <div class="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
        <div class="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 bg-gray-300 rounded-full"></div>
          <div>
            <div class="h-8 bg-gray-300 rounded w-24 mb-2"></div>
            <div class="h-4 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
      </div>
    `;

    DOM.forecastContainer.innerHTML = Array(7)
      .fill(
        `
      <div class="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-3 text-center border border-white/50 animate-pulse">
        <div class="h-3 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
        <div class="w-10 h-10 bg-gray-300 rounded-full mx-auto my-2"></div>
        <div class="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-1"></div>
        <div class="h-3 bg-gray-100 rounded w-2/3 mx-auto"></div>
      </div>
    `
      )
      .join("");

    DOM.weatherDetails.innerHTML = Array(5)
      .fill(
        `
      <div class="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-3 text-center border border-white/50 animate-pulse">
        <div class="w-6 h-6 bg-gray-300 rounded-full mx-auto mb-2"></div>
        <div class="h-3 bg-gray-200 rounded w-1/2 mx-auto mb-1"></div>
        <div class="h-4 bg-gray-300 rounded w-1/3 mx-auto"></div>
      </div>
    `
      )
      .join("");
  }

  function showError(msg) {
    DOM.currentWeather.innerHTML = `
      <div class="text-center py-8 text-red-500">
        <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
        <p>${msg}</p>
      </div>`;
    DOM.errorMessage.textContent = msg;
    clearDisplay();
  }
  function clearError() {
    DOM.errorMessage.textContent = "";
  }
  function clearDisplay() {
    DOM.forecastContainer.innerHTML = "";
    DOM.weatherDetails.innerHTML = "";
  }
});
