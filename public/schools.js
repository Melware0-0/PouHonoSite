/**
 * schools.js — a South Auckland school directory for the registration
 * form's school-name search.
 * -------------------------------------------------------------------
 * WHY A FIXED LIST, NOT A LIVE LOOKUP: SACTH is based in Wiri and the brief
 * describes the audience as South Auckland schools and youth groups, so a
 * list scoped to that area is both smaller (loads instantly, no server
 * round trip while typing) and more useful than NZ's full ~2,500-school
 * national directory, most of which a South Auckland teacher would never
 * need to find.
 *
 * SOURCE: the Manurewa and Otara-Papatoetoe entries are the real current
 * rolls from the Ministry of Education's school directory
 * (educationcounts.govt.nz/find-school/schools), fetched 2 Oct 2026 —
 * these are the two districts immediately around SACTH's Wiri site. The
 * Mangere, Papakura and wider-Manukau entries are well-known schools in
 * those neighbouring South Auckland suburbs, added so the list is not
 * blind to the areas just outside those two districts.
 *
 * This box never blocks registration: whatever a user types is sent
 * exactly as typed if their school is not in this list (see register.html's
 * datalist + free-text input), so a list that is merely incomplete causes
 * no harm — it just doesn't autocomplete for schools outside this set.
 * Extending it later is a one-time data task, not a code change.
 */
const SOUTH_AUCKLAND_SCHOOLS = [
  // --- Manurewa ---
  'Alfriston College',
  'Clayton Park School',
  'Clendon Park School',
  'Everglade School',
  'Finlayson Park School',
  'Greenmeadows Intermediate',
  'Hillpark School',
  'Homai School',
  'Leabank School',
  'Manukau Christian School',
  'Manurewa Central School',
  'Manurewa East School',
  'Manurewa High School',
  'Manurewa Intermediate',
  'Manurewa South School',
  'Manurewa West School',
  'Randwick Park School',
  'Reremoana School',
  'Roscommon School',
  'Rowandale School',
  'South Auckland Middle School',
  "St Anne's Catholic School (Manurewa)",
  'Te Kura Kaupapa Māori o Manurewa',
  'Te Wharekura o Manurewa',
  'The Gardens School',
  'Waimahia Intermediate School',
  'Weymouth School',
  'Wiri Central School',

  // --- Otara / Papatoetoe ---
  'Aorere College',
  'Bairds Mainfreight Primary School',
  'Dawson School',
  'De La Salle College',
  'East Tamaki School',
  'Ferguson Intermediate',
  'Flat Bush School',
  'Holy Cross School (Papatoetoe)',
  'Kedgley Intermediate',
  'Kia Aroha Campus',
  'Mayfield School',
  'Papatoetoe Central School',
  'Papatoetoe East School',
  'Papatoetoe High School',
  'Papatoetoe Intermediate',
  'Papatoetoe North School',
  'Papatoetoe South School',
  'Papatoetoe West School',
  'Puhinui School',
  'Redoubt North School',
  'Rongomai School',
  'Sir Edmund Hillary Collegiate Junior School',
  'Sir Edmund Hillary Collegiate Middle School',
  'Sir Edmund Hillary Collegiate Senior School',
  "St John the Evangelist Catholic School",
  'Tangaroa College',
  'Te Kura Kaupapa Māori o Piripono Te Kura Whakahou ki Ōtara',
  'Wymondley Road School',
  'Yendarra School',

  // --- Mangere ---
  'Mangere College',
  'Mangere Central School',
  'Mangere East School',
  'Robertson Road School',
  'Sutton Park School',
  'Viscount School',
  'Bader Intermediate',
  'Koru School',

  // --- Wider South Auckland (Manukau, Papakura) ---
  'Manukau Intermediate',
  'Papakura High School',
  'Papakura Intermediate',
  'Papakura Central School',
  'Rosehill College',
  'James Cook High School',
  'Southern Cross Campus',
  'Mountain View School',
  "St Mary's Catholic School (Papakura)"
];

if (typeof module !== 'undefined' && module.exports) module.exports = SOUTH_AUCKLAND_SCHOOLS; // node
if (typeof window !== 'undefined') window.SOUTH_AUCKLAND_SCHOOLS = SOUTH_AUCKLAND_SCHOOLS;     // browser
