import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {JourneyEditor} from '@/modules/journeys/JourneyEditor';
import {PublicationForm} from '@/modules/publications/components/PublicationForm';
import {emptyJourney, type Journey} from '@/modules/journeys/types';
import type {CreatePublicationInput} from '@/modules/publications/types/publication.types';
import '@/app/globals.css';

// Test-only host: real production components, deterministic API fixtures supplied
// by Playwright. No auth bypass or test routes are added to the application.
const initial:CreatePublicationInput={serviceType:'EXCURSION',title:'Recorrido de prueba',description:'Una experiencia por Costa Rica',pricePerPerson:50,durationMinutes:120,defaultCapacity:10,included:'Guía',notIncluded:'Alimentación',languageIds:[1],mainImageUrl:'https://example.com/photo.jpg'};
function Harness(){
  const [journey,setJourney]=useState<Journey|null>(emptyJourney());
  const [meeting,setMeeting]=useState('');
  const [saved,setSaved]=useState<CreatePublicationInput|null>(null);
  return <main style={{maxWidth:1200,margin:'0 auto',padding:16}}>
    {location.search.includes('form')?<PublicationForm initialValue={initial} onCancel={()=>{}} onSubmit={setSaved}/>:
      <JourneyEditor value={journey} onChange={setJourney} meetingPoint={meeting} onMeetingPointChange={setMeeting} isExcursion={location.search.includes('excursion')}/>}
    <output data-testid="journey-state" hidden>{JSON.stringify(journey)}</output>
    <output data-testid="saved-state" hidden>{JSON.stringify(saved)}</output>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Harness/>);
