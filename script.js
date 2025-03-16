fetch("https://api.open-meteo.com/v1/forecast?latitude=35.994&longitude=-78.8986&current_weather=true")
  .then(response => response.json())
  .then(data => {
    console.log(data); 
    console.log("Temperature:", data.current_weather.temperature);
    console.log("Weather Code:", data.current_weather.weathercode);
    document.getElementById("weather").innerText =
      `Temperature: ${data.current_weather.temperature}°C, 
       Weather Code: ${data.current_weather.weathercode}`;
  })
  .catch(error => console.error("Error fetching weather data:", error));


  