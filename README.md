# WeDo — Stage 1/6

Aplicație PWA colaborativă pentru grupuri, construită cu Next.js, TypeScript și
Tailwind CSS. Această etapă conține interfața dark premium, dashboardul
responsive, navigația, PWA-ul de bază și interacțiuni demonstrative.

## Ce funcționează în Stage 1

- design responsive pentru PC și mobil;
- navigație desktop și mobilă;
- dashboard pentru task-uri, cumpărături și chat;
- bifarea demonstrativă a task-urilor și produselor;
- manifest PWA, service worker și iconițe;
- cache offline de bază;
- fundația pentru notificări Web Push.

Datele afișate sunt momentan demonstrative. Conturile și baza de date vor fi
adăugate în Stage 2.

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

## Publicare gratuită pe Vercel

1. Intră în Vercel folosind contul GitHub pe care îl ai deja.
2. Apasă **Add New → Project**.
3. Selectează repository-ul `wedo` și apasă **Import**.
4. Vercel ar trebui să detecteze automat **Next.js**.
5. Lasă **Root Directory** pe valoarea implicită.
6. Nu adăuga Environment Variables în această etapă.
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

Stage 1 nu folosește servicii plătite, baze de date sau API-uri externe.
GitHub și Vercel pot fi folosite pe planurile lor gratuite, în limitele
acestora.
