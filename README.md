# WeDo — Stage 3/6

Aplicație PWA colaborativă pentru grupuri, construită cu Next.js, TypeScript,
Tailwind CSS și PostgreSQL. Stage 3 adaugă grupuri private și invitații.

## Ce funcționează în Stage 3

- design responsive pentru PC și mobil;
- navigație desktop și mobilă;
- dashboard pentru task-uri, cumpărături și chat;
- bifarea demonstrativă a task-urilor și produselor;
- manifest PWA, service worker și iconițe;
- cache offline de bază;
- fundația pentru notificări Web Push.
- creare cont fără email sau număr de telefon;
- autentificare prin username și parolă;
- parolă criptată cu bcrypt;
- sesiune securizată într-un cookie HTTP-only;
- cod unic de recuperare afișat o singură dată;
- resetarea parolei cu rotirea codului de recuperare;
- logout și protejarea dashboardului;
- creare automată a tabelului de utilizatori la prima înregistrare.
- creare de grupuri private;
- intrare într-un grup folosind un cod;
- roluri Owner, Admin și Member;
- coduri de invitație valabile 7 zile;
- acces la grupuri permis numai membrilor;
- listarea securizată a membrilor;
- schimbarea grupului activ;
- suport pentru mai multe grupuri per utilizator.

## Pornire locală

Ai nevoie de Node.js 22 sau mai nou.

```bash
npm install
npm run dev
```

Deschide `http://localhost:3000`.

Pentru verificarea versiunii de producție:

```bash
npm run build
npm start
```

## Încărcare pe GitHub din browser

1. Intră pe GitHub și apasă **New repository**.
2. Numește repository-ul `wedo`.
3. Alege **Public** sau **Private**.
4. Nu bifa opțiunile pentru README, `.gitignore` sau licență.
5. Apasă **Create repository**.
6. Dezarhivează ZIP-ul primit.
7. În repository, apasă **uploading an existing file** sau **Add file → Upload files**.
8. Trage în pagină toate fișierele și folderele din interiorul folderului
   `wedo-stage-1`, nu folderul exterior.
9. Scrie mesajul `WeDo Stage 1` și apasă **Commit changes**.

## Încărcare pe GitHub din terminal

Înlocuiește adresa din exemplu cu repository-ul tău:

```bash
git init
git add .
git commit -m "WeDo Stage 1"
git branch -M main
git remote add origin https://github.com/USERNAME/wedo.git
git push -u origin main
```

## Actualizarea proiectului pe GitHub

1. Dezarhivează ZIP-ul Stage 3.
2. Deschide repository-ul `wedo` pe GitHub.
3. Șterge fișierele vechi sau înlocuiește-le cu toate fișierele din noul ZIP.
4. Verifică să existe direct la rădăcină `app`, `lib`, `public` și `package.json`.
5. Salvează cu mesajul `WeDo Stage 3`.

Vercel va încerca automat un nou deployment. Acesta va fi complet funcțional
după configurarea bazei de date și a secretului descrise mai jos.

## Configurarea bazei de date gratuite

1. Deschide proiectul WeDo în Vercel.
2. Intră în **Storage** și apasă **Create Database** sau **Browse Marketplace**.
3. Alege **Neon Postgres**.
4. Selectează planul **Free / $0** și opțiunea de creare a unui proiect nou.
5. Conectează baza de date la proiectul Vercel `wedo`.
6. Selectează mediile Production, Preview și Development dacă sunt afișate.
7. Finalizează instalarea.
8. Verifică în **Settings → Environment Variables** că există `DATABASE_URL`.

Nu trebuie să creezi manual tabele. WeDo creează automat tabelele necesare
pentru utilizatori, grupuri, membri și invitații.

## Configurarea secretului pentru autentificare

În **Settings → Environment Variables**, adaugă:

```text
Name: AUTH_SECRET
Value: un-text-lung-si-aleatoriu-de-cel-putin-32-caractere
```

Poți folosi, de exemplu, o combinație aleatorie de 50–60 de litere, cifre și
simboluri. Nu publica valoarea în GitHub.

Selectează Production, Preview și Development, apoi salvează.

## Redeploy după configurare

1. Intră la **Deployments**.
2. Deschide meniul ultimului deployment.
3. Apasă **Redeploy**.
4. Dezactivează folosirea cache-ului vechi dacă este afișată opțiunea.

După redeploy, creează primul cont. Codul de recuperare trebuie salvat imediat.

## Prima publicare gratuită pe Vercel

1. Intră în Vercel folosind contul GitHub pe care îl ai deja.
2. Apasă **Add New → Project**.
3. Selectează repository-ul `wedo` și apasă **Import**.
4. Vercel ar trebui să detecteze automat **Next.js**.
5. Lasă **Root Directory** pe valoarea implicită.
6. Configurează `DATABASE_URL` și `AUTH_SECRET` conform instrucțiunilor.
7. Apasă **Deploy**.

La final vei primi o adresă gratuită de forma `wedo-....vercel.app`.

Pentru etapele următoare, înlocuiești fișierele din repository cu cele din
noul ZIP și faci un nou commit. Vercel va publica automat actualizarea.

## Instalarea ca PWA

- Android/Chrome: meniul browserului → **Install app** sau **Add to Home screen**.
- PC/Chrome sau Edge: pictograma de instalare din bara de adrese.
- iPhone: Safari → Share → **Add to Home Screen**.

Pe iPhone, notificările PWA funcționează după instalarea aplicației pe Home
Screen și acordarea permisiunii.

## Costuri

Proiectul folosește planurile gratuite GitHub, Vercel și Neon. Nu necesită
emailuri, SMS-uri, domeniu cumpărat sau servicii API plătite.
