import {test} from 'node:test';
import assert from 'node:assert/strict';
import {routeGeometryIssue,pointDistance} from '../../modules/journeys/route-quality.ts';
import {routeInputIssue} from '../../modules/journeys/route-input.ts';
const a={id:'a',name:'Salida',label:'Salida',lat:10,lon:-84};
const b={...a,id:'b',lat:10.1}, c={...a,id:'c',lon:-84.1};
const geometry=(...points)=>({type:'MultiLineString',coordinates:[points.map(p=>[p.lon,p.lat])]});
test('detecta un acceso desplazado más de 250 metros sin mover al usuario',()=>{
 assert.match(routeGeometryIssue([a,b],geometry({...a,lon:-84.01},b)),/salida/);
 assert.match(routeGeometryIssue([a,b],geometry(a,{...b,lon:-84.01})),/llegada/);
});
test('tolera el ajuste normal a una carretera cercana',()=>{
 assert.equal(routeGeometryIssue([a,b],geometry({...a,lon:-84.0001},{...b,lon:-84.0001})),null);
});
test('una parada omitida se rechaza aunque salida y llegada sean correctas',()=>{
 assert.match(routeGeometryIssue([a,c,b],geometry(a,b)),/parada 1/);
});
test('las paradas se comprueban sobre segmentos, no solo vértices',()=>{
 const midpoint={...a,id:'medio',lat:10.05};
 assert.equal(routeGeometryIssue([a,midpoint,b],geometry(a,b)),null);
});
test('no acepta las paradas en orden inverso sobre la misma carretera',()=>{
 const near={...a,id:'near',lat:10.02},far={...a,id:'far',lat:10.08};
 assert.match(routeGeometryIssue([a,far,near,b],geometry(a,b)),/parada 2/);
});
test('recorridos circulares y varios tramos conservan sus puntos',()=>{
 assert.equal(routeGeometryIssue([a,c,b,a],geometry(a,c,b,a)),null);
 assert.equal(routeGeometryIssue([a,c,b],{type:'MultiLineString',coordinates:[[[a.lon,a.lat],[c.lon,c.lat]],[[c.lon,c.lat],[b.lon,b.lat]]]}),null);
});
test('dos lugares separados por menos de diez metros no generan un viaje artificial',()=>{
 const near={...a,lat:a.lat+0.00001};
 assert.ok(pointDistance(a,near)<10);assert.ok(routeInputIssue([a,near],'drive'));
 assert.equal(routeInputIssue([a,near],'locations'),null);
 assert.equal(routeInputIssue([a,b,a],'drive'),null);
});
