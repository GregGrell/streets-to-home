# Streets to Home app

Animal records, vet appointments, website publishing and adoption enquiries for Streets to Home animal rescue, Doha.
Built from the PAWSapp records screens.

- Installable web app (works offline; changes sync when the phone has signal)
- Backend: Supabase project `streets-to-home`
- Hosting: GitHub Pages, deployed automatically on every push to `main`
- Public adoption form: `#/apply/<token>` (link created from an enquiry, valid 30 days)

## Run locally
```
npm install
npm run dev
```

The first account to sign up becomes admin. Everyone after that is approved under More → Team & permissions.
