
  create table "public"."decisions" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "type" text,
    "status" text default 'active'::text,
    "reasoning_steps" jsonb,
    "suggested_action_id" uuid,
    "metadata" jsonb,
    "confidence_score" numeric(5,2),
    "created_at" timestamp without time zone default now()
      );


CREATE UNIQUE INDEX decisions_pkey ON public.decisions USING btree (id);

CREATE INDEX idx_decisions_org_id ON public.decisions USING btree (org_id);

alter table "public"."decisions" add constraint "decisions_pkey" PRIMARY KEY using index "decisions_pkey";

grant delete on table "public"."decisions" to "anon";

grant insert on table "public"."decisions" to "anon";

grant references on table "public"."decisions" to "anon";

grant select on table "public"."decisions" to "anon";

grant trigger on table "public"."decisions" to "anon";

grant truncate on table "public"."decisions" to "anon";

grant update on table "public"."decisions" to "anon";

grant delete on table "public"."decisions" to "authenticated";

grant insert on table "public"."decisions" to "authenticated";

grant references on table "public"."decisions" to "authenticated";

grant select on table "public"."decisions" to "authenticated";

grant trigger on table "public"."decisions" to "authenticated";

grant truncate on table "public"."decisions" to "authenticated";

grant update on table "public"."decisions" to "authenticated";

grant delete on table "public"."decisions" to "service_role";

grant insert on table "public"."decisions" to "service_role";

grant references on table "public"."decisions" to "service_role";

grant select on table "public"."decisions" to "service_role";

grant trigger on table "public"."decisions" to "service_role";

grant truncate on table "public"."decisions" to "service_role";

grant update on table "public"."decisions" to "service_role";


  create policy "org_isolation_decisions"
  on "public"."decisions"
  as permissive
  for all
  to public
using ((org_id = ((auth.jwt() ->> 'org_id'::text))::uuid));



