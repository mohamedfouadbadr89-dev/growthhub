drop extension if exists "pg_net";


  create table "public"."audit_logs" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" text not null,
    "actor_id" text not null,
    "action" text not null,
    "resource" text,
    "resource_id" text,
    "metadata" jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."audit_logs" enable row level security;


  create table "public"."campaigns" (
    "id" uuid not null default gen_random_uuid(),
    "name" text,
    "status" text,
    "created_at" timestamp without time zone default now()
      );



  create table "public"."organizations" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" text not null,
    "name" text not null,
    "plan_type" text not null default 'subscription'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."organizations" enable row level security;


  create table "public"."subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" text not null,
    "plan_type" text not null default 'subscription'::text,
    "status" text not null default 'trialing'::text,
    "stripe_customer_id" text,
    "stripe_sub_id" text,
    "current_period_end" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."subscriptions" enable row level security;


  create table "public"."users" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" text not null,
    "clerk_id" text not null,
    "email" text not null,
    "role" text not null default 'admin'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."users" enable row level security;

CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);

CREATE UNIQUE INDEX campaigns_pkey ON public.campaigns USING btree (id);

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);

CREATE INDEX idx_audit_logs_org_id ON public.audit_logs USING btree (org_id);

CREATE INDEX idx_subscriptions_org_id ON public.subscriptions USING btree (org_id);

CREATE INDEX idx_users_clerk_id ON public.users USING btree (clerk_id);

CREATE INDEX idx_users_org_id ON public.users USING btree (org_id);

CREATE UNIQUE INDEX organizations_org_id_key ON public.organizations USING btree (org_id);

CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id);

CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (id);

CREATE UNIQUE INDEX users_clerk_id_key ON public.users USING btree (clerk_id);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

alter table "public"."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY using index "audit_logs_pkey";

alter table "public"."campaigns" add constraint "campaigns_pkey" PRIMARY KEY using index "campaigns_pkey";

alter table "public"."organizations" add constraint "organizations_pkey" PRIMARY KEY using index "organizations_pkey";

alter table "public"."subscriptions" add constraint "subscriptions_pkey" PRIMARY KEY using index "subscriptions_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."organizations" add constraint "organizations_org_id_key" UNIQUE using index "organizations_org_id_key";

alter table "public"."organizations" add constraint "organizations_plan_type_check" CHECK ((plan_type = ANY (ARRAY['subscription'::text, 'ltd'::text]))) not valid;

alter table "public"."organizations" validate constraint "organizations_plan_type_check";

alter table "public"."subscriptions" add constraint "subscriptions_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(org_id) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_org_id_fkey";

alter table "public"."subscriptions" add constraint "subscriptions_plan_type_check" CHECK ((plan_type = ANY (ARRAY['subscription'::text, 'ltd'::text]))) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_plan_type_check";

alter table "public"."subscriptions" add constraint "subscriptions_status_check" CHECK ((status = ANY (ARRAY['trialing'::text, 'active'::text, 'canceled'::text, 'past_due'::text]))) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_status_check";

alter table "public"."users" add constraint "users_clerk_id_key" UNIQUE using index "users_clerk_id_key";

alter table "public"."users" add constraint "users_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(org_id) not valid;

alter table "public"."users" validate constraint "users_org_id_fkey";

alter table "public"."users" add constraint "users_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text]))) not valid;

alter table "public"."users" validate constraint "users_role_check";

grant delete on table "public"."audit_logs" to "anon";

grant insert on table "public"."audit_logs" to "anon";

grant references on table "public"."audit_logs" to "anon";

grant select on table "public"."audit_logs" to "anon";

grant trigger on table "public"."audit_logs" to "anon";

grant truncate on table "public"."audit_logs" to "anon";

grant update on table "public"."audit_logs" to "anon";

grant delete on table "public"."audit_logs" to "authenticated";

grant insert on table "public"."audit_logs" to "authenticated";

grant references on table "public"."audit_logs" to "authenticated";

grant select on table "public"."audit_logs" to "authenticated";

grant trigger on table "public"."audit_logs" to "authenticated";

grant truncate on table "public"."audit_logs" to "authenticated";

grant update on table "public"."audit_logs" to "authenticated";

grant delete on table "public"."audit_logs" to "service_role";

grant insert on table "public"."audit_logs" to "service_role";

grant references on table "public"."audit_logs" to "service_role";

grant select on table "public"."audit_logs" to "service_role";

grant trigger on table "public"."audit_logs" to "service_role";

grant truncate on table "public"."audit_logs" to "service_role";

grant update on table "public"."audit_logs" to "service_role";

grant delete on table "public"."campaigns" to "anon";

grant insert on table "public"."campaigns" to "anon";

grant references on table "public"."campaigns" to "anon";

grant select on table "public"."campaigns" to "anon";

grant trigger on table "public"."campaigns" to "anon";

grant truncate on table "public"."campaigns" to "anon";

grant update on table "public"."campaigns" to "anon";

grant delete on table "public"."campaigns" to "authenticated";

grant insert on table "public"."campaigns" to "authenticated";

grant references on table "public"."campaigns" to "authenticated";

grant select on table "public"."campaigns" to "authenticated";

grant trigger on table "public"."campaigns" to "authenticated";

grant truncate on table "public"."campaigns" to "authenticated";

grant update on table "public"."campaigns" to "authenticated";

grant delete on table "public"."campaigns" to "service_role";

grant insert on table "public"."campaigns" to "service_role";

grant references on table "public"."campaigns" to "service_role";

grant select on table "public"."campaigns" to "service_role";

grant trigger on table "public"."campaigns" to "service_role";

grant truncate on table "public"."campaigns" to "service_role";

grant update on table "public"."campaigns" to "service_role";

grant delete on table "public"."organizations" to "anon";

grant insert on table "public"."organizations" to "anon";

grant references on table "public"."organizations" to "anon";

grant select on table "public"."organizations" to "anon";

grant trigger on table "public"."organizations" to "anon";

grant truncate on table "public"."organizations" to "anon";

grant update on table "public"."organizations" to "anon";

grant delete on table "public"."organizations" to "authenticated";

grant insert on table "public"."organizations" to "authenticated";

grant references on table "public"."organizations" to "authenticated";

grant select on table "public"."organizations" to "authenticated";

grant trigger on table "public"."organizations" to "authenticated";

grant truncate on table "public"."organizations" to "authenticated";

grant update on table "public"."organizations" to "authenticated";

grant delete on table "public"."organizations" to "service_role";

grant insert on table "public"."organizations" to "service_role";

grant references on table "public"."organizations" to "service_role";

grant select on table "public"."organizations" to "service_role";

grant trigger on table "public"."organizations" to "service_role";

grant truncate on table "public"."organizations" to "service_role";

grant update on table "public"."organizations" to "service_role";

grant delete on table "public"."subscriptions" to "anon";

grant insert on table "public"."subscriptions" to "anon";

grant references on table "public"."subscriptions" to "anon";

grant select on table "public"."subscriptions" to "anon";

grant trigger on table "public"."subscriptions" to "anon";

grant truncate on table "public"."subscriptions" to "anon";

grant update on table "public"."subscriptions" to "anon";

grant delete on table "public"."subscriptions" to "authenticated";

grant insert on table "public"."subscriptions" to "authenticated";

grant references on table "public"."subscriptions" to "authenticated";

grant select on table "public"."subscriptions" to "authenticated";

grant trigger on table "public"."subscriptions" to "authenticated";

grant truncate on table "public"."subscriptions" to "authenticated";

grant update on table "public"."subscriptions" to "authenticated";

grant delete on table "public"."subscriptions" to "service_role";

grant insert on table "public"."subscriptions" to "service_role";

grant references on table "public"."subscriptions" to "service_role";

grant select on table "public"."subscriptions" to "service_role";

grant trigger on table "public"."subscriptions" to "service_role";

grant truncate on table "public"."subscriptions" to "service_role";

grant update on table "public"."subscriptions" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";


  create policy "org_read"
  on "public"."audit_logs"
  as permissive
  for select
  to public
using ((org_id = (auth.jwt() ->> 'org_id'::text)));



  create policy "org_isolation"
  on "public"."organizations"
  as permissive
  for all
  to public
using ((org_id = (auth.jwt() ->> 'org_id'::text)));



  create policy "org_isolation"
  on "public"."subscriptions"
  as permissive
  for all
  to public
using ((org_id = (auth.jwt() ->> 'org_id'::text)));



  create policy "org_isolation"
  on "public"."users"
  as permissive
  for all
  to public
using ((org_id = (auth.jwt() ->> 'org_id'::text)));



