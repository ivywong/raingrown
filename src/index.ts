import { fetchWeatherApi } from "openmeteo";
import "./style.css";

const plantStages = [".", "☀︎", "❂", "🌱", ["🌼", "🌺", "🏵️", "🌸", "🌻"]];
const garden = [];
let isRaining = true;
let raindrops = [];
const rainFrames = ["·", "☀︎", "◌"];

async function getLatLong(query: string) {
  const escapedQuery = encodeURIComponent(query);
  const url: string = `https://geocoding-api.open-meteo.com/v1/search?name=${escapedQuery}&count=10&language=en&format=json`;

  const response = await fetch(url);
  const data = await response.json();
  if (data.results && data.results.length > 0) {
    console.log(data.results[0]);
    return data.results[0];
  } else {
    return null;
  }
}

async function queryRain() {
  const latitudes: string[] = [];
  const longitudes: string[] = [];

  const input = document.getElementById("cityInput") as HTMLInputElement;
  const city = input.value;
  const cities = ["New Portland"];
  if (city) {
    cities.pop();
    cities.push(city);
  }

  const displayInfo = document.getElementById(
    "locationInfo",
  ) as HTMLParagraphElement;
  const rainInfo = document.getElementById("rainInfo") as HTMLParagraphElement;

  const geoData = await getLatLong(city);
  if (geoData) {
    latitudes.push(geoData.latitude);
    longitudes.push(geoData.longitude);
  } else {
    console.error(`City ${city} not found.`);
    return;
  }
  displayInfo.textContent = `current garden location: ${geoData.name.toLowerCase()}, ${geoData.country_code.toLowerCase()}`;

  console.log(latitudes, longitudes);

  const params = {
    latitude: latitudes,
    longitude: longitudes,
    current: ["temperature_2m", "precipitation", "rain", "showers"],
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: "GMT",
  };
  const url = "https://api.open-meteo.com/v1/forecast";
  const responses = await fetchWeatherApi(url, params);

  for (const res of responses) {
    const response = res;

    // Attributes for timezone and location
    const utcOffsetSeconds = response.utcOffsetSeconds();

    const current = response.current()!;

    // Note: The order of weather variables in the URL query and the indices below need to match!
    const weatherData = {
      current: {
        time: new Date((Number(current.time()) + utcOffsetSeconds) * 1000),
        temperature2m: current.variables(0)!.value(),
        precipitation: current.variables(1)!.value(),
        rain: current.variables(2)!.value(),
        showers: current.variables(3)!.value(),
      },
    };

    console.log(
      weatherData.current.time.toISOString(),
      weatherData.current.temperature2m,
      weatherData.current.precipitation,
      weatherData.current.rain,
      weatherData.current.showers,
    );

    isRaining = weatherData.current.rain > 0 || weatherData.current.showers > 0;

    if (isRaining) {
      const precip = weatherData.current.precipitation.toLocaleString("en-US", {
        maximumFractionDigits: 4,
        minimumFractionDigits: 2,
      });
      rainInfo.textContent = `it is raining. total precipitation: ${precip}mm`;
    } else {
      rainInfo.textContent = `it is not raining.`;
    }
  }
}

function createPlant() {
  return {
    frame: 0,
    x: Math.random() * document.documentElement.clientWidth,
    y: Math.random() * document.documentElement.clientHeight,
    type: Math.floor(
      Math.random() * plantStages[plantStages.length - 1].length,
    ),
    planted: Date.now(),
    updated: Date.now(),
    hasBee: false,
  };
}

function updateGarden() {
  const plants = [];

  if (isRaining) {
    for (let i = 0; i < garden.length; i++) {
      const plant = garden[i];
      if (
        plant.frame < plantStages.length - 1 &&
        Date.now() - plant.updated >
        10000 + Math.floor(Math.random() * 1000 - 2000) // difference in ms
      ) {
        plant.frame += 1;
        plant.updated = Date.now();
      }

      if (Math.random() < 0.02) {
        plant.hasBee = !plant.hasBee;
      }

      const el = document.createElement("pre");
      el.classList.add("plot");
      el.innerHTML = garden[i];
      plants.push(el);
    }

    if (garden.length < 10) {
      for (let i = 0; i < 10; i++) {
        garden.push(createPlant());
      }
    }

    if (garden.length < 100 && Math.random() < 0.2) {
      garden.push(createPlant());
    }
  }
  const gardenRender = document.getElementById("garden") as HTMLDivElement;

  gardenRender.replaceChildren();
  for (const plant of garden) {
    const el = document.createElement("div");
    el.classList.add("plant");
    if (plant.frame < plantStages.length - 1) {
      el.textContent = plantStages[plant.frame] as string;
    } else {
      el.textContent = plantStages[plant.frame][plant.type];
      if (plant.hasBee) {
        el.textContent += "🐝️";
      }
    }
    el.style.top = `${plant.y + Math.random() * 2 - 5}px`;
    el.style.left = `${plant.x + Math.random() * 2 - 5}px`;
    gardenRender.appendChild(el);
  }
}

function updateRain() {
  const rain = document.getElementById("rain") as HTMLDivElement;
  if (!isRaining) {
    raindrops = [];
    return;
  }

  for (let i = 0; i < raindrops.length; i++) {
    const drop = raindrops[i];
    if (drop.frame == rainFrames.length - 1) {
      drop.delete = true;
    } else {
      drop.frame = (drop.frame + 1) % rainFrames.length;
    }
  }

  raindrops = raindrops.filter((d) => !d.delete);
  if (raindrops.length < 50) {
    for (let i = 0; i < Math.random() * 10; i++) {
      raindrops.push({
        frame: 0,
        x: Math.random() * document.documentElement.clientWidth,
        y: Math.random() * document.documentElement.clientHeight,
      });
    }
  }

  rain.replaceChildren();
  for (const drop of raindrops) {
    const el = document.createElement("div");
    el.classList.add("raindrop");
    el.textContent = rainFrames[drop.frame];
    el.style.top = `${drop.y}px`;
    el.style.left = `${drop.x}px`;
    rain.appendChild(el);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const submit = document.getElementById("queryRain") as HTMLButtonElement;

  submit.onclick = () => {
    queryRain();
  };

  setInterval(updateGarden, 200);
  setInterval(updateRain, 80);
});
