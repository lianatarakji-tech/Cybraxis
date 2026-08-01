import React,{useState} from "react";
import "./AuthScreen.css";

function getPlayers(){

  try{
    return JSON.parse(
      localStorage.getItem("cybraxisPlayers") || "[]"
    );
  }
  catch{
    return [];
  }

}


function savePlayers(players){

  localStorage.setItem(
    "cybraxisPlayers",
    JSON.stringify(players)
  );

}


function createId(){

  return "player_" + Date.now();

}


export default function AuthScreen({onLogin}){

const [mode,setMode]=useState("login");
const [username,setUsername]=useState("");
const [password,setPassword]=useState("");
const [error,setError]=useState("");


function submit(){

const name=username.trim();

if(!name || !password){

setError("Enter username and password");
return;

}


const players=getPlayers();


if(mode==="create"){

if(
players.some(
player=>player.username===name
)
){

setError("Username already exists");
return;

}


const user={

id:createId(),

username:name,

password,

role:"Student SOC Analyst",

createdAt:new Date().toISOString()

};


savePlayers([
...players,
user
]);


onLogin(user.id);

return;

}



const user=players.find(
player=>
player.username===name &&
player.password===password
);


if(!user){

setError("Invalid credentials");
return;

}


onLogin(user.id);


}







return (

<div className="auth-screen">

<div className="auth-background-orb auth-background-orb-one"></div>
<div className="auth-background-orb auth-background-orb-two"></div>


<div className="auth-card">


<div className="auth-logo-wrapper">

<svg className="auth-logo" viewBox="0 0 360 96">
        <defs>
          <linearGradient id="wordCyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00e5ff" />
            <stop offset="52%" stopColor="#54f7ff" />
            <stop offset="100%" stopColor="#b5fbff" />
          </linearGradient>
          <linearGradient id="wordGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffd740" />
            <stop offset="100%" stopColor="#fff2a0" />
          </linearGradient>
          <linearGradient id="wordViolet" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#00e5ff" />
          </linearGradient>
          <filter id="wordGlow" x="-30%" y="-40%" width="160%" height="180%">
            <feGaussianBlur stdDeviation="2.3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g filter="url(#wordGlow)">
          <path className="cy-wordmark-frame" d="M14 48 L42 16 H86 L128 48 L86 80 H42 Z" />
          <path className="cy-wordmark-chevron cy-wordmark-chevron--gold" d="M39 25 L70 48 L39 71" />
          <path className="cy-wordmark-chevron cy-wordmark-chevron--cyan" d="M91 25 L60 48 L91 71" />
          <path className="cy-wordmark-x cy-wordmark-x--a" d="M56 22 L91 74" />
          <path className="cy-wordmark-x cy-wordmark-x--b" d="M92 22 L55 74" />

          <path className="cy-wordmark-circuit" d="M0 48 H27 M113 48 H145 M20 23 H43 M20 73 H43 M96 23 H128 M96 73 H128" />

          <circle cx="39" cy="25" r="3.5" />
          <circle cx="91" cy="71" r="3.5" />
          <circle cx="128" cy="48" r="3.5" />

          <text x="158" y="59" className="cy-wordmark-text">CYBRAXIS</text>
        </g>
      </svg>

</div>


<h1>Cybraxis</h1>

<p className="auth-subtitle">
SOC Analyst Training Platform
</p>


<h2>
Ready to investigate?
</h2>


<input
placeholder="Username"
value={username}
onChange={e=>setUsername(e.target.value)}
/>


<input
type="password"
placeholder="Password"
value={password}
onChange={e=>setPassword(e.target.value)}
/>


{
error &&
<div className="auth-error">
{error}
</div>
}


<button
className="auth-primary"
onClick={submit}
>

{
mode==="login"
?
"Login"
:
"Create Account"
}

</button>



<button

className="auth-secondary"

onClick={()=>{

setMode(
mode==="login"
?
"create"
:
"login"
);

setError("");

}}

>

{
mode==="login"
?
"Create new account"
:
"Back to login"
}

</button>


</div>

</div>

);


}
