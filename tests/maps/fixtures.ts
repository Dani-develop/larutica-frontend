import type {JourneyPlace,JourneyMode} from '../../modules/journeys/types';
export const places:JourneyPlace[]=[
  {id:'heredia',name:'Heredia',label:'Heredia, Heredia, Costa Rica',lat:9.9984272,lon:-84.1171215,type:'city',province:'Heredia',canton:'Heredia',country:'Costa Rica'},
  {id:'fortuna',name:'La Fortuna',label:'La Fortuna, San Carlos, Alajuela, Costa Rica',lat:10.4713,lon:-84.6453,type:'city',province:'Alajuela',canton:'San Carlos',district:'La Fortuna',country:'Costa Rica'},
  {id:'ramon',name:'San Ramón',label:'San Ramón, Alajuela, Costa Rica',lat:10.087,lon:-84.4702,type:'city',province:'Alajuela',canton:'San Ramón',country:'Costa Rica'},
  {id:'zarcero',name:'Zarcero',label:'Zarcero, Alajuela, Costa Rica',lat:10.184,lon:-84.391,type:'city',province:'Alajuela',canton:'Zarcero',country:'Costa Rica'},
];
export function calculated(points:JourneyPlace[],mode:JourneyMode='drive'){
  return {version:1,mode,points,geometry:{type:'MultiLineString',coordinates:points.slice(1).map((p,i)=>[[points[i].lon,points[i].lat],[p.lon,p.lat]])},
    distance:points.length*12000,duration:points.length*600,integrity:'a'.repeat(64),confirmedAt:null,meetingLocation:null};
}
