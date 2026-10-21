import type { Journey, JourneyPlace } from "./types";
export function changeJourney(journey: Journey, update: Partial<Journey>, recalculate = true): Journey {
  const next = {...journey,...update,confirmedAt:null};
  if (next.meetingAtOrigin && update.points) next.meetingLocation = next.points[0] ?? null;
  if (recalculate) Object.assign(next,{geometry:null,distance:null,duration:null,integrity:null});
  return next;
}
export function resolveJourneyPoint(journey: Journey, original: JourneyPlace, resolved: JourneyPlace): Journey {
  let matched = false;
  const points = journey.points.map(point => {
    if (point?.adjusted && point.id === original.id && point.lat === original.lat && point.lon === original.lon) {
      matched = true; return {...resolved,id:point.id,lat:point.lat,lon:point.lon,adjusted:true};
    }
    return point;
  });
  return matched ? changeJourney(journey,{points},false) : journey;
}
