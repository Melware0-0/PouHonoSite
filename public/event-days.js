/**
 * event-days.js — THE one place to change the event dates
 * -------------------------------------------------------
 * NZ Tech Week runs over three days, and a teacher picks which one their
 * class is coming on. Those three days are written down here, once.
 *
 * ★ IF THE DATES CHANGE, CHANGE THEM HERE AND NOWHERE ELSE. ★
 *
 * Everything that needs to know the days reads this file:
 *   - the registration form (the "Which day are you attending?" choices)
 *   - the teacher portal and the admin table (turning a stored date back
 *     into a readable label)
 * If the dates lived in each of those places instead, changing them would
 * mean finding every copy — and the one you missed would quietly be wrong.
 *
 * THE DATES BELOW ARE PLACEHOLDERS, pending the client confirming the
 * real ones. They are the right shape and the right number of days, but
 * do not print them on anything until SACTH has confirmed them.
 *
 * `date` is 'YYYY-MM-DD' — the same format the database stores and the
 * same format <input type="date"> sends, so it can be compared and sorted
 * as plain text (see the note in db.js). `label` is what a person reads;
 * it stays in English because it is a date, not a phrase to translate.
 */
const EVENT_DAYS = [
  { date: '2027-05-18', label: 'Day 1 — Tuesday 18 May 2027' },
  { date: '2027-05-19', label: 'Day 2 — Wednesday 19 May 2027' },
  { date: '2027-05-20', label: 'Day 3 — Thursday 20 May 2027' }
];

/*
 * This one file is loaded two completely different ways, so it hands
 * itself over twice — each line is ignored in the environment it does not
 * apply to, which is what lets a single file serve both.
 */
if (typeof module !== 'undefined' && module.exports) module.exports = EVENT_DAYS;   // node
if (typeof window !== 'undefined') window.EVENT_DAYS = EVENT_DAYS;                  // browser
