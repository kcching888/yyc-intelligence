import React from "react";
import { createRoot } from "react-dom/client";
import { Map, MapPin, CloudSnow, AlertTriangle, Camera, Menu } from "lucide-react";
import "./styles.css";

const corridors = [
  { name: "Deerfoot Trail", state: "Heavy", speed: "38 km/h", incidents: 3, color: "red" },
  { name: "Crowchild Trail", state: "Good", speed: "72 km/h", incidents: 0, color: "green" },
  { name: "Glenmore Trail", state: "Moderate", speed: "55 km/h", incidents: 1, color: "amber" },
  { name: "Stoney Trail", state: "Good", speed: "82 km/h", incidents: 0, color: "green" }
];

function CorridorCard({ item }) {
  return <div className="card corridor">
    <div className="label">{item.name}</div>
    <div className={`state ${item.color}`}>● {item.state}</div>
    <div className="speed">{item.speed}</div>
    <div className="bar"><span className={item.color}></span></div>
    <div className="small">{item.incidents ? `${item.incidents} active incident${item.incidents > 1 ? "s" : ""}` : "No major incidents"}</div>
  </div>;
}

function App() {
  return <main>
    <section className="map-background">
      <div className="map-grid"></div>
      <div className="water bow"></div>
      <div className="route route-red r1"></div><div className="route route-green r2"></div>
      <div className="route route-amber r3"></div><div className="route route-blue r4"></div>
      <div className="road-label l1">Deerfoot Trail</div><div className="road-label l2">Glenmore Trail</div>
      <div className="road-label l3">Crowchild Trail</div><div className="road-label l4">Stoney Trail</div>
      <div className="city-label">CALGARY</div>
      <div className="pin p1"><MapPin size={21}/></div><div className="pin p2"><MapPin size={21}/></div><div className="pin p3"><MapPin size={21}/></div>
      <div className="map-controls"><button>+</button><button>−</button><button><Map size={17}/></button></div>
    </section>

    <header className="topbar">
      <div className="brand card"><div className="brand-title">CALGARY</div><div className="brand-sub">TRAFFIC INTELLIGENCE</div><div className="live">● LIVE <span>Updated 1:07 PM</span></div></div>
      <div className="languages card"><span className="active">EN</span><span>中</span><span>FR</span></div>
      {corridors.map(item => <CorridorCard key={item.name} item={item} />)}
      <div className="card weather"><div className="label">WEATHER</div><div className="weather-main"><CloudSnow size={22}/> 4°C</div><div className="state amber">Snow risk</div><div className="small">Wind 24 km/h</div></div>
      <button className="menu"><Menu size={21}/></button>
    </header>

    <section className="bottom-panel">
      <div className="legend"><span className="dot green"></span> Good <span className="dot amber"></span> Moderate <span className="dot red"></span> Heavy <span className="dot blue"></span> Transit</div>
      <div className="ticker"><span className="badge red">INCIDENT</span> Deerfoot Trail northbound — collision near Glenmore Trail <span className="distance">2 lanes affected</span><span className="info">INFO</span></div>
      <div className="layers"><Camera size={16}/> Cameras <AlertTriangle size={16}/> Incidents <MapPin size={16}/> Transit</div>
    </section>
  </main>
}
createRoot(document.getElementById("root")).render(<App />);