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
create table if not exists public.guitarists_shared (
  id bigint generated always as identity primary key,
  title text not null unique,
  created_at timestamptz not null default now()
);

alter table public.guitarists_shared enable row level security;

grant select, insert on public.guitarists_shared to anon;

drop policy if exists lecture_publique on public.guitarists_shared;
create policy lecture_publique on public.guitarists_shared
  for select to anon using (true);

drop policy if exists ajout_public on public.guitarists_shared;
create policy ajout_public on public.guitarists_shared
  for insert to anon with check (char_length(title) between 2 and 120);
```

Ce script peut être relancé sans risque s'il a déjà été exécuté en partie.

## 3. Récupérer les deux valeurs
Menu **Project Settings** → **API** (ou **Data API**) :
- **Project URL** (ex. `https://abcdefgh.supabase.co`)
- la clé publique : selon la version de Supabase, c’est la **Publishable key** (commence par `sb_publishable_…`, onglet **API Keys**) ou la clé **anon public** (commence par `eyJ…`, onglet **Legacy API Keys**). Les deux fonctionnent.

La clé « anon » est faite pour être publique : avec les règles ci-dessus, elle permet seulement de lire la liste et d'y ajouter un nom.
⚠️ Ne donne jamais la clé **secret** (`sb_secret_…`) ni la clé **service_role**.

## 4. Les mettre dans le site
Envoie-les à Claude, ou colle-les toi-même dans `js/config.js` :

```js
window.SITE_CONFIG = {
  supabaseUrl: 'https://abcdefgh.supabase.co',
  supabaseAnonKey: 'eyJ...'
};
```

Pour retirer un guitariste de la liste commune : Supabase → **Table Editor** → `guitarists_shared` → supprimer la ligne.
