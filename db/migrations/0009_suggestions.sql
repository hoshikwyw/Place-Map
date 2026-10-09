-- Place Map - what visitors tell you
-- Run in Supabase Studio -> SQL Editor, or via psql $DATABASE_URL -f this file.
--
-- Two things people want to say about a directory: "you are missing a place"
-- and "this one is wrong". Both arrive here, and neither is ever shown to
-- anybody until an editor acts on it - a suggestion is a message, not content.
--
-- No account, so no author. An optional contact is the only identity, and it
-- exists so an editor can ask a question, not to verify anyone.

create table if not exists suggestions (
  id          bigserial primary key,
  -- 'new_place' or 'correction'. Text with a check rather than an enum type:
  -- adding a third kind later is then a migration, not a type rewrite.
  kind        text not null check (kind in ('new_place', 'correction')),
  -- Set when the message is about a place that already exists. Kept if that
  -- place is later deleted - the message still says something worth reading,
  -- and losing the row would hide a complaint about why it was deleted.
  place_id    bigint references places(id) on delete set null,
  -- What they typed. `name` is the place's name for a new place, and unused
  -- for a correction, where `note` carries everything.
  name        text,
  note        text not null,
  contact     text,
  -- 'new' until an editor deals with it, then 'done' or 'ignored'. Nothing is
  -- deleted automatically: a dismissed suggestion is evidence of what was
  -- already considered.
  status      text not null default 'new' check (status in ('new', 'done', 'ignored')),
  -- The language the form was in, so a reply can be written in it.
  lang        text,
  created_at  timestamptz not null default now()
);

-- The dashboard opens on the unread ones, newest first.
create index if not exists suggestions_status_created_idx
  on suggestions (status, created_at desc);

comment on table suggestions is 'Messages from visitors. Never public; an editor acts on them by hand.';
comment on column suggestions.place_id is 'Set for a correction about an existing place; null once that place is deleted.';
