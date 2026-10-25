import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validatePresence,upcomingEvents,eventsHTML,socialsHTML,eventICS,platforms} from '../runtime/presence.mjs';
import {rememberConnection,rememberedConnection,forgottenConnection} from '../editor/connection.mjs';
const event=(id,start,end)=>({id,title:'Live set',start,end});
test('optional calendar stays absent when disabled, empty, past or cancelled',()=>{
 const now=Date.parse('2030-06-01T12:00:00Z');
 for(const calendar of [undefined,{enabled:false,events:[event('future','2030-06-02T12:00:00Z')]},{enabled:true,events:[]},{enabled:true,events:[event('past','2030-05-01T12:00:00Z'),{...event('cancelled','2030-06-02T12:00:00Z'),cancelled:true}]}])assert.equal(eventsHTML({calendar},now),'');
});
test('ongoing gigs remain visible and future events sort by actual instant',()=>{
 const c={enabled:true,events:[event('later','2030-06-02T22:00:00+02:00'),event('ongoing','2030-06-01T11:00:00Z','2030-06-01T13:00:00Z'),event('next','2030-06-02T17:00:00Z')]};
 assert.deepEqual(upcomingEvents(c,Date.parse('2030-06-01T12:00:00Z')).map(e=>e.id),['ongoing','next','later']);
});
test('validate event offset, end order, timezone, duplicate IDs and URLs',()=>{
 const base={enabled:true,timezone:'Europe/Amsterdam',events:[event('one','2030-06-01T20:00:00+02:00','2030-06-01T23:00:00+02:00')]};validatePresence({calendar:base});
 for(const patch of [{timezone:'Invalid/Zone'},{events:[event('one','2030-06-01T20:00')]},{events:[event('one','2030-06-01T20:00:00Z','2030-06-01T19:00:00Z')]},{events:[...base.events,...base.events]},{events:[{...base.events[0],url:'javascript:alert(1)'}]}])assert.throws(()=>validatePresence({calendar:{...base,...patch}}));
});
test('many named platforms, custom link labels, escaped monochrome SVG markup',()=>{
 assert.ok(Object.keys(platforms).length>65);assert.equal(socialsHTML({}),'');
 const c={socials:{heading:'Available <on>',links:[{platform:'spotify',url:'https://open.spotify.com/artist/123'},{platform:'custom',label:'Other <service>',url:'https://example.com'}]}};validatePresence(c);const html=socialsHTML(c);assert.match(html,/<svg/);assert.match(html,/Available &lt;on&gt;/);assert.match(html,/Other &lt;service&gt;/);assert.match(html,/noopener noreferrer/);
 assert.throws(()=>validatePresence({socials:{links:[{platform:'spotify',url:'javascript:alert(1)'}]}}));
 assert.throws(()=>validatePresence({socials:{links:[{platform:'custom',url:'https://example.com'}]}}));
 validatePresence({socials:{links:[{platform:'email',url:'mailto:artist@example.com'}]}});
});
test('ICS exports UTC dates and escapes newline, commas and long unicode fields',()=>{
 const e={...event('show','2030-10-26T23:00:00+02:00','2030-10-27T03:00:00+01:00'),title:'DJ, Live; Set',description:'One\nTwo '+ 'é'.repeat(120)};const ics=eventICS(e,'Artist',new Date('2030-01-01T00:00:00Z'));
 assert.match(ics,/DTSTART:20301026T210000Z/);assert.match(ics,/DTEND:20301027T020000Z/);assert.ok(ics.includes('SUMMARY:DJ\\, Live\\; Set'));assert.ok(ics.includes('One\\nTwo'));
 for(const line of ics.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);
});
test('remembered connection is opt-in, expires, and can be forgotten',()=>{
 const data=new Map();const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 assert.equal(rememberedConnection(storage,0),null);rememberConnection(storage,{repository:'owner/site',branch:'main',token:'secret'},100);assert.equal(rememberedConnection(storage,101).token,'secret');assert.equal(rememberedConnection(storage,100+31*86400000),null);assert.equal(data.size,0);
 rememberConnection(storage,{repository:'owner/site',branch:'main',token:'secret'},100);forgottenConnection(storage);assert.equal(data.size,0);
});
