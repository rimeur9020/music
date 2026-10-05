# Partager la liste des guitaristes (Supabase, gratuit)

Sans cette configuration, chaque visiteur garde sa propre liste dans son navigateur.
Avec, tout guitariste cherché par n'importe qui s'ajoute à une liste commune.

## 1. Créer le projet
1. Va sur https://supabase.com → **Start your project** → connecte-toi (avec GitHub, c'est le plus simple).
2. **New project** : donne un nom (ex. `atelier-musique`), choisis un mot de passe de base de données (garde-le pour toi), région **Europe**, plan **Free**.
3. Attends 1 à 2 minutes que le projet soit prêt.

## 2. Créer la table
Menu de gauche → **SQL Editor** → **New query**, colle ceci puis **Run** :

```sql
create table public.guitarists_shared (
  id bigint generated always as identity primary key,
  title text not null unique check (char_length(title) between 2 and 120),
  created_at timestamptz not null default now()
);

alter table public.guitarists_shared enable row level security;

-- tout le monde peut lire la liste
create policy "lecture publique" on public.guitarists_shared
  for select to anon using (true);

-- tout le monde peut ajouter un guitariste (mais pas modifier ni supprimer)
create policy "ajout public" on public.guitarists_shared
  for insert to anon with check (true);
```

## 3. Récupérer les deux valeurs
Menu **Project Settings** → **API** (ou **Data API**) :
- **Project URL** (ex. `https://abcdefgh.supabase.co`)
- la clé **anon public** (une longue suite de caractères commençant par `eyJ…`)

La clé « anon » est faite pour être publique : avec les règles ci-dessus, elle permet seulement de lire la liste et d'y ajouter un nom.
⚠️ Ne donne jamais la clé **service_role**.

## 4. Les mettre dans le site
Envoie-les à Claude, ou colle-les toi-même dans `js/config.js` :

```js
window.SITE_CONFIG = {
  supabaseUrl: 'https://abcdefgh.supabase.co',
  supabaseAnonKey: 'eyJ...'
};
```

Pour retirer un guitariste de la liste commune : Supabase → **Table Editor** → `guitarists_shared` → supprimer la ligne.
