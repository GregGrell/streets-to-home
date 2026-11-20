// Streets to Home adoption application questions — one source for the online forms (apply.html)
// and the printable Word forms (scripts/build-forms.js). Edit questions here only.
//
// Item types: text · long · email · tel · date · radio · check · pair · sub (sub-heading) · consent · sign (paper only)
//   k    answer key (stable — answers are stored under it)      q    question text
//   o    options (radio = pick one, check = pick any)            d    lines for details (0 = none; >1 = long answer)
//   req  required online                                         n    lines on paper for text/long
(function () {
  const R = (k, q, o, extra = {}) => ({ t: 'radio', k, q, o, ...extra });
  const C = (k, q, o, extra = {}) => ({ t: 'check', k, q, o, ...extra });
  const T = (k, q, extra = {}) => ({ t: 'text', k, q, n: 1, ...extra });
  const L = (k, q, n = 2, extra = {}) => ({ t: 'long', k, q, n, ...extra });
  const P = (a, b) => ({ t: 'pair', a, b });
  const S = (q) => ({ t: 'sub', q });
  const YN = ['Yes', 'No'];
  const NY = ['No', 'Yes'];

  const aboutYou = {
    title: 'About you',
    items: [
      R('over18', 'Please confirm you are aged 18 or over.', ['Yes'], { req: true }),
      P(T('full_name', 'Full name:', { req: true, ac: 'name' }), T('dob', 'Date of birth:', { t: 'date' })),
      L('address', 'Home address:', 2, { req: true, ac: 'street-address' }),
      P(T('postcode', 'Postcode / ZIP:', { ac: 'postal-code' }), T('country', 'Country:', { req: true, ac: 'country-name' })),
      P(T('email', 'Email:', { t: 'email', req: true, ac: 'email' }), T('phone', 'Telephone / WhatsApp:', { t: 'tel', req: true, ac: 'tel' })),
      R('contact_by', 'Preferred method of contact:', ['WhatsApp', 'Email', 'Telephone']),
    ],
  };

  const household = (pet) => ({
    title: 'Your household',
    items: [
      P(T('adults', 'Number of adults:'), T('children', 'Number of children:')),
      T('children_ages', 'Ages of children living in the home:'),
      R('children_visit', 'Are there children who visit regularly?', NY, { d: 1 }),
      R('all_agree', 'Does everyone in the household agree to the adoption?', YN, { req: true }),
      R('time_around', `Has everyone in the household spent time around ${pet}s before?`, YN, { d: 1 }),
      R('allergy', `Does anyone in the household have a known ${pet} allergy?`, ['No', 'Yes', 'Unsure'], { d: 1 }),
      R('staff', `Do you employ household staff (e.g. a nanny, housekeeper or driver) who will help care for the ${pet}?`, NY, { d: 1 }),
    ],
  });

  const pets = (pet) => ({
    title: 'Current and previous pets',
    items: [
      C('current_pets', 'Do you currently have any pets?', ['No', 'Cats', 'Dogs', 'Birds', 'Small animals', 'Other']),
      L('current_pets_detail', `If yes, please give each animal's species, age, sex, neuter status, vaccination status and temperament (including how they are with ${pet}s).`, 3),
      R('pets_neutered', 'Are all current cats/dogs neutered and appropriately vaccinated?', ['N/A', 'Yes', 'No'], { d: 1 }),
      L('previous_pets', 'Please tell us about pets you have owned previously and what happened to them.', 3),
      R('surrendered', 'Have you ever surrendered, rehomed, sold or given away a pet?', NY, { d: 2 }),
      R('visiting_animals', 'Do animals belonging to friends or family visit your home regularly?', NY, { d: 2 }),
    ],
  });

  const lifestyle = (pet) => ({
    title: 'Your lifestyle',
    items: [
      T('alone_hours', `How many hours would the ${pet} normally be left alone on a typical day?`, { req: true }),
      R('work_pattern', 'What is your usual work/lifestyle pattern?', ['Home most of day', 'Work from home', 'Work outside home', 'Shift work', 'Other'], { d: 1 }),
      R('moving', 'Are you planning to move home in the next 12 months?', ['No', 'Yes', 'Possibly'], { d: 1 }),
      R('travel', 'Do you have holidays or extended travel planned in the next few months?', NY, { d: 1 }),
      L('travel_care', `Who will care for the ${pet} when you travel or are away overnight?`, 2),
    ],
  });

  const vet = (pet, costs) => ({
    title: `${pet === 'cat' ? 'Cat' : 'Dog'} care and veterinary commitment`,
    items: [
      T('vet_clinic', 'Which veterinary clinic do you currently use, if any?'),
      P(T('vet_contact', 'Vet clinic telephone/email:'), T('vet_name_on_records', 'Name on vet records:')),
      R('vet_reference', 'May Streets to Home contact your veterinary clinic for a reference if needed?', ['Yes', 'No', 'N/A']),
      R('routine_costs', `Are you prepared for routine costs including ${costs}?`, YN, { req: true }),
      L('unexpected_bills', 'How would you manage an unexpected veterinary bill or ongoing medical condition?', 2),
      R('insurance', 'Do you intend to obtain pet insurance where available?', ['Yes', 'No', 'Undecided / unavailable']),
      T('food', `What food do you plan to feed the ${pet}?`),
    ],
  });

  const lifetime = (pet) => ({
    title: 'Lifetime commitment',
    items: [
      R('fee', 'Are you happy to pay the adoption fee, which helps contribute towards the costs of rescuing, veterinary care, preparation and rehoming of our animals?', YN, { req: true }),
      L('why_now', `Why do you want to adopt a ${pet} at this time?`, 2, { req: true }),
      L('circumstances', `What would happen to the ${pet} if your circumstances changed - for example relocation, pregnancy/new baby, relationship change, financial difficulty or illness?`, 3),
      R('relocate', `If you relocate to another country, are you prepared to take the ${pet} with you and meet the associated travel/import costs?`, ['Yes', 'No', 'Not applicable'], { req: true }),
      R('return_to_us', `If at any point you can no longer keep the ${pet}, do you agree to contact Streets to Home and not sell, abandon or privately rehome the ${pet} without our agreement?`, YN, { req: true }),
    ],
  });

  const tail = (pet) => [
    { title: 'Anything else', items: [L('anything_else', `Please tell us anything else that may help us find the right match for you and the ${pet}.`, 3)] },
    {
      title: 'Declaration',
      breakBefore: true,
      items: [
        { t: 'consent', k: 'declaration', req: true, q: `I confirm that the information provided in this application is true and complete to the best of my knowledge. I understand that Streets to Home's priority is the welfare and long-term suitability of the animal, and that an application may be declined if the proposed home is not considered suitable for the individual ${pet}. I understand that further checks or discussion may be required before an adoption is approved.` },
        { t: 'sign' },
      ],
    },
  ];

  const CAT = {
    id: 'cat', pet: 'cat', title: 'Cat Adoption Application',
    intro: [
      'Thank you for considering adopting a rescue cat from Streets to Home. Our aim is to find a safe, loving and permanent match for every cat.',
      "Please answer all questions as fully and honestly as possible. There are no 'perfect' answers - the information helps us understand which cat may be the best fit for your household and lifestyle.",
    ],
    sections: [
      {
        title: 'The cat you are applying for',
        items: [
          T('animal_name', 'Name of cat(s):', { hint: 'Not sure yet? Leave it blank and tell us what you are looking for below.' }),
          L('why_this_one', 'Why are you interested in this particular cat or pair?', 2),
          R('adopted_before', 'Have you previously applied for or adopted a rescue animal?', NY, { d: 1 }),
        ],
      },
      aboutYou,
      {
        title: 'Your home',
        items: [
          R('property', 'What type of property do you live in?', ['House', 'Villa', 'Flat/Apartment', 'Other'], { d: 1, req: true }),
          R('own_rent', 'Do you own or rent your home?', ['Own', 'Rent'], { req: true }),
          R('landlord', "If rented, do you have your landlord's written permission to keep a cat?", ['N/A', 'Yes', 'No'], { req: true }),
          R('balcony', 'Do you have a balcony, terrace or accessible windows?', NY),
          R('cat_proofed', 'If yes, are they securely cat-proofed or will they be cat-proofed before adoption?', ['N/A', 'Yes', 'No'], { d: 1 }),
          R('garden', 'Do you have a garden or other outdoor space?', ['No', 'Yes - secure', 'Yes - not secure'], { d: 1 }),
          R('hazards', 'Is your home close to a busy road, railway, construction area or other significant hazard?', NY, { d: 1 }),
          R('restrictions', 'Are there any restrictions on pets where you live (building/community/compound rules)?', NY, { d: 1 }),
        ],
      },
      household('cat'),
      pets('cat'),
      lifestyle('cat'),
      {
        title: 'The cat you are looking for',
        items: [
          R('pref_sex', 'Would you prefer:', ['Male', 'Female', 'No preference']),
          C('pref_age', 'Preferred age:', ['Kitten', 'Young adult', 'Adult', 'Senior', 'No preference']),
          R('bonded_pair', 'Would you consider a bonded pair?', ['Yes', 'No', 'Maybe']),
          R('shy', 'Would you consider a shy cat who needs time and patience?', ['Yes', 'No', 'Maybe']),
          R('special_needs', 'Would you consider a cat with a disability or ongoing medical needs?', ['Yes', 'No', 'Maybe'], { d: 1 }),
          R('cuddles', 'How important is it that your cat enjoys being picked up/cuddled?', ['Very', 'Somewhat', 'Not important'], { d: 1 }),
          R('no_pickup_ok', 'Would you be happy with a cat who is affectionate but prefers not to be picked up?', ['Yes', 'No', 'Maybe']),
          L('cannot_manage', 'Are there any behaviours or needs you would not feel able to manage?', 2),
        ],
      },
      {
        title: 'Indoor/outdoor plans and safety',
        items: [
          R('living', 'Where do you expect the cat to live?', ['Indoor only', 'Indoor with secure catio/balcony', 'Indoor/outdoor'], { d: 1, req: true }),
          L('outdoor_plan', 'If you plan outdoor access, please describe when, where and how it would be introduced safely.', 3),
          R('settling_indoors', 'Would you agree to keep a newly adopted cat indoors for the settling-in period advised by Streets to Home?', YN),
          L('escape', 'How will you prevent escape through doors, windows and balconies?', 2),
          R('indoor_commit', 'If the cat is blind, disabled, very timid or designated indoor-only, can you commit to keeping them securely indoors?', ['Yes', 'No', 'N/A'], { d: 1 }),
        ],
      },
      vet('cat', 'quality food, litter, annual veterinary checks, vaccinations, parasite prevention and dental care'),
      {
        title: 'Introductions and settling in',
        items: [
          L('introductions', 'If you have existing pets, how do you plan to introduce the new cat?', 2),
          L('settling_room', 'Where will the cat stay during the initial settling-in period?', 2),
          R('settle_time', 'Are you willing to allow the cat several weeks or longer to settle, particularly if they are shy or have experienced trauma?', YN),
          L('problems', 'What would you do if the cat initially hid, scratched furniture, toileted outside the litter tray, or did not immediately bond with you?', 3),
        ],
      },
      lifetime('cat'),
      ...tail('cat'),
    ],
  };

  const DOG = {
    id: 'dog', pet: 'dog', title: 'Dog Adoption Application',
    intro: [
      'Thank you for considering adopting a rescue dog from Streets to Home. Our aim is to find a safe, loving and permanent match for every dog.',
      "Please answer all questions as fully and honestly as possible. There are no 'perfect' answers - the information helps us understand which dog may be the best fit for your household and lifestyle.",
    ],
    sections: [
      {
        title: 'The dog you are applying for',
        items: [
          T('animal_name', 'Name of dog(s):', { hint: 'Not sure yet? Leave it blank and tell us what you are looking for below.' }),
          L('why_this_one', 'Why are you interested in this particular dog or pair?', 2),
          R('adopted_before', 'Have you previously applied for or adopted a rescue animal?', NY, { d: 1 }),
        ],
      },
      aboutYou,
      {
        title: 'Your home',
        items: [
          R('property', 'What type of property do you live in?', ['House', 'Villa', 'Flat/Apartment', 'Other'], { d: 1, req: true }),
          R('own_rent', 'Do you own or rent your home?', ['Own', 'Rent'], { req: true }),
          R('landlord', "If rented, do you have your landlord's written permission to keep a dog?", ['N/A', 'Yes', 'No'], { req: true }),
          R('garden', 'Do you have a garden, yard or other outdoor space?', ['No', 'Yes - secure', 'Yes - not secure'], { req: true }),
          L('fencing', 'If yes, please describe the fencing, walls and gates (height, gaps, how gates are kept closed).', 2),
          R('balcony', 'Do you have a balcony or roof terrace the dog could access?', ['No', 'Yes - secured', 'Yes - not secured'], { d: 1 }),
          R('hazards', 'Is your home close to a busy road, railway, construction area or other significant hazard?', NY, { d: 1 }),
          R('restrictions', 'Are there any restrictions on dogs where you live (building/community/compound rules, size or breed limits)?', NY, { d: 1 }),
        ],
      },
      household('dog'),
      pets('dog'),
      lifestyle('dog'),
      {
        title: 'The dog you are looking for',
        items: [
          R('pref_sex', 'Would you prefer:', ['Male', 'Female', 'No preference']),
          C('pref_age', 'Preferred age:', ['Puppy', 'Young adult', 'Adult', 'Senior', 'No preference']),
          C('pref_size', 'Preferred size:', ['Small', 'Medium', 'Large', 'No preference']),
          R('pref_energy', 'Preferred energy level:', ['Calm', 'Moderate', 'Very active', 'No preference']),
          R('bonded_pair', 'Would you consider a bonded pair?', ['Yes', 'No', 'Maybe']),
          R('shy', 'Would you consider a shy or nervous dog who needs time and patience?', ['Yes', 'No', 'Maybe']),
          R('special_needs', 'Would you consider a dog with a disability or ongoing medical needs?', ['Yes', 'No', 'Maybe'], { d: 1 }),
          C('must_be_good_with', 'The dog must be comfortable with:', ['Children', 'Other dogs', 'Cats', 'Visitors']),
          L('cannot_manage', 'Are there any behaviours or needs you would not feel able to manage?', 2),
        ],
      },
      {
        title: 'Daily life, exercise and safety',
        items: [
          R('dog_days', 'Where will the dog spend most of the day?', ['Indoors', 'Indoors with garden access', 'Mostly outdoors'], { d: 1, req: true }),
          T('dog_sleep', 'Where will the dog sleep at night?'),
          L('exercise', "How will you meet the dog's daily exercise needs, including walking safely in the summer heat?", 2),
          R('lead', 'Will the dog be kept on a lead in public areas?', YN),
          R('dog_experience', 'Have you owned or cared for a dog before?', NY, { d: 1 }),
          L('training', 'How do you plan to train the dog (e.g. classes, a trainer, at home), and what methods would you use?', 2),
          L('escape', 'How will you prevent escape through doors, gates, fences and balconies?', 2),
        ],
      },
      vet('dog', 'quality food, a lead, harness and bed, grooming, annual veterinary checks, vaccinations, parasite prevention, dental care and boarding when you travel'),
      {
        title: 'Introductions and settling in',
        items: [
          L('introductions', 'If you have existing pets, how do you plan to introduce the new dog?', 2),
          L('settling_room', 'Where will the dog stay during the initial settling-in period?', 2),
          R('settle_time', 'Are you willing to allow the dog several weeks or longer to settle, particularly if they are shy or have experienced trauma?', YN),
          L('problems', 'What would you do if the dog initially chewed things, had toilet accidents, barked or cried when left, pulled on the lead, or did not immediately bond with you?', 3),
        ],
      },
      lifetime('dog'),
      ...tail('dog'),
    ],
  };

  const FORMS = { cat: CAT, dog: DOG };
  if (typeof module !== 'undefined') module.exports = FORMS;
  if (typeof window !== 'undefined') window.STH_FORMS = FORMS;
})();
