import React from 'react';
import {createRoot} from 'react-dom/client';
import {ExperienceDetail} from '../../modules/booking/ExperienceDetail';
import {Reservations} from '../../modules/booking/Reservations';
const params=new URLSearchParams(location.search);
let auth={user:params.get('role')?{id:params.get('user')??'a',role:params.get('role'),name:'Persona QA'}:null,loading:false};
const listeners=new Set();
window.qa={path:params.get('view')==='reservations'?'/mis-reservas':'/experiencias/test',snapshot:()=>auth,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},setUser:user=>{auth={user,loading:false};listeners.forEach(fn=>fn());}};
createRoot(document.getElementById('root')).render(params.get('view')==='reservations'?<Reservations worker={params.get('worker')==='1'}/>:<ExperienceDetail id="77777777-7777-4777-8777-777777777777"/>);
